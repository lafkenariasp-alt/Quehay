-- 012 · Opiniones, ideas y errores que la gente deja desde Chefpu
-- Se puede ejecutar más de una vez sin error.

create table if not exists public.opiniones (
  id          bigserial primary key,
  creado_en   timestamptz not null default now(),
  usuario_id  uuid references public.perfiles(id) on delete set null, -- null = invitado
  dispositivo text,
  tipo        text not null default 'opinion' check (tipo in ('opinion', 'idea', 'error')),
  nota        smallint check (nota between 1 and 5),                  -- carita elegida (opcional)
  texto       text not null check (char_length(texto) between 3 and 2000),
  pantalla    text,                                                   -- dónde estaba al escribir
  plataforma  text,
  estado      text not null default 'nueva' check (estado in ('nueva', 'vista', 'resuelta'))
);

alter table public.opiniones enable row level security;

-- Cualquiera puede enviar (también invitados), pero solo a su nombre
drop policy if exists "enviar opinion" on public.opiniones;
create policy "enviar opinion" on public.opiniones for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = auth.uid());

-- Solo los admin las leen y cambian su estado
drop policy if exists "admin lee opiniones" on public.opiniones;
create policy "admin lee opiniones" on public.opiniones for select to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'));
drop policy if exists "admin marca opiniones" on public.opiniones;
create policy "admin marca opiniones" on public.opiniones for update to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'));

grant insert on public.opiniones to anon, authenticated;
grant select, update on public.opiniones to authenticated;
grant usage on sequence public.opiniones_id_seq to anon, authenticated;
