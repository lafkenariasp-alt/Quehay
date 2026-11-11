-- =====================================================================
-- Qué Hay · 004 Estabilidad, logros y bienvenida
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- (requiere 001, 002 y 003 ya ejecutados)
-- =====================================================================

-- ---------- Perfiles: rol, fundador y accesorios de la mascota ----------
alter table public.perfiles add column if not exists rol text not null default 'usuario'
  check (rol in ('usuario', 'oficial', 'admin', 'prueba'));
alter table public.perfiles add column if not exists fundador boolean not null default false;
alter table public.perfiles add column if not exists accesorios text[] not null default '{}';

-- La vista debe incluir las columnas nuevas (se recrea)
drop view if exists public.perfiles_publicos;
create view public.perfiles_publicos with (security_invoker = on) as
  select p.*, public.nivel_de(p.xp) as nivel, public.titulo_de(public.nivel_de(p.xp)) as titulo
  from public.perfiles p;
grant select on public.perfiles_publicos to anon, authenticated;

-- Desde la app nadie puede tocar su XP, rol, fundador ni accesorios
create or replace function public.tg_proteger_xp() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.xp := old.xp;
    new.rol := old.rol;
    new.fundador := old.fundador;
    new.accesorios := old.accesorios;
  end if;
  return new;
end $$;

-- ---------- XP nunca negativo ----------
create or replace function public.dar_xp(p_usuario uuid, p_tipo text, p_puntos int, p_ref text, p_tope_diario int default null)
returns void language plpgsql security definer set search_path = public as $$
declare hoy int;
begin
  if p_usuario is null then return; end if;
  if p_tope_diario is not null then
    select coalesce(sum(puntos), 0) into hoy from eventos_xp
     where usuario_id = p_usuario and tipo = p_tipo and creado_en > now() - interval '1 day';
    if hoy + p_puntos > p_tope_diario then return; end if;
  end if;
  insert into eventos_xp (usuario_id, tipo, puntos, ref) values (p_usuario, p_tipo, p_puntos, p_ref);
  update perfiles set xp = greatest(0, xp + p_puntos) where id = p_usuario;
end $$;
revoke execute on function public.dar_xp(uuid, text, int, text, int) from public, anon, authenticated;


-- ---------- XP por publicar: tope diario y se descuenta al borrar ----------
create or replace function public.tg_receta_creada() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; pastas int;
begin
  perform dar_xp(new.autor_id, 'publicar_receta', 50, new.id::text, 150); -- máx. 3 recetas con XP al día
  select count(*), count(*) filter (where 'Pasta' = any(categorias)) into n, pastas
    from recetas where autor_id = new.autor_id;
  if n >= 1  then perform otorgar_logro(new.autor_id, 'primera_receta'); end if;
  if n >= 10 then perform otorgar_logro(new.autor_id, 'diez_recetas'); end if;
  if n >= 50 then perform otorgar_logro(new.autor_id, 'cincuenta_recetas'); end if;
  if pastas >= 10 then perform otorgar_logro(new.autor_id, 'maestro_pasta'); end if;
  return new;
end $$;

create or replace function public.tg_receta_borrada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- solo si el perfil sigue existiendo (al borrar una cuenta no hay nada que descontar)
  if exists (select 1 from perfiles where id = old.autor_id)
     and exists (select 1 from eventos_xp where usuario_id = old.autor_id and tipo = 'publicar_receta' and ref = old.id::text) then
    perform dar_xp(old.autor_id, 'borrar_receta', -50, old.id::text);
  end if;
  return old;
end $$;
drop trigger if exists receta_borrada on public.recetas;
create trigger receta_borrada after delete on public.recetas
  for each row execute function public.tg_receta_borrada();

-- ---------- Notas: nadie califica su propia receta ----------
create or replace function public.tg_nota_propia() returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from recetas where id = new.receta_id and autor_id = new.usuario_id) then
    raise exception 'No puedes calificar tu propia receta';
  end if;
  return new;
end $$;
drop trigger if exists nota_propia on public.notas;
create trigger nota_propia before insert or update on public.notas
  for each row execute function public.tg_nota_propia();

-- ---------- "Lo cociné": cada cocinada se registra con foto ----------
alter table public.asi_me_quedo add column if not exists foto_hash text;
alter table public.asi_me_quedo add column if not exists sin_faltantes boolean not null default false;
alter table public.asi_me_quedo add column if not exists aprovecho_vencimiento boolean not null default false;
-- la misma foto no se puede usar dos veces
create unique index if not exists asi_me_quedo_foto_unica on public.asi_me_quedo (foto_hash) where foto_hash is not null;

