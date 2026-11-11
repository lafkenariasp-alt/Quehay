-- Solo para pruebas locales: imita lo mínimo de Supabase (auth y roles)
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
