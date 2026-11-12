-- 009 · El límite de 3 cuentas por día no aplica a los teléfonos del equipo
-- Un teléfono queda libre del límite si alguna vez entró con una cuenta admin u oficial (o la cuenta quehay).
-- Se puede ejecutar más de una vez sin error.
create or replace function public.puede_registrar(p_dispositivo text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_dispositivo, '') = ''
      or exists (
           select 1 from eventos_app e join perfiles p on p.id = e.usuario_id
            where e.dispositivo = p_dispositivo and (p.rol in ('admin', 'oficial') or p.usuario = 'quehay'))
      or (select count(*) from eventos_app
           where dispositivo = p_dispositivo and nombre = 'registro' and creado_en > now() - interval '1 day') < 3;
$$;
grant execute on function public.puede_registrar(text) to anon, authenticated;
