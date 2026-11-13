-- 013 · Panel de administración (entrega 1)
-- Funciones que usa el panel web /Quehay/panel. Todas comprueban primero que quien llama es admin.
-- La llave maestra nunca sale de Supabase: el panel solo llama a estas funciones.
-- Se puede ejecutar más de una vez sin error.

create extension if not exists pgcrypto with schema extensions;

-- ---------- ¿Quien llama es admin? ----------
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;
grant execute on function public.es_admin() to authenticated;

create or replace function public.exigir_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'No tienes acceso' using errcode = '42501';
  end if;
end $$;
revoke all on function public.exigir_admin() from public, anon;

-- ---------- Registro de acciones del panel (qué, a quién, cuándo) ----------
create table if not exists public.admin_registro (
  id          bigserial primary key,
  creado_en   timestamptz not null default now(),
  admin_id    uuid references public.perfiles(id) on delete set null,
  accion      text not null,
  objetivo_id uuid,
  detalle     jsonb not null default '{}'
);
alter table public.admin_registro enable row level security;
drop policy if exists "admin lee registro" on public.admin_registro;
create policy "admin lee registro" on public.admin_registro for select to authenticated using (public.es_admin());
grant select on public.admin_registro to authenticated;

create or replace function public.anotar_accion(p_accion text, p_objetivo uuid, p_detalle jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.admin_registro (admin_id, accion, objetivo_id, detalle) values (auth.uid(), p_accion, p_objetivo, p_detalle);
$$;
revoke all on function public.anotar_accion(text, uuid, jsonb) from public, anon, authenticated;

-- ---------- Notas privadas del admin sobre cada tester ----------
create table if not exists public.admin_notas (
  id          bigserial primary key,
  creado_en   timestamptz not null default now(),
  usuario_id  uuid not null references public.perfiles(id) on delete cascade,
  admin_id    uuid references public.perfiles(id) on delete set null,
  texto       text not null check (char_length(texto) between 1 and 2000)
);
create index if not exists admin_notas_usuario on public.admin_notas (usuario_id);
alter table public.admin_notas enable row level security;
drop policy if exists "admin notas" on public.admin_notas;
create policy "admin notas" on public.admin_notas for all to authenticated using (public.es_admin()) with check (public.es_admin());
grant select, insert, delete on public.admin_notas to authenticated;
grant usage on sequence public.admin_notas_id_seq to authenticated;

-- ---------- Inicio: lo que pasó hoy ----------
create or replace function public.panel_inicio()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.exigir_admin();
  select jsonb_build_object(
    'activos_hoy',     (select count(distinct coalesce(usuario_id::text, dispositivo)) from eventos_app where creado_en > now() - interval '1 day'),
    'activos_semana',  (select count(distinct coalesce(usuario_id::text, dispositivo)) from eventos_app where creado_en > now() - interval '7 days'),
    'cuentas',         (select count(*) from perfiles),
    'cuentas_semana',  (select count(*) from perfiles where creado_en > now() - interval '7 days'),
    'opiniones_nuevas',(select count(*) from opiniones where estado = 'nueva'),
    'errores_semana',  (select count(*) from eventos_app where nombre = 'error_app' and creado_en > now() - interval '7 days'),
    'recetas',         (select count(*) from recetas),
    'sin_foto',        (select count(*) from recetas where foto_url is null),
    'ultima_actividad',(select max(creado_en) from eventos_app),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'personas', n) order by d), '[]')
                from (select date_trunc('day', g) d,
                             (select count(distinct coalesce(usuario_id::text, dispositivo)) from eventos_app e
                               where e.creado_en >= date_trunc('day', g) and e.creado_en < date_trunc('day', g) + interval '1 day') n
                        from generate_series(now() - interval '13 days', now(), interval '1 day') g) x)
  ) into r;
  return r;
end $$;
grant execute on function public.panel_inicio() to authenticated;

