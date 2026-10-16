-- Push subscription privacy tests (self-contained; rolls back).
\set ON_ERROR_STOP on
begin;

create schema test2;
grant usage on schema test2 to public;
create function test2.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function test2.as_admin() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
create function test2.eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL %: expected %, got %', label, expected, actual; end if;
  raise notice 'ok - %', label;
end $$;
create function test2.expect_error(sql text, expected text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || expected || '%' then raise notice 'ok - errors with %', expected; return; end if;
    raise exception 'wrong error for [%]: got "%", expected "%"', sql, sqlerrm, expected;
  end;
  raise exception 'expected error "%" but succeeded: %', expected, sql;
end $$;
grant execute on all functions in schema test2 to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@x.com', '{"display_name":"A"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@x.com', '{"display_name":"B"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@x.com', '{"display_name":"C"}');

select test2.as_user('00000000-0000-0000-0000-0000000000a1');
create temp table ctx (k text primary key, v text);
grant all on ctx to public;
insert into ctx values ('cid', public.create_couple('T')::text);
insert into ctx select 'code', invite_code from public.couples where id = (select v::uuid from ctx where k = 'cid');
select test2.as_user('00000000-0000-0000-0000-0000000000b2');
select public.join_couple((select v from ctx where k = 'code'));

-- B opts in to partner_checked_in and subscribes
update public.profiles set notification_prefs = notification_prefs || '{"partner_checked_in":true}'
  where id = '00000000-0000-0000-0000-0000000000b2';
select public.save_push_subscription('https://push.example/b-device-endpoint', 'p256dh-key-for-b-device', 'auth-secret-b-device', 'UA');

-- direct inserts are no longer allowed from the client
select test2.expect_error($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-0000000000b2','https://x.example/direct','k','a')$$, 'permission denied');

-- A (partner) can fetch B's subscription for opted-in kind
select test2.as_user('00000000-0000-0000-0000-0000000000a1');
select test2.eq((select count(*)::int from public.partner_push_targets('partner_checked_in')), 1, 'partner subscription returned when opted in');
select test2.eq((select count(*)::int from public.partner_push_targets('milestone_celebration')), 0, 'nothing returned when partner has not opted in to that kind');
select test2.eq((select count(*)::int from public.partner_push_targets('scripture')), 0, 'only allowed kinds can be requested');
-- but A cannot read B's table rows directly
select test2.eq((select count(*)::int from public.push_subscriptions), 0, 'cannot read partner rows from the table');

-- an outsider gets nothing
select test2.as_user('00000000-0000-0000-0000-0000000000c3');
select test2.eq((select count(*)::int from public.partner_push_targets('partner_checked_in')), 0, 'outsider gets no subscriptions');

-- unsubscribing only affects your own
select public.remove_push_subscription('https://push.example/b-device-endpoint');
select test2.as_admin();
select test2.eq((select count(*)::int from public.push_subscriptions), 1, 'outsider cannot delete someone else''s subscription');
select test2.as_user('00000000-0000-0000-0000-0000000000b2');
select public.remove_push_subscription('https://push.example/b-device-endpoint');
select test2.as_admin();
select test2.eq((select count(*)::int from public.push_subscriptions), 0, 'owner can unsubscribe');

do $$ begin raise notice 'PUSH TESTS PASSED'; end $$;
rollback;
