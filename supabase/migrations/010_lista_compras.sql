-- 010 · Lista de compras dentro de la Nevera
-- Se puede ejecutar más de una vez sin error.

create table if not exists public.compras (
  usuario_id     uuid not null references public.perfiles(id) on delete cascade,
  ingrediente_id int  not null references public.ingredientes(id),
  receta_id      bigint references public.recetas(id) on delete set null, -- de qué receta salió (opcional)
  agregado_en    timestamptz not null default now(),
  primary key (usuario_id, ingrediente_id)
);

alter table public.compras enable row level security;

drop policy if exists "mis compras" on public.compras;
create policy "mis compras" on public.compras for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

grant select, insert, update, delete on public.compras to authenticated;

-- Marcar como comprado: sale de la lista y entra a la nevera, en un solo paso
create or replace function public.comprado(p_ingrediente int)
returns void language plpgsql security invoker as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.compras where usuario_id = auth.uid() and ingrediente_id = p_ingrediente;
  insert into public.nevera (usuario_id, ingrediente_id) values (auth.uid(), p_ingrediente)
    on conflict (usuario_id, ingrediente_id) do nothing;
end $$;

grant execute on function public.comprado(int) to authenticated;