-- ---------- Lista de testers ----------
drop function if exists public.panel_testers(text);
create or replace function public.panel_testers(p_buscar text default null)
returns table (
  id uuid, usuario text, nombre text, avatar_url text, rol text, xp int, nivel int,
  creado_en timestamptz, ultimo_acceso timestamptz, acciones_semana bigint,
  recetas bigint, en_nevera bigint, tutorial_completado boolean, notas bigint, cuenta_correo boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select p.id, p.usuario, p.nombre, p.avatar_url, p.rol, p.xp, public.nivel_de(p.xp), p.creado_en,
         greatest(u.last_sign_in_at, (select max(e.creado_en) from eventos_app e where e.usuario_id = p.id)),
         (select count(*) from eventos_app e where e.usuario_id = p.id and e.creado_en > now() - interval '7 days'),
         (select count(*) from recetas r where r.autor_id = p.id),
         (select count(*) from nevera n where n.usuario_id = p.id),
         p.tutorial_completado,
         (select count(*) from admin_notas a where a.usuario_id = p.id),
         coalesce(u.email not like '%@usuarios.quehay.app', false)
    from perfiles p left join auth.users u on u.id = p.id
   where p_buscar is null or p_buscar = ''
      or p.usuario ilike '%' || p_buscar || '%' or p.nombre ilike '%' || p_buscar || '%';
end $$;
grant execute on function public.panel_testers(text) to authenticated;

-- ---------- Ficha de un tester ----------
create or replace function public.panel_ficha(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare resultado jsonb; disp text[];
begin
  perform public.exigir_admin();
  -- dispositivos que ha usado: así se ven también los pasos que dio antes de entrar con su cuenta
  select coalesce(array_agg(distinct dispositivo), '{}') into disp
    from eventos_app where usuario_id = p_id and dispositivo is not null;
  select jsonb_build_object(
    'perfil', (select to_jsonb(x) from (
        select p.id, p.usuario, p.nombre, p.avatar_url, p.ciudad, p.rol, p.xp, public.nivel_de(p.xp) nivel,
               public.titulo_de(public.nivel_de(p.xp)) titulo, p.creado_en, p.tutorial_completado,
               u.last_sign_in_at ultimo_ingreso,
               case when u.email like '%@usuarios.quehay.app' then null else u.email end correo
          from perfiles p left join auth.users u on u.id = p.id where p.id = p_id) x),
    'dispositivos', to_jsonb(disp),
    'recorrido', (select coalesce(jsonb_agg(to_jsonb(e) order by e.creado_en desc), '[]') from (
        select e.creado_en, e.nombre, e.datos, (e.usuario_id is null) sin_cuenta, rc.titulo receta
          from eventos_app e
          left join recetas rc on e.datos->>'receta' ~ '^[0-9]+$' and rc.id = (e.datos->>'receta')::bigint
         where e.usuario_id = p_id or (e.usuario_id is null and e.dispositivo = any(disp))
         order by e.creado_en desc limit 150) e),
    'nevera', (select coalesce(jsonb_agg(i.nombre order by i.nombre), '[]')
                 from nevera n join ingredientes i on i.id = n.ingrediente_id where n.usuario_id = p_id),
    'recetas', (select coalesce(jsonb_agg(to_jsonb(r) order by r.creado_en desc), '[]') from (
        select id, titulo, foto_url, creado_en, num_likes, num_cocinadas, oculta from recetas where autor_id = p_id) r),
    'fotos', (select coalesce(jsonb_agg(to_jsonb(a) order by a.creado_en desc), '[]') from (
        select a.id, a.foto_url, a.creado_en, r.titulo from asi_me_quedo a join recetas r on r.id = a.receta_id
         where a.usuario_id = p_id) a),
    'opiniones', (select coalesce(jsonb_agg(to_jsonb(o) order by o.creado_en desc), '[]') from (
        select id, creado_en, tipo, nota, texto, pantalla, estado from opiniones where usuario_id = p_id) o),
    'notas', (select coalesce(jsonb_agg(to_jsonb(n) order by n.creado_en desc), '[]') from (
        select id, creado_en, texto from admin_notas where usuario_id = p_id) n)
  ) into resultado;
  return resultado;
end $$;
grant execute on function public.panel_ficha(uuid) to authenticated;

-- ---------- Cambiar la contraseña de un tester ----------
create or replace function public.panel_cambiar_clave(p_id uuid, p_clave text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_clave is null or char_length(p_clave) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_id;
  if not found then raise exception 'No encontré esa cuenta'; end if;
  perform public.anotar_accion('cambiar_clave', p_id);  -- la contraseña nunca se guarda en el registro
end $$;
grant execute on function public.panel_cambiar_clave(uuid, text) to authenticated;

-- ---------- Notas ----------
create or replace function public.panel_agregar_nota(p_id uuid, p_texto text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  insert into admin_notas (usuario_id, admin_id, texto) values (p_id, auth.uid(), trim(p_texto));
  perform public.anotar_accion('nota', p_id);
end $$;
grant execute on function public.panel_agregar_nota(uuid, text) to authenticated;

create or replace function public.panel_borrar_nota(p_nota bigint)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  delete from admin_notas where id = p_nota;
end $$;
grant execute on function public.panel_borrar_nota(bigint) to authenticated;

-- ---------- Opiniones ----------
drop function if exists public.panel_opiniones(text);
create or replace function public.panel_opiniones(p_filtro text default 'nuevas')
returns table (id bigint, creado_en timestamptz, tipo text, nota smallint, texto text, pantalla text,
               plataforma text, estado text, usuario_id uuid, usuario text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select o.id, o.creado_en, o.tipo, o.nota, o.texto, o.pantalla, o.plataforma, o.estado, o.usuario_id, p.usuario
    from opiniones o left join perfiles p on p.id = o.usuario_id
   where case p_filtro
           when 'nuevas'  then o.estado = 'nueva'
           when 'errores' then o.tipo = 'error'
           when 'ideas'   then o.tipo = 'idea'
           when 'resueltas' then o.estado = 'resuelta'
           else true end
   order by o.creado_en desc
   limit 300;
end $$;
grant execute on function public.panel_opiniones(text) to authenticated;

create or replace function public.panel_marcar_opinion(p_id bigint, p_estado text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_estado not in ('nueva', 'vista', 'resuelta') then raise exception 'Estado no válido'; end if;
  update opiniones set estado = p_estado where id = p_id;
end $$;
grant execute on function public.panel_marcar_opinion(bigint, text) to authenticated;

-- Nadie sin sesión puede llamar a las funciones del panel
revoke execute on function public.panel_inicio(), public.panel_testers(text), public.panel_ficha(uuid),
  public.panel_cambiar_clave(uuid, text), public.panel_agregar_nota(uuid, text), public.panel_borrar_nota(bigint),
  public.panel_opiniones(text), public.panel_marcar_opinion(bigint, text) from public, anon;
