-- 007 · El tutorial se guarda en la cuenta (no en el teléfono)
-- Cada cuenta nueva hace el tutorial la primera vez que entra, en cualquier dispositivo.
-- Se puede ejecutar más de una vez sin error.

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'perfiles' and column_name = 'tutorial_iniciado') then
    alter table public.perfiles add column tutorial_iniciado   boolean not null default false;
    alter table public.perfiles add column tutorial_completado boolean not null default false;
    -- Las cuentas que ya existían no quedan obligadas: Chefpu solo les ofrece el tutorial
    update public.perfiles set tutorial_iniciado = true;
  end if;
end $$;

-- Estado del tutorial de quien está conectado
create or replace function public.mi_tutorial()
returns table (iniciado boolean, completado boolean)
language sql stable security definer set search_path = public as $$
  select p.tutorial_iniciado, p.tutorial_completado from public.perfiles p where p.id = auth.uid();
$$;

-- p_paso: 'iniciado' | 'completado'
create or replace function public.marcar_tutorial(p_paso text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if p_paso = 'iniciado' then
    update public.perfiles set tutorial_iniciado = true where id = auth.uid();
  elsif p_paso = 'completado' then
    update public.perfiles set tutorial_iniciado = true, tutorial_completado = true where id = auth.uid();
  end if;
end $$;

revoke all on function public.mi_tutorial() from public, anon;
revoke all on function public.marcar_tutorial(text) from public, anon;
grant execute on function public.mi_tutorial() to authenticated;
grant execute on function public.marcar_tutorial(text) to authenticated;
