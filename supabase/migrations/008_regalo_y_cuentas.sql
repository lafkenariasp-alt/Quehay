-- 008 · Regalo del tutorial, límite de cuentas, eliminar cuenta y "Lo cociné" sin foto
-- Se puede ejecutar más de una vez sin error.

-- ---------- 1. El regalo de bienvenida se gana terminando el tutorial ----------
-- Crear la cuenta ya no entrega nada: solo crea el perfil.
create or replace function public.tg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nick text := lower(trim(coalesce(new.raw_user_meta_data->>'usuario', '')));
begin
  if nick !~ '^[a-z0-9_.]{3,24}$' or exists (select 1 from perfiles where usuario = nick) then
    nick := 'cocinero_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into perfiles (id, usuario, nombre)
  values (new.id, nick, coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), nick));
  return new;
end $$;

-- Al terminar el tutorial (o al crear la cuenta después de terminarlo como invitado):
-- insignia para Chefpu, 30 XP y título Fundador si quedan cupos de los primeros 1.000. Una sola vez por cuenta.
create or replace function public.reclamar_regalo_tutorial()
returns text language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid();
begin
  if yo is null then return 'sin_cuenta'; end if;
  if exists (select 1 from eventos_xp where usuario_id = yo and tipo = 'bienvenida') then return 'ya_reclamado'; end if;
  perform dar_xp(yo, 'bienvenida', 30, null);
  update perfiles set
    accesorios = case when 'delantal_bienvenida' = any(accesorios) then accesorios else array_append(accesorios, 'delantal_bienvenida') end,
    fundador = fundador or (select count(*) from perfiles where fundador) < 1000,
    tutorial_iniciado = true,
    tutorial_completado = true
  where id = yo;
  return 'ok';
end $$;
revoke all on function public.reclamar_regalo_tutorial() from public, anon;
grant execute on function public.reclamar_regalo_tutorial() to authenticated;

-- ---------- 2. Máximo 3 cuentas nuevas por día desde un mismo teléfono ----------
create index if not exists eventos_app_dispositivo on public.eventos_app (dispositivo, nombre, creado_en);
create or replace function public.puede_registrar(p_dispositivo text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_dispositivo, '') = ''
      or (select count(*) from eventos_app
           where dispositivo = p_dispositivo and nombre = 'registro' and creado_en > now() - interval '1 day') < 3;
$$;
grant execute on function public.puede_registrar(text) to anon, authenticated;

-- ---------- 3. Eliminar mi cuenta (lo exigen las tiendas) ----------
-- Borra el usuario; el perfil, sus recetas, nevera, notas y fotos registradas se borran en cascada.
create or replace function public.eliminar_mi_cuenta()
returns void language plpgsql security definer set search_path = public, auth as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Necesitas iniciar sesión'; end if;
  delete from auth.users where id = yo;
end $$;
revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;

-- ---------- 4. "Lo cociné" sin foto: comentario sin XP ----------
alter table public.asi_me_quedo alter column foto_url drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'asi_foto_o_comentario') then
    alter table public.asi_me_quedo add constraint asi_foto_o_comentario
      check (foto_url is not null or nullif(trim(nota), '') is not null);
  end if;
end $$;

-- Solo los platos con foto cuentan como cocinados: dan XP, suman a la receta y sirven para logros
create or replace function public.tg_asi_me_quedo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  autor uuid;
  primera boolean;
  personas int;
  hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if tg_op = 'INSERT' then
    if new.foto_url is null then return null; end if; -- comentario sin foto: no da XP ni logros
    update recetas set num_cocinadas = num_cocinadas + 1 where id = new.receta_id returning autor_id into autor;
    primera := not exists (select 1 from asi_me_quedo where receta_id = new.receta_id and usuario_id = new.usuario_id
                           and id <> new.id and foto_url is not null);
    if primera and autor <> new.usuario_id then
      perform dar_xp(new.usuario_id, 'cocinar', 20, new.id::text, 100);
      perform dar_xp(autor, 'recibir_asi_me_quedo', 30, new.id::text, 300);
    end if;
    select count(distinct usuario_id) into personas from asi_me_quedo
     where receta_id = new.receta_id and usuario_id <> autor and foto_url is not null;
    if personas >= 10 then perform otorgar_logro(autor, 'cocinada_10_veces'); end if;
    if (select count(*) from asi_me_quedo where usuario_id = new.usuario_id and sin_faltantes and foto_url is not null) >= 5 then
      perform otorgar_logro(new.usuario_id, 'maestro_nevera');
    end if;
    if new.aprovecho_vencimiento then perform otorgar_logro(new.usuario_id, 'cero_desperdicio'); end if;
    if (select count(distinct (creado_en at time zone 'America/Santiago')::date) from asi_me_quedo
         where usuario_id = new.usuario_id and foto_url is not null
           and (creado_en at time zone 'America/Santiago')::date between hoy - 6 and hoy) >= 7 then
      perform otorgar_logro(new.usuario_id, 'racha_7');
    end if;
  elsif tg_op = 'UPDATE' and old.respuesta_creador is null and new.respuesta_creador is not null then
    select autor_id into autor from recetas where id = new.receta_id;
    if not exists (select 1 from eventos_xp where usuario_id = autor and tipo = 'responder_asi_me_quedo' and ref = new.id::text) then
      perform dar_xp(autor, 'responder_asi_me_quedo', 10, new.id::text, 100);
    end if;
  end if;
  return null;
end $$;