-- Antes de guardar: límite diario y datos para los logros
create or replace function public.tg_asi_antes() returns trigger language plpgsql set search_path = public as $$
declare hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if (select count(*) from asi_me_quedo
       where usuario_id = new.usuario_id and (creado_en at time zone 'America/Santiago')::date = hoy) >= 10 then
    raise exception 'Llegaste al máximo de 10 platos por día';
  end if;
  -- ¿tenía en su nevera todo lo necesario? (entiende genéricos: carne ↔ pollo)
  new.sin_faltantes := not exists (
    select 1 from receta_ingredientes ri join ingredientes i on i.id = ri.ingrediente_id
    where ri.receta_id = new.receta_id and not ri.opcional and not i.es_basico
      and not exists (
        select 1 from nevera n join ingredientes ni on ni.id = n.ingrediente_id
        where n.usuario_id = new.usuario_id
          and (n.ingrediente_id = ri.ingrediente_id or ni.padre_id = ri.ingrediente_id or i.padre_id = n.ingrediente_id)));
  -- ¿usó algo que vencía en los próximos 2 días?
  new.aprovecho_vencimiento := exists (
    select 1 from receta_ingredientes ri
    join nevera n on n.ingrediente_id = ri.ingrediente_id and n.usuario_id = new.usuario_id
    where ri.receta_id = new.receta_id and n.vence_el between hoy and hoy + 2);
  return new;
end $$;
drop trigger if exists asi_antes on public.asi_me_quedo;
create trigger asi_antes before insert on public.asi_me_quedo
  for each row execute function public.tg_asi_antes();

-- Después de guardar: XP (solo la primera vez por receta y nunca en recetas propias) y logros
create or replace function public.tg_asi_me_quedo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  autor uuid;
  primera boolean;
  personas int;
  hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if tg_op = 'INSERT' then
    update recetas set num_cocinadas = num_cocinadas + 1 where id = new.receta_id returning autor_id into autor;
    primera := not exists (select 1 from asi_me_quedo where receta_id = new.receta_id and usuario_id = new.usuario_id and id <> new.id);
    if primera and autor <> new.usuario_id then
      perform dar_xp(new.usuario_id, 'cocinar', 20, new.id::text, 100);
      perform dar_xp(autor, 'recibir_asi_me_quedo', 30, new.id::text, 300);
    end if;
    -- Inspiración: 10 personas distintas cocinaron tu receta
    select count(distinct usuario_id) into personas from asi_me_quedo where receta_id = new.receta_id and usuario_id <> autor;
    if personas >= 10 then perform otorgar_logro(autor, 'cocinada_10_veces'); end if;
    -- Maestro de la nevera: 5 platos con todo en tu nevera
    if (select count(*) from asi_me_quedo where usuario_id = new.usuario_id and sin_faltantes) >= 5 then
      perform otorgar_logro(new.usuario_id, 'maestro_nevera');
    end if;
    -- Cero desperdicio: usaste algo antes de que venciera
    if new.aprovecho_vencimiento then perform otorgar_logro(new.usuario_id, 'cero_desperdicio'); end if;
    -- Racha de 7 días: cocinaste los últimos 7 días seguidos
    if (select count(distinct (creado_en at time zone 'America/Santiago')::date) from asi_me_quedo
         where usuario_id = new.usuario_id and (creado_en at time zone 'America/Santiago')::date between hoy - 6 and hoy) >= 7 then
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

-- ---------- Nevera al día: actividad semanal ----------
create table if not exists public.nevera_semanas (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  semana     date not null,
  primary key (usuario_id, semana)
);
alter table public.nevera_semanas enable row level security;

create or replace function public.tg_nevera_actividad() returns trigger
language plpgsql security definer set search_path = public as $$
declare esta date := date_trunc('week', now() at time zone 'America/Santiago')::date;
begin
  insert into nevera_semanas values (new.usuario_id, esta) on conflict do nothing;
  if (select count(*) from nevera_semanas where usuario_id = new.usuario_id and semana > esta - 28) >= 4 then
    perform otorgar_logro(new.usuario_id, 'nevera_al_dia');
  end if;
  return null;
end $$;
drop trigger if exists nevera_actividad on public.nevera;
create trigger nevera_actividad after insert on public.nevera
  for each row execute function public.tg_nevera_actividad();

-- ---------- Paquete de bienvenida al registrarse ----------
create or replace function public.tg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, usuario, nombre, accesorios, fundador)
  values (new.id,
          'cocinero_' || substr(replace(new.id::text, '-', ''), 1, 8),
          coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), 'Cocinero'),
          '{delantal_bienvenida}',
          (select count(*) from perfiles) < 1000); -- los primeros 1.000 son fundadores
  perform dar_xp(new.id, 'bienvenida', 30, null);
  return new;
end $$;

