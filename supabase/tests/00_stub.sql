-- Minimal stand-in for the parts of Supabase that the migration depends on,
-- so the schema can be tested on a plain local Postgres 15+/16.
-- NOT used in production: Supabase provides all of this itself.

create role anon nologin;
create role authenticated nologin;

create schema auth;
create schema extensions;
grant usage on schema auth, extensions to anon, authenticated;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public to anon, authenticated;

-- Supabase grants broad default privileges to these roles; the migration then
-- tightens them. Mimic that so we test the tightened result.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
