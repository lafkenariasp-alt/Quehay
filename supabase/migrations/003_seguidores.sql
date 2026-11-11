-- =====================================================================
-- Qué Hay · Seguir a otros cocineros (si ambos se siguen, son amigos)
-- Pegar en Supabase > SQL Editor > New query > Run
-- =====================================================================
create table if not exists public.seguidores (
  seguidor_id uuid not null references public.perfiles(id) on delete cascade,
  seguido_id  uuid not null references public.perfiles(id) on delete cascade,
  creado_en   timestamptz not null default now(),
  primary key (seguidor_id, seguido_id),
  check (seguidor_id <> seguido_id)
);
create index if not exists on public.seguidores (seguido_id);

alter table public.seguidores enable row level security;
drop policy if exists "lectura publica" on public.seguidores;
create policy "lectura publica" on public.seguidores for select using (true);
drop policy if exists "seguir" on public.seguidores;
create policy "seguir" on public.seguidores for insert with check (auth.uid() = seguidor_id);
drop policy if exists "dejar de seguir" on public.seguidores;
create policy "dejar de seguir" on public.seguidores for delete using (auth.uid() = seguidor_id);

grant select on public.seguidores to anon, authenticated;
grant insert, delete on public.seguidores to authenticated;