-- ---------- Proponer ingredientes ----------
create table if not exists public.propuestas_ingredientes (
  id         bigserial primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  nombre     text not null check (char_length(trim(nombre)) between 2 and 40),
  categoria  text,
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  creado_en  timestamptz not null default now()
);
alter table public.propuestas_ingredientes enable row level security;
create policy "proponer" on public.propuestas_ingredientes for insert to authenticated
  with check (auth.uid() = usuario_id and estado = 'pendiente');
create policy "ver mis propuestas" on public.propuestas_ingredientes for select to authenticated
  using (auth.uid() = usuario_id);
grant select, insert on public.propuestas_ingredientes to authenticated;
grant usage on sequence public.propuestas_ingredientes_id_seq to authenticated;

-- ---------- Eventos de uso (para el futuro panel de métricas) ----------
create table if not exists public.eventos_app (
  id          bigserial primary key,
  usuario_id  uuid references public.perfiles(id) on delete set null,
  dispositivo text,
  nombre      text not null check (char_length(nombre) <= 60),
  datos       jsonb not null default '{}',
  creado_en   timestamptz not null default now()
);
create index if not exists eventos_app_nombre_fecha on public.eventos_app (nombre, creado_en);
alter table public.eventos_app enable row level security;
-- se puede registrar (con o sin cuenta), pero nadie lee desde la app: solo el panel de administración
create policy "registrar evento" on public.eventos_app for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = auth.uid());
grant insert on public.eventos_app to anon, authenticated;
grant usage on sequence public.eventos_app_id_seq to anon, authenticated;

-- ---------- Reportes de contenido (spam o inadecuado) ----------
alter table public.reportes add column if not exists estado text not null default 'pendiente'
  check (estado in ('pendiente', 'revisado', 'descartado'));
create unique index if not exists reportes_unico on public.reportes (usuario_id, tipo, objeto_id);
alter table public.recetas add column if not exists oculta boolean not null default false;
alter table public.asi_me_quedo add column if not exists oculta boolean not null default false;

-- Con 3 reportes de personas distintas, el contenido se oculta hasta que un administrador lo revise
create or replace function public.tg_reporte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reportes where tipo = new.tipo and objeto_id = new.objeto_id and estado = 'pendiente') >= 3 then
    if new.tipo = 'receta' then
      update recetas set oculta = true where id = new.objeto_id::bigint;
    elsif new.tipo = 'asi_me_quedo' then
      update asi_me_quedo set oculta = true where id = new.objeto_id::bigint;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists reporte_nuevo on public.reportes;
create trigger reporte_nuevo after insert on public.reportes
  for each row execute function public.tg_reporte();

-- Lo oculto solo lo ve su autor
drop policy if exists "lectura publica" on public.recetas;
create policy "lectura publica" on public.recetas for select using (not oculta or autor_id = auth.uid());
drop policy if exists "lectura publica" on public.asi_me_quedo;
create policy "lectura publica" on public.asi_me_quedo for select using (not oculta or usuario_id = auth.uid());

-- Contadores y estado protegidos: antes el autor podía editar a mano sus me gusta, notas y veces cocinada
create or replace function public.tg_proteger_receta() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.nota_promedio := old.nota_promedio;
    new.num_notas := old.num_notas;
    new.num_likes := old.num_likes;
    new.num_cocinadas := old.num_cocinadas;
    new.autor_id := old.autor_id;
    new.creado_en := old.creado_en;
    new.oculta := old.oculta;
  end if;
  return new;
end $$;
drop trigger if exists proteger_receta on public.recetas;
create trigger proteger_receta before update on public.recetas
  for each row execute function public.tg_proteger_receta();

-- "Así me quedó": nadie cambia receta, autor, foto, fecha ni estado; solo el creador responde

create or replace function public.tg_asi_me_quedo_permisos() returns trigger language plpgsql as $$
declare autor uuid;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if (new.receta_id, new.usuario_id, new.foto_url, new.foto_hash, new.creado_en, new.sin_faltantes, new.aprovecho_vencimiento, new.oculta)
     is distinct from (old.receta_id, old.usuario_id, old.foto_url, old.foto_hash, old.creado_en, old.sin_faltantes, old.aprovecho_vencimiento, old.oculta) then
    raise exception 'Esos datos no se pueden cambiar';
  end if;
  select autor_id into autor from public.recetas where id = new.receta_id;
  if new.respuesta_creador is distinct from old.respuesta_creador then
    if auth.uid() is distinct from autor then raise exception 'Solo el creador puede responder'; end if;
    new.respondido_en := now();
  end if;
  if new.nota is distinct from old.nota and auth.uid() is distinct from old.usuario_id then
    raise exception 'Solo quien cocinó puede editar su nota';
  end if;
  return new;
end $$;
