-- Behavioural tests for the schema, RLS and RPCs. Runs inside one transaction
-- and rolls back. Any failed assertion raises and aborts (ON_ERROR_STOP).

\set ON_ERROR_STOP on
begin;

create schema test;
grant usage on schema test to public;

create function test.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, false);
  execute 'set role authenticated';
end $$;

create function test.as_admin() returns void language plpgsql as $$
begin execute 'reset role'; end $$;

create function test.expect_error(sql text, expected text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm like '%' || expected || '%' then return; end if;
    raise exception 'wrong error for [%]: got "%", expected "%"', sql, sqlerrm, expected;
  end;
  raise exception 'expected error "%" but statement succeeded: %', expected, sql;
end $$;

create function test.eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok - %', label;
end $$;

grant execute on all functions in schema test to public;

-- cast of fixed ids so tests can refer to people
create table test.ids (name text primary key, id uuid not null);
grant select on test.ids to public;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a111', 'amy@example.com',   '{"display_name":"Amy"}'),
  ('00000000-0000-0000-0000-00000000b222', 'aaron@example.com', '{"display_name":"Aaron"}'),
  ('00000000-0000-0000-0000-00000000c333', 'eve@example.com',   '{"display_name":"Eve"}'),
  ('00000000-0000-0000-0000-00000000d444', 'sam@example.com',   '{}');
insert into test.ids values
  ('amy',   '00000000-0000-0000-0000-00000000a111'),
  ('aaron', '00000000-0000-0000-0000-00000000b222'),
  ('eve',   '00000000-0000-0000-0000-00000000c333'),
  ('sam',   '00000000-0000-0000-0000-00000000d444');

-- profile trigger
select test.eq((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000a111'), 'Amy', 'profile created from sign-up metadata');
select test.eq((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000d444'), 'sam', 'profile falls back to email prefix');

-- ---------------------------------------------------------------- couple setup
select test.as_user('00000000-0000-0000-0000-00000000a111');
create temp table ctx (k text primary key, v text);
grant all on ctx to public;
insert into ctx select 'cid', public.create_couple('Amy & Aaron')::text;
insert into ctx select 'code', invite_code from public.couples;
select test.expect_error($$select public.create_couple('again')$$, 'already_in_couple');
select test.expect_error($$select public.check_in()$$, 'partner_not_joined');

select test.as_user('00000000-0000-0000-0000-00000000c333');
select test.expect_error($$select public.join_couple('NOTACODE')$$, 'invalid_invite');
select test.as_user('00000000-0000-0000-0000-00000000b222');
select test.eq(public.join_couple((select v from ctx where k='code'))::text, (select v from ctx where k='cid'), 'partner joins with invite code');
select test.eq((select count(*)::int from public.couple_members), 2, 'couple has exactly two members');

select test.as_user('00000000-0000-0000-0000-00000000d444');
select test.expect_error(format($$select public.join_couple(%L)$$, (select v from ctx where k='code')), 'invalid_invite');   -- spent invite

select test.as_admin();
select test.expect_error(format($$insert into public.couple_members (couple_id, user_id) values (%L, '00000000-0000-0000-0000-00000000d444')$$, (select v from ctx where k='cid')), 'couple_full');

-- ---------------------------------------------------------------- RLS isolation
select test.as_user('00000000-0000-0000-0000-00000000c333');
select public.create_couple('Eve alone');
select test.eq((select count(*)::int from public.couples), 1, 'outsider only sees their own couple');
select test.eq((select count(*)::int from public.profiles), 1, 'outsider cannot read other profiles');
select test.eq((select count(*)::int from public.milestones where couple_id = (select v::uuid from ctx where k='cid')), 0, 'outsider cannot read our milestones');
update public.couples set wedding_date = '2030-01-01' where id = (select v::uuid from ctx where k='cid');
select test.as_admin();
select test.eq((select wedding_date from public.couples where id = (select v::uuid from ctx where k='cid')), null::date, 'outsider cannot edit our couple row');

-- ---------------------------------------------------------------- column privileges
select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.expect_error($$update public.couples set invite_code = 'HACKED' $$, 'permission denied');
select test.expect_error($$update public.couples set timezone = 'UTC' $$, 'permission denied');
update public.couples set wedding_date = '2027-06-12';
select test.eq((select wedding_date from public.couples), '2027-06-12'::date, 'member can set wedding date');
update public.couples set wedding_date = null;
select test.expect_error($$insert into public.check_ins (couple_id, journey_id, user_id, local_date) select couple_id, id, '00000000-0000-0000-0000-00000000a111', current_date from public.journeys$$, 'permission denied');
select test.expect_error($$select * from public.app_locks$$, 'permission denied');
select test.expect_error($$update public.milestones set days = 4$$, 'permission denied');

-- ---------------------------------------------------------------- check-ins
select test.as_admin();
select test.eq((select started_on from public.journeys where couple_id = (select v::uuid from ctx where k='cid')), (now() at time zone 'Pacific/Auckland')::date, 'journey starts today (Auckland)');

select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.eq((public.check_in() ->> 'days_walked')::int, 0, 'one partner checking in does not complete the day');
select test.eq((public.check_in() ->> 'already_checked_in')::boolean, true, 'duplicate check-in is a no-op');
select test.eq((select count(*)::int from public.check_ins), 1, 'still exactly one check-in row');
select test.expect_error($$select public.check_in(current_date + 2)$$, 'date_in_future');
select test.expect_error($$select public.check_in(current_date - 3)$$, 'date_too_old');
select test.expect_error($$select public.check_in((now() at time zone 'Pacific/Auckland')::date - 1)$$, 'before_journey_start');

select test.as_user('00000000-0000-0000-0000-00000000b222');
select test.eq((public.check_in() ->> 'days_walked')::int, 1, 'day completes when both have checked in');

-- Simulate two earlier completed days by back-dating the journey (admin only).
select test.as_admin();
do $$
declare cid uuid := (select v::uuid from ctx where k = 'cid'); jid uuid; t date := (now() at time zone 'Pacific/Auckland')::date;
begin
  select id into jid from public.journeys where couple_id = cid and ended_on is null;
  update public.journeys set started_on = t - 5 where id = jid;
  insert into public.check_ins (couple_id, journey_id, user_id, local_date) values
    (cid, jid, '00000000-0000-0000-0000-00000000a111', t - 2), (cid, jid, '00000000-0000-0000-0000-00000000b222', t - 2),
    (cid, jid, '00000000-0000-0000-0000-00000000a111', t - 1);       -- yesterday: only Amy (a "partial" day)
end $$;

select test.as_user('00000000-0000-0000-0000-00000000b222');
-- Aaron confirms yesterday late (within the one-day grace window) -> 3 completed days -> day-3 milestone unlocks
select test.eq((public.check_in((now() at time zone 'Pacific/Auckland')::date - 1) -> 'newly_unlocked')::text, '[3]', 'late check-in completes the day and unlocks the 3-day milestone');
select test.eq((select is_late from public.check_ins where user_id = '00000000-0000-0000-0000-00000000b222' and local_date = (now() at time zone 'Pacific/Auckland')::date - 1), true, 'late check-ins are flagged');
select test.eq((select count(*)::int from public.milestone_unlocks), 1, 'one badge earned');

-- ---------------------------------------------------------------- rewards
select test.as_user('00000000-0000-0000-0000-00000000a111');
create temp table rw (k text primary key, v uuid);
grant all on rw to public;
insert into rw select 'ms3', id from public.milestones where days = 3;
insert into rw select 'coffee', public.suggest_reward((select v from rw where k='ms3'), 'Coffee date');
insert into rw select 'walk',   public.suggest_reward((select v from rw where k='ms3'), 'Sunrise walk');
select public.vote_reward((select v from rw where k='coffee'));
select test.eq((select chosen_suggestion_id from public.milestones where days = 3), null::uuid, 'one vote does not choose a reward');
select test.as_user('00000000-0000-0000-0000-00000000b222');
select public.vote_reward((select v from rw where k='walk'));
select test.eq((select chosen_suggestion_id from public.milestones where days = 3), null::uuid, 'different votes do not choose a reward');
select public.vote_reward((select v from rw where k='coffee'));
select test.eq((select chosen_suggestion_id from public.milestones where days = 3), (select v from rw where k='coffee'), 'both backing the same idea chooses it');
select test.as_user('00000000-0000-0000-0000-00000000c333');
select test.expect_error(format($$select public.vote_reward(%L)$$, (select v from rw where k='coffee')), 'not_found');
select test.expect_error(format($$select public.suggest_reward(%L, 'x')$$, (select v from rw where k='ms3')), 'not_found');

-- ---------------------------------------------------------------- reset
select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.expect_error($$select public.report_reset(false)$$, 'confirmation_required');
select test.expect_error($$select public.report_reset(true, 'public_flogging')$$, 'violates check constraint');
create temp table rs (k text primary key, v uuid);
grant all on rs to public;
insert into rs select 'id', public.report_reset(true, 'pray_together', 'We both felt the weight of this.');

select test.as_admin();
select test.eq((select count(*)::int from public.journeys where couple_id = (select v::uuid from ctx where k='cid') and ended_on is null), 1, 'exactly one open journey after reset');
select test.eq((select started_on from public.journeys where couple_id = (select v::uuid from ctx where k='cid') and ended_on is null), (now() at time zone 'Pacific/Auckland')::date + 1, 'new journey begins tomorrow');
select test.eq((select days_walked from public.resets), 3, 'reset records the days that had been walked');

select test.as_user('00000000-0000-0000-0000-00000000b222');
select test.eq((select count(*)::int from public.resets), 1, 'partner sees the reset');
select test.eq((select count(*)::int from public.reset_reflections), 0, 'partner can NOT read the private reflection');
select test.eq((select count(*)::int from public.milestone_unlocks), 1, 'earned badges survive a reset');
select test.expect_error($$select public.check_in()$$, 'before_journey_start');
select test.expect_error($$select public.report_reset(true)$$, 'journey_not_started');
select public.complete_reset_challenge((select v from rs where k='id'));
select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.eq((select count(*)::int from public.reset_reflections), 1, 'author can read their own reflection');
select test.eq((select challenge_completed_at is not null from public.resets), true, 'challenge marked complete');
select test.as_user('00000000-0000-0000-0000-00000000c333');
select test.expect_error(format($$select public.complete_reset_challenge(%L)$$, (select v from rs where k='id')), 'not_found');

-- ---------------------------------------------------------------- prayer intentions
select test.as_user('00000000-0000-0000-0000-00000000a111');
insert into public.prayer_intentions (couple_id, author_id, body) values ((select v::uuid from ctx where k='cid'), '00000000-0000-0000-0000-00000000a111', 'Strength for this week');
select test.expect_error(format($$insert into public.prayer_intentions (couple_id, author_id, body) values (%L, '00000000-0000-0000-0000-00000000b222', 'forged')$$, (select v from ctx where k='cid')), 'row-level security');
select test.as_user('00000000-0000-0000-0000-00000000b222');
select test.eq((select count(*)::int from public.prayer_intentions), 1, 'partner sees shared prayer intention');
update public.prayer_intentions set answered_at = now();
select test.eq((select count(*)::int from public.prayer_intentions where answered_at is not null), 1, 'either partner can mark a prayer answered');
select test.as_user('00000000-0000-0000-0000-00000000c333');
select test.eq((select count(*)::int from public.prayer_intentions), 0, 'outsider cannot see prayer intentions');

-- ---------------------------------------------------------------- PIN
select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.expect_error($$select public.set_pin('12')$$, 'invalid_pin_format');
select test.expect_error($$select public.set_pin('abcd')$$, 'invalid_pin_format');
select public.set_pin('4821');
select test.eq(public.has_pin(), true, 'PIN saved');
select test.eq(public.verify_pin('4821'), true, 'correct PIN verifies');
select test.eq(public.verify_pin('0000'), false, 'wrong PIN rejected');
select public.verify_pin('0001'); select public.verify_pin('0002'); select public.verify_pin('0003'); select public.verify_pin('0004');
select test.expect_error($$select public.verify_pin('4821')$$, 'pin_locked');
select test.as_admin();
select test.eq((select pin_hash <> '4821' and pin_hash like '$2%' from public.app_locks), true, 'PIN is stored as a bcrypt hash, not plaintext');
update public.app_locks set locked_until = now() - interval '1 minute';
select test.as_user('00000000-0000-0000-0000-00000000a111');
select test.eq(public.verify_pin('4821'), true, 'PIN works again after lockout expires');
select public.clear_pin();
select test.eq(public.has_pin(), false, 'PIN cleared');

-- ---------------------------------------------------------------- anon gets nothing
select test.as_admin();
set role anon;
select test.expect_error($$select * from public.couples$$, 'permission denied');
select test.expect_error($$select public.check_in()$$, 'permission denied');
reset role;

rollback;
\echo ALL DATABASE TESTS PASSED
