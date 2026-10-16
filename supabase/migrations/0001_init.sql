-- =====================================================================
-- The Narrow Path — initial schema
--
-- Model: two users belong to exactly one couple. A couple walks a series
-- of "journeys" (a journey is one run of the shared path; a reset closes
-- it and opens the next). Check-ins, resets, milestone unlocks and
-- rewards all hang off the couple.
--
-- Security model:
--   * Row Level Security is enabled on every table.
--   * Clients can only READ their own couple's rows.
--   * Anything that changes shared progress (check-ins, resets, joining,
--     milestone unlocks, reward voting, PINs) goes through SECURITY DEFINER
--     functions that validate the caller and the rules server-side.
--   * No service-role key is needed by the app.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text not null default '' check (char_length(display_name) <= 40),
  avatar_path        text,                                  -- private storage path (future photo avatars)
  character_style    jsonb not null default '{}'::jsonb,    -- illustrated character options
  notification_prefs jsonb not null default
    '{"evening_reminder":false,"partner_checked_in":false,"upcoming_milestone":false,"milestone_celebration":false,"scripture":false,"reminder_hour":20}'::jsonb,
  created_at         timestamptz not null default now()
);

create table public.couples (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default 'Our Narrow Path' check (char_length(name) <= 60),
  invite_code       text not null unique
                      default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  invite_expires_at timestamptz not null default (now() + interval '7 days'),
  timezone          text not null default 'Pacific/Auckland',
  wedding_date      date,                                   -- null => no countdown shown
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id   uuid not null unique references auth.users (id) on delete cascade, -- one couple per person
  role      text not null default 'partner',
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.journeys (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  started_on date not null,
  ended_on   date,
  created_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);
-- at most one open journey per couple
create unique index one_open_journey_per_couple on public.journeys (couple_id) where ended_on is null;

create table public.check_ins (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  local_date date not null,                 -- the couple's local (Pacific/Auckland) calendar day
  is_late    boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, local_date)              -- no duplicate check-ins
);
create index check_ins_couple_date on public.check_ins (couple_id, local_date);

create table public.resets (
  id                     uuid primary key default gen_random_uuid(),
  couple_id              uuid not null references public.couples (id) on delete cascade,
  journey_id             uuid not null references public.journeys (id) on delete cascade, -- the journey that ended
  initiated_by           uuid not null references auth.users (id),
  local_date             date not null,
  days_walked            int  not null,
  challenge              text check (challenge in
                           ('pray_together','discuss_boundaries','write_letter','plan_date','read_passage')),
  challenge_completed_at timestamptz,
  created_at             timestamptz not null default now()
);

