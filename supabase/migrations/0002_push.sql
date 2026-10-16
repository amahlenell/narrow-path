-- =====================================================================
-- Push notifications support
--
-- Clients can only see THEIR OWN push subscriptions (RLS). To notify a
-- partner when you check in, the server needs the partner's subscription
-- without a service-role key, so this exposes a narrow SECURITY DEFINER
-- function that returns only your partner's subscriptions, and only if the
-- partner has opted in to the relevant kind of notification.
-- =====================================================================

-- Save (or move) this browser's subscription to the caller. A subscription
-- endpoint is unique per browser, so if another account previously used the
-- same browser, it is re-assigned rather than duplicated.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(coalesce(p_endpoint, '')) not between 10 and 2000
     or char_length(coalesce(p_p256dh, '')) not between 10 and 300
     or char_length(coalesce(p_auth, '')) not between 10 and 100 then
    raise exception 'invalid_subscription';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh,
        auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

create or replace function public.remove_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = (select auth.uid())
$$;

-- Partner's subscriptions, only if they opted in to notification kind `p_kind`
-- (a key of profiles.notification_prefs, e.g. 'partner_checked_in').
create or replace function public.partner_push_targets(p_kind text)
returns table (endpoint text, p256dh text, auth text, partner_name text)
language sql stable security definer set search_path = '' as $$
  select s.endpoint, s.p256dh, s.auth, pr.display_name
  from public.couple_members me
  join public.couple_members other
    on other.couple_id = me.couple_id and other.user_id <> me.user_id
  join public.profiles pr on pr.id = other.user_id
  join public.push_subscriptions s on s.user_id = other.user_id
  where me.user_id = (select auth.uid())
    and p_kind in ('partner_checked_in','milestone_celebration')
    and coalesce((pr.notification_prefs ->> p_kind)::boolean, false)
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
revoke all on function public.partner_push_targets(text) from public, anon;
grant execute on function
  public.save_push_subscription(text, text, text, text),
  public.remove_push_subscription(text),
  public.partner_push_targets(text)
  to authenticated;

-- The browser no longer inserts directly; it goes through the function above.
revoke insert on public.push_subscriptions from authenticated;