-- The reflection is visible ONLY to the person who wrote it.
create table public.reset_reflections (
  reset_id   uuid primary key references public.resets (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.milestones (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references public.couples (id) on delete cascade,
  days                int  not null check (days between 1 and 3650),
  title               text check (char_length(title) <= 80),   -- null for built-ins (copy lives in app content)
  note                text check (char_length(note) <= 400),   -- custom encouragement
  is_custom           boolean not null default false,
  chosen_suggestion_id uuid,                                    -- set by vote_reward()
  created_at          timestamptz not null default now(),
  unique (couple_id, days),
  check (not is_custom or title is not null)
);

create table public.reward_suggestions (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  suggested_by uuid not null references auth.users (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 200),
  created_at   timestamptz not null default now()
);

alter table public.milestones
  add constraint milestones_chosen_suggestion_fk
  foreign key (chosen_suggestion_id) references public.reward_suggestions (id) on delete set null;

create table public.reward_votes (
  suggestion_id uuid not null references public.reward_suggestions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

-- Earned badges. Deliberately NOT deleted on reset: growth is never erased.
create table public.milestone_unlocks (
  couple_id    uuid not null references public.couples (id) on delete cascade,
  journey_id   uuid not null references public.journeys (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  unlocked_on  date not null,
  primary key (journey_id, milestone_id)
);

create table public.prayer_intentions (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Optional app-lock PIN. Stored as a bcrypt hash, never readable by clients.
create table public.app_locks (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  pin_hash        text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

-- Web push (phase 2 — table is ready, nothing writes to it yet).
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helper functions (used by RLS policies and RPCs)
-- ---------------------------------------------------------------------

create or replace function public.is_couple_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = cid and user_id = (select auth.uid())
  )
$$;

create or replace function public.shares_couple_with(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.couple_members a
    join public.couple_members b on a.couple_id = b.couple_id
    where a.user_id = (select auth.uid()) and b.user_id = uid
  )
$$;

-- Today's date on the couple's own calendar (Pacific/Auckland by default).
create or replace function public.couple_today(cid uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone c.timezone)::date from public.couples c where c.id = cid
$$;

-- A day counts as walked only when EVERY member has checked in for it.
create or replace function public.journey_days_walked(jid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from (
    select ci.local_date
    from public.check_ins ci
    where ci.journey_id = jid
    group by ci.local_date
    having count(distinct ci.user_id) >= (
      select count(*) from public.couple_members m
      join public.journeys j on j.couple_id = m.couple_id
      where j.id = jid
    )
  ) s
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(coalesce(new.email, ''), '@', 1)), 40)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hard cap: a couple is exactly two people.
create or replace function public.enforce_two_members() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.couple_members where couple_id = new.couple_id) >= 2 then
    raise exception 'couple_full';
  end if;
  return new;
end $$;

create trigger couple_members_cap
  before insert on public.couple_members
  for each row execute function public.enforce_two_members();

-- ---------------------------------------------------------------------
-- RPCs — the only way shared progress changes
-- ---------------------------------------------------------------------

create or replace function public.create_couple(p_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  cid uuid;
  d   int;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = uid) then
    raise exception 'already_in_couple';
  end if;

  insert into public.couples (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Our Narrow Path'), uid)
  returning id into cid;

  insert into public.couple_members (couple_id, user_id, role) values (cid, uid, 'founder');
  insert into public.journeys (couple_id, started_on) values (cid, public.couple_today(cid));

  foreach d in array array[3, 7, 14, 21, 30, 50, 75, 100, 180, 365] loop
    insert into public.milestones (couple_id, days) values (cid, d);
  end loop;

  return cid;
end $$;

create or replace function public.join_couple(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  c   public.couples;
  n   int;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = uid) then
    raise exception 'already_in_couple';
  end if;

  select * into c from public.couples
  where invite_code = upper(trim(p_code)) and invite_expires_at > now()
  for update;
  if not found then raise exception 'invalid_invite'; end if;

  select count(*) into n from public.couple_members where couple_id = c.id;
  if n >= 2 then raise exception 'invalid_invite'; end if;

  insert into public.couple_members (couple_id, user_id, role) values (c.id, uid, 'partner');

  -- The shared path begins the day the second person joins.
  update public.journeys j
     set started_on = public.couple_today(c.id)
   where j.couple_id = c.id and j.ended_on is null
     and not exists (select 1 from public.check_ins ci where ci.journey_id = j.id);

  -- The invite is single-use.
  update public.couples set invite_expires_at = now() where id = c.id;
  return c.id;
end $$;

-- Confirm "I honoured our commitment" for today (or, within a one-day grace
-- window, for yesterday). Idempotent: repeating it changes nothing.
create or replace function public.check_in(p_date date default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid      uuid := (select auth.uid());
  cid      uuid;
  members  int;
  today    date;
  d        date;
  j        public.journeys;
  walked   int;
  already  boolean := false;
  unlocked int[] := '{}';
  r        record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select couple_id into cid from public.couple_members where user_id = uid;
  if cid is null then raise exception 'no_couple'; end if;

  select count(*) into members from public.couple_members where couple_id = cid;
  if members < 2 then raise exception 'partner_not_joined'; end if;

  today := public.couple_today(cid);
  d := coalesce(p_date, today);
  if d > today     then raise exception 'date_in_future'; end if;
  if d < today - 1 then raise exception 'date_too_old'; end if;

  -- Lock the journey row so two simultaneous check-ins are processed in order.
  select * into j from public.journeys where couple_id = cid and ended_on is null for update;
  if not found then raise exception 'no_open_journey'; end if;
  if d < j.started_on then raise exception 'before_journey_start'; end if;

  insert into public.check_ins (couple_id, journey_id, user_id, local_date, is_late)
  values (cid, j.id, uid, d, d < today)
  on conflict (user_id, local_date) do nothing;
  if not found then already := true; end if;

  walked := public.journey_days_walked(j.id);

  -- Unlock any milestone the shared streak has now reached.
  for r in select id, days from public.milestones where couple_id = cid and days <= walked order by days loop
    insert into public.milestone_unlocks (couple_id, journey_id, milestone_id, unlocked_on)
    values (cid, j.id, r.id, today)
    on conflict do nothing;
    if found then unlocked := array_append(unlocked, r.days); end if;
  end loop;

  return jsonb_build_object(
    'date', d,
    'already_checked_in', already,
    'days_walked', walked,
    'newly_unlocked', to_jsonb(unlocked)
  );
end $$;

-- Either partner can report a reset. Requires explicit confirmation.
-- The shared journey closes today; a new one begins TOMORROW, so today is
-- never both "a slip" and "a day honoured".
create or replace function public.report_reset(
  p_confirm    boolean,
  p_challenge  text default null,
  p_reflection text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid    uuid := (select auth.uid());
  cid    uuid;
  today  date;
  j      public.journeys;
  walked int;
  rid    uuid;
begin
  if p_confirm is not true then raise exception 'confirmation_required'; end if;
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select couple_id into cid from public.couple_members where user_id = uid;
  if cid is null then raise exception 'no_couple'; end if;

  today := public.couple_today(cid);
  select * into j from public.journeys where couple_id = cid and ended_on is null for update;
  if not found then raise exception 'no_open_journey'; end if;
  if j.started_on > today then raise exception 'journey_not_started'; end if;

  walked := public.journey_days_walked(j.id);

  update public.journeys set ended_on = today where id = j.id;
  insert into public.journeys (couple_id, started_on) values (cid, today + 1);

  insert into public.resets (couple_id, journey_id, initiated_by, local_date, days_walked, challenge)
  values (cid, j.id, uid, today, walked, nullif(p_challenge, ''))
  returning id into rid;

  if p_reflection is not null and trim(p_reflection) <> '' then
    insert into public.reset_reflections (reset_id, user_id, body)
    values (rid, uid, left(trim(p_reflection), 4000));
  end if;

  return rid;
end $$;

create or replace function public.complete_reset_challenge(p_reset_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.resets r
     set challenge_completed_at = now()
   where r.id = p_reset_id
     and r.challenge_completed_at is null
     and exists (select 1 from public.couple_members m where m.couple_id = r.couple_id and m.user_id = uid);
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.suggest_reward(p_milestone_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  m   public.milestones;
  sid uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into m from public.milestones where id = p_milestone_id;
  if not found or not exists (
    select 1 from public.couple_members where couple_id = m.couple_id and user_id = uid
  ) then raise exception 'not_found'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 200 then
    raise exception 'invalid_reward';
  end if;
  insert into public.reward_suggestions (couple_id, milestone_id, suggested_by, body)
  values (m.couple_id, m.id, uid, trim(p_body))
  returning id into sid;
  return sid;
end $$;

-- Each person backs one reward per milestone. When both back the same one,
-- it becomes the chosen reward. Nothing is ever purchased automatically.
create or replace function public.vote_reward(p_suggestion_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid     uuid := (select auth.uid());
  s       public.reward_suggestions;
  members int;
  chosen  uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into s from public.reward_suggestions where id = p_suggestion_id;
  if not found or not exists (
    select 1 from public.couple_members where couple_id = s.couple_id and user_id = uid
  ) then raise exception 'not_found'; end if;

  delete from public.reward_votes v
   using public.reward_suggestions o
   where v.user_id = uid and v.suggestion_id = o.id and o.milestone_id = s.milestone_id;
  insert into public.reward_votes (suggestion_id, user_id) values (s.id, uid);

  select count(*) into members from public.couple_members where couple_id = s.couple_id;

  select v.suggestion_id into chosen
    from public.reward_votes v
    join public.reward_suggestions o on o.id = v.suggestion_id
   where o.milestone_id = s.milestone_id
   group by v.suggestion_id
  having count(*) >= members
   limit 1;

  update public.milestones set chosen_suggestion_id = chosen where id = s.milestone_id;
  return jsonb_build_object('chosen_suggestion_id', chosen);
end $$;

-- ---- optional PIN lock (convenience lock layered on top of real auth) ----

create or replace function public.set_pin(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_pin !~ '^([0-9]{4}|[0-9]{6})$' then raise exception 'invalid_pin_format'; end if;
  insert into public.app_locks (user_id, pin_hash)
  values (uid, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();
end $$;

create or replace function public.has_pin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_locks where user_id = (select auth.uid()))
$$;

create or replace function public.clear_pin() returns void
language sql security definer set search_path = '' as $$
  delete from public.app_locks where user_id = (select auth.uid())
$$;

-- 5 wrong attempts lock the PIN for 15 minutes.
create or replace function public.verify_pin(p_pin text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  l   public.app_locks;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into l from public.app_locks where user_id = uid for update;
  if not found then return true; end if;                       -- no PIN set
  if l.locked_until is not null and l.locked_until > now() then raise exception 'pin_locked'; end if;

  if l.pin_hash = extensions.crypt(p_pin, l.pin_hash) then
    update public.app_locks set failed_attempts = 0, locked_until = null where user_id = uid;
    return true;
  end if;

  update public.app_locks
     set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
         locked_until    = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
   where user_id = uid;
  return false;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.couples            enable row level security;
alter table public.couple_members     enable row level security;
alter table public.journeys           enable row level security;
alter table public.check_ins          enable row level security;
alter table public.resets             enable row level security;
alter table public.reset_reflections  enable row level security;
alter table public.milestones         enable row level security;
alter table public.reward_suggestions enable row level security;
alter table public.reward_votes       enable row level security;
alter table public.milestone_unlocks  enable row level security;
alter table public.prayer_intentions  enable row level security;
alter table public.app_locks          enable row level security;   -- no policies: RPC access only
alter table public.push_subscriptions enable row level security;

-- profiles: you and your partner
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_couple_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- couples: members read; members may edit name / wedding date only (column grants below)
create policy couples_select on public.couples for select to authenticated
  using (public.is_couple_member(id));
create policy couples_update on public.couples for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));

-- read-only for members; all writes happen in RPCs
create policy couple_members_select on public.couple_members for select to authenticated
  using (public.is_couple_member(couple_id));
create policy journeys_select on public.journeys for select to authenticated
  using (public.is_couple_member(couple_id));
create policy check_ins_select on public.check_ins for select to authenticated
  using (public.is_couple_member(couple_id));
create policy resets_select on public.resets for select to authenticated
  using (public.is_couple_member(couple_id));
create policy milestone_unlocks_select on public.milestone_unlocks for select to authenticated
  using (public.is_couple_member(couple_id));
create policy reward_suggestions_select on public.reward_suggestions for select to authenticated
  using (public.is_couple_member(couple_id));
create policy reward_votes_select on public.reward_votes for select to authenticated
  using (exists (select 1 from public.reward_suggestions s
                 where s.id = suggestion_id and public.is_couple_member(s.couple_id)));

-- reflections: author only (not even your partner)
create policy reset_reflections_select on public.reset_reflections for select to authenticated
  using (user_id = (select auth.uid()));

-- milestones: built-ins are read-only; custom ones are editable by either partner
create policy milestones_select on public.milestones for select to authenticated
  using (public.is_couple_member(couple_id));
create policy milestones_insert on public.milestones for insert to authenticated
  with check (is_custom and public.is_couple_member(couple_id));
create policy milestones_update on public.milestones for update to authenticated
  using (is_custom and public.is_couple_member(couple_id))
  with check (is_custom and public.is_couple_member(couple_id));
create policy milestones_delete on public.milestones for delete to authenticated
  using (is_custom and public.is_couple_member(couple_id));

-- reward suggestions: delete your own
create policy reward_suggestions_delete on public.reward_suggestions for delete to authenticated
  using (suggested_by = (select auth.uid()));

-- prayer intentions
create policy prayer_select on public.prayer_intentions for select to authenticated
  using (public.is_couple_member(couple_id));
create policy prayer_insert on public.prayer_intentions for insert to authenticated
  with check (public.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy prayer_update on public.prayer_intentions for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy prayer_delete on public.prayer_intentions for delete to authenticated
  using (author_id = (select auth.uid()));

-- push subscriptions: yours only
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------

revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from public, anon;

-- start from nothing for signed-in users, then grant exactly what is needed
revoke all on all tables in schema public from authenticated;
grant select on public.profiles, public.couples, public.couple_members, public.journeys,
                public.check_ins, public.resets, public.reset_reflections, public.milestones,
                public.reward_suggestions, public.reward_votes, public.milestone_unlocks,
                public.prayer_intentions, public.push_subscriptions
  to authenticated;

grant update (display_name, avatar_path, character_style, notification_prefs) on public.profiles to authenticated;
grant update (name, wedding_date)                                           on public.couples  to authenticated;
grant insert (couple_id, days, title, note, is_custom)                      on public.milestones to authenticated;
grant update (title, note)                                                  on public.milestones to authenticated;
grant delete                                                                on public.milestones to authenticated;
grant delete                                                                on public.reward_suggestions to authenticated;
grant insert (couple_id, author_id, body)                                   on public.prayer_intentions to authenticated;
grant update (answered_at)                                                  on public.prayer_intentions to authenticated;
grant delete                                                                on public.prayer_intentions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, user_agent), delete          on public.push_subscriptions to authenticated;

-- RPCs and the helpers RLS policies call
grant execute on function
  public.is_couple_member(uuid), public.shares_couple_with(uuid),
  public.create_couple(text), public.join_couple(text),
  public.check_in(date), public.report_reset(boolean, text, text),
  public.complete_reset_challenge(uuid),
  public.suggest_reward(uuid, text), public.vote_reward(uuid),
  public.set_pin(text), public.has_pin(), public.clear_pin(), public.verify_pin(text)
  to authenticated;

-- ---------------------------------------------------------------------
-- Realtime: so both partners see check-ins and resets straight away
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.check_ins, public.journeys, public.resets, public.milestone_unlocks,
      public.milestones, public.reward_suggestions, public.reward_votes,
      public.prayer_intentions, public.couple_members, public.couples;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Private avatar storage (photo upload UI ships in a later phase)
-- Path convention: <couple_id>/<user_id>/<filename>
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
    on conflict (id) do nothing;

    execute $p$
      create policy avatars_read on storage.objects for select to authenticated
      using (bucket_id = 'avatars'
             and public.is_couple_member(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy avatars_write on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars'
                  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
                  and (storage.foldername(name))[2] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy avatars_update on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[2] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy avatars_delete on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[2] = (select auth.uid())::text)
    $p$;
  end if;
end $$;
