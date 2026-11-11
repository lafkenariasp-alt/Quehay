-- =====================================================================
-- Qué Hay · Esquema de base de datos (Supabase / PostgreSQL)
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Ingredientes (catálogo cerrado, con sinónimos) ----------
create table public.ingredientes (
  id          serial primary key,
  nombre      text not null unique,
  sinonimos   text[] not null default '{}',
  categoria   text not null check (categoria in
               ('Lácteos','Carnes y huevos','Pescados y mariscos','Verduras','Frutas',
                'Despensa','Condimentos','Panadería','Congelados','Bebidas')),
  -- ingrediente genérico del que es un tipo ("Pollo" -> "Carne"); null si no aplica
  padre_id    int references public.ingredientes(id),
  -- despensa básica: no cuenta como faltante si el usuario lo activa
  es_basico   boolean not null default false,
  -- días de duración típica en refrigerador (para avisos de vencimiento)
  dias_duracion int
);
create index on public.ingredientes (padre_id);

-- ---------- Perfiles de usuario ----------
create table public.perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  usuario       text unique not null check (usuario ~ '^[a-z0-9_.]{3,24}$'),
  nombre        text not null,
  avatar_url    text,
  ciudad        text,
  pais          text not null default 'Chile',
  xp            int  not null default 0,
  clase_activa  text not null default 'base',
  control_vencimiento boolean not null default false,
  incluir_basicos     boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- ---------- Recetas ----------
create table public.recetas (
  id          bigserial primary key,
  autor_id    uuid not null references public.perfiles(id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 3 and 80),
  descripcion text,
  pasos       text[] not null check (array_length(pasos, 1) >= 1),
  minutos     int  not null check (minutos between 1 and 1440),
  porciones   int  not null default 2 check (porciones between 1 and 50),
  dificultad  text not null default 'Fácil' check (dificultad in ('Fácil','Media','Difícil')),
  categorias  text[] not null default '{}',   -- ej. {Chilena,Casera,Pasta}
  foto_url    text,
  pais        text not null default 'Chile',
  ciudad      text,
  nota_promedio numeric(3,2) not null default 0,
  num_notas   int not null default 0,
  num_likes   int not null default 0,
  num_cocinadas int not null default 0,
  creado_en   timestamptz not null default now()
);
create index on public.recetas (autor_id);
create index on public.recetas using gin (categorias);

create table public.receta_ingredientes (
  receta_id     bigint not null references public.recetas(id) on delete cascade,
  ingrediente_id int   not null references public.ingredientes(id),
  cantidad      text,
  opcional      boolean not null default false,
  primary key (receta_id, ingrediente_id)
);
create index on public.receta_ingredientes (ingrediente_id);

-- ---------- Nevera virtual ----------
create table public.nevera (
  usuario_id     uuid not null references public.perfiles(id) on delete cascade,
  ingrediente_id int  not null references public.ingredientes(id),
  agregado_en    timestamptz not null default now(),
  vence_el       date,
  primary key (usuario_id, ingrediente_id)
);

-- ---------- Interacción social ----------
create table public.notas (
  usuario_id uuid   not null references public.perfiles(id) on delete cascade,
  receta_id  bigint not null references public.recetas(id) on delete cascade,
  estrellas  int    not null check (estrellas between 1 and 5),
  creado_en  timestamptz not null default now(),
  primary key (usuario_id, receta_id)
);

create table public.likes (
  usuario_id uuid   not null references public.perfiles(id) on delete cascade,
  receta_id  bigint not null references public.recetas(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (usuario_id, receta_id)
);

create table public.guardadas (
  usuario_id uuid   not null references public.perfiles(id) on delete cascade,
  receta_id  bigint not null references public.recetas(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (usuario_id, receta_id)
);

create table public.comentarios (
  id         bigserial primary key,
  receta_id  bigint not null references public.recetas(id) on delete cascade,
  usuario_id uuid   not null references public.perfiles(id) on delete cascade,
  texto      text   not null check (char_length(texto) between 1 and 1000),
  creado_en  timestamptz not null default now()
);
create index on public.comentarios (receta_id);

-- "Así me quedó": versión cocinada por otro usuario + respuesta del creador
create table public.asi_me_quedo (
  id          bigserial primary key,
  receta_id   bigint not null references public.recetas(id) on delete cascade,
  usuario_id  uuid   not null references public.perfiles(id) on delete cascade,
  foto_url    text   not null,
  nota        text   check (char_length(nota) <= 500),
  respuesta_creador text check (char_length(respuesta_creador) <= 500),
  respondido_en timestamptz,
  creado_en   timestamptz not null default now()
);
create index on public.asi_me_quedo (receta_id);

create table public.reportes (
  id         bigserial primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo       text not null check (tipo in ('receta','comentario','asi_me_quedo','perfil')),
  objeto_id  text not null,
  motivo     text not null,
  creado_en  timestamptz not null default now()
);

-- ---------- Gamificación ----------
create table public.eventos_xp (
  id         bigserial primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo       text not null,
  puntos     int  not null,
  ref        text,
  creado_en  timestamptz not null default now()
);
create index on public.eventos_xp (usuario_id, tipo, creado_en);

create table public.logros (
  codigo      text primary key,
  nombre      text not null,
  descripcion text not null,
  rareza      text not null check (rareza in ('Común','Poco común','Raro','Épico','Legendario')),
  clase       text not null default 'base'
);

create table public.logros_usuario (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  codigo     text not null references public.logros(codigo),
  obtenido_en timestamptz not null default now(),
  primary key (usuario_id, codigo)
);

-- Clases desbloqueadas (Fase 2: el usuario elige cuál abrir en cada nivel de desbloqueo)
create table public.clases_usuario (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  clase      text not null check (clase in ('chef','fitness','casero','rapido','veggie')),
  xp         int  not null default 0,
  desbloqueada_en timestamptz not null default now(),
  primary key (usuario_id, clase)
);

-- =====================================================================
-- Niveles y títulos
-- XP total para llegar al nivel N = 25 * N * (N - 1)  (nivel 2: 50, nivel 5: 500, nivel 10: 2250)
-- =====================================================================
create or replace function public.nivel_de(xp int) returns int
language sql immutable as $$
  select greatest(1, floor((1 + sqrt(1 + xp / 6.25)) / 2)::int)
$$;

create or replace function public.titulo_de(nivel int) returns text
language sql immutable as $$
  select case
    when nivel >= 75 then 'Chef Michelin'
    when nivel >= 50 then 'Chef ejecutivo'
    when nivel >= 35 then 'Sous chef'
    when nivel >= 20 then 'Chef de partida'
    when nivel >= 10 then 'Cocinero de barrio'
    when nivel >= 5  then 'Chefcito'
    else 'Pinche de cocina' end
$$;

-- Otorga XP (con tope diario por tipo para evitar trampas)
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
  update perfiles set xp = xp + p_puntos where id = p_usuario;
end $$;

create or replace function public.otorgar_logro(p_usuario uuid, p_codigo text)
returns void language sql security definer set search_path = public as $$
  insert into logros_usuario (usuario_id, codigo) values (p_usuario, p_codigo) on conflict do nothing
$$;

-- ---------- Disparadores de XP y contadores ----------
create or replace function public.tg_receta_creada() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform dar_xp(new.autor_id, 'publicar_receta', 50, new.id::text);
  select count(*) into n from recetas where autor_id = new.autor_id;
  if n >= 1  then perform otorgar_logro(new.autor_id, 'primera_receta'); end if;
  if n >= 10 then perform otorgar_logro(new.autor_id, 'diez_recetas'); end if;
  if n >= 50 then perform otorgar_logro(new.autor_id, 'cincuenta_recetas'); end if;
  return new;
end $$;
create trigger receta_creada after insert on public.recetas
  for each row execute function public.tg_receta_creada();

create or replace function public.tg_nota() returns trigger
language plpgsql security definer set search_path = public as $$
declare autor uuid;
begin
  update recetas r set
    nota_promedio = (select round(avg(estrellas)::numeric, 2) from notas where receta_id = r.id),
    num_notas     = (select count(*) from notas where receta_id = r.id)
  where r.id = coalesce(new.receta_id, old.receta_id)
  returning autor_id into autor;
  if tg_op = 'INSERT' and new.estrellas = 5 and autor <> new.usuario_id then
    perform dar_xp(autor, 'recibir_5_estrellas', 10, new.receta_id::text);
  end if;
  return null;
end $$;
create trigger nota_cambio after insert or update or delete on public.notas
  for each row execute function public.tg_nota();

create or replace function public.tg_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare autor uuid; total int;
begin
  if tg_op = 'INSERT' then
    update recetas set num_likes = num_likes + 1 where id = new.receta_id
      returning autor_id, num_likes into autor, total;
    if autor <> new.usuario_id then
      perform dar_xp(autor, 'recibir_like', 2, new.receta_id::text, 200);
      perform dar_xp(new.usuario_id, 'dar_like', 1, new.receta_id::text, 20);
    end if;
    if total >= 100 then perform otorgar_logro(autor, 'receta_100_likes'); end if;
    if (select count(*) from likes where usuario_id = new.usuario_id) >= 10 then
      perform otorgar_logro(new.usuario_id, 'dar_10_likes');
    end if;
  else
    update recetas set num_likes = greatest(num_likes - 1, 0) where id = old.receta_id;
  end if;
  return null;
end $$;
create trigger like_cambio after insert or delete on public.likes
  for each row execute function public.tg_like();

create or replace function public.tg_asi_me_quedo() returns trigger
language plpgsql security definer set search_path = public as $$
declare autor uuid; veces int;
begin
  if tg_op = 'INSERT' then
    update recetas set num_cocinadas = num_cocinadas + 1 where id = new.receta_id
      returning autor_id, num_cocinadas into autor, veces;
    perform dar_xp(new.usuario_id, 'subir_asi_me_quedo', 20, new.id::text);
    if autor <> new.usuario_id then
      perform dar_xp(autor, 'recibir_asi_me_quedo', 30, new.id::text);
    end if;
    if veces >= 10 then perform otorgar_logro(autor, 'cocinada_10_veces'); end if;
  elsif tg_op = 'UPDATE' and old.respuesta_creador is null and new.respuesta_creador is not null then
    select autor_id into autor from recetas where id = new.receta_id;
    perform dar_xp(autor, 'responder_asi_me_quedo', 10, new.id::text);
  end if;
  return null;
end $$;
create trigger asi_me_quedo_cambio after insert or update on public.asi_me_quedo
  for each row execute function public.tg_asi_me_quedo();

-- Solo el creador de la receta puede escribir la respuesta; el que cocinó edita foto y nota
create or replace function public.tg_asi_me_quedo_permisos() returns trigger
language plpgsql as $$
declare autor uuid;
begin
  select autor_id into autor from public.recetas where id = new.receta_id;
  if new.respuesta_creador is distinct from old.respuesta_creador then
    if auth.uid() is distinct from autor then raise exception 'Solo el creador puede responder'; end if;
    new.respondido_en := now();
  end if;
  if (new.foto_url, new.nota) is distinct from (old.foto_url, old.nota)
     and auth.uid() is distinct from old.usuario_id then
    raise exception 'Solo quien cocinó puede editar su versión';
  end if;
  return new;
end $$;
create trigger asi_me_quedo_permisos before update on public.asi_me_quedo
  for each row execute function public.tg_asi_me_quedo_permisos();

-- Crea el perfil automáticamente al registrarse
create or replace function public.tg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, usuario, nombre)
  values (new.id,
          'cocinero_' || substr(replace(new.id::text, '-', ''), 1, 8),
          coalesce(new.raw_user_meta_data->>'nombre', 'Cocinero'));
  return new;
end $$;
create trigger nuevo_usuario after insert on auth.users
  for each row execute function public.tg_nuevo_usuario();

-- =====================================================================
-- EL BUSCADOR "TALLER"
-- Recibe los ingredientes que tienes y devuelve recetas con lo que
-- te falta (0 = puedes cocinarla ya). Entiende genéricos: si tienes
-- "Carne" calza con "Pollo"; si tienes "Pollo" calza con "Carne".
-- =====================================================================
create or replace function public.buscar_recetas(
  tengo           int[],
  max_faltantes   int     default 4,
  incluir_basicos boolean default true,
  categoria       text    default null,
  max_minutos     int     default null,
  limite          int     default 50
)
returns table (
  receta_id     bigint,
  titulo        text,
  minutos       int,
  dificultad    text,
  foto_url      text,
  nota_promedio numeric,
  autor         text,
  tengo_n       int,
  faltan_n      int,
  faltantes     text[]
)
language sql stable set search_path = public as $$
  with mis as (
    select unnest(tengo) as id
    union select i.id from ingredientes i where i.padre_id = any(tengo)        -- hijos de lo que tengo
    union select i.padre_id from ingredientes i where i.id = any(tengo) and i.padre_id is not null  -- padres
    union select i.id from ingredientes i where incluir_basicos and i.es_basico
  ),
  cruce as (
    select ri.receta_id,
           count(*) filter (where ri.ingrediente_id in (select id from mis) and not ing.es_basico) as tengo_n,
           count(*) filter (where ri.ingrediente_id not in (select id from mis) and not ri.opcional) as faltan_n,
           array_agg(ing.nombre order by ing.nombre)
             filter (where ri.ingrediente_id not in (select id from mis) and not ri.opcional) as faltantes
    from receta_ingredientes ri
    join ingredientes ing on ing.id = ri.ingrediente_id
    group by ri.receta_id
  )
  select r.id, r.titulo, r.minutos, r.dificultad, r.foto_url, r.nota_promedio, p.nombre,
         c.tengo_n::int, c.faltan_n::int, coalesce(c.faltantes, '{}')
  from cruce c
  join recetas r on r.id = c.receta_id
  join perfiles p on p.id = r.autor_id
  where c.tengo_n > 0
    and c.faltan_n <= max_faltantes
    and (categoria is null or categoria = any(r.categorias))
    and (max_minutos is null or r.minutos <= max_minutos)
  order by c.faltan_n, c.tengo_n desc, r.nota_promedio desc, r.num_cocinadas desc
  limit limite
$$;

-- Busca ingredientes por nombre o sinónimo (para el autocompletado)
create or replace function public.buscar_ingrediente(q text)
returns setof public.ingredientes language sql stable set search_path = public as $$
  select * from ingredientes
  where lower(nombre) like lower(q) || '%'
     or exists (select 1 from unnest(sinonimos) s where lower(s) like lower(q) || '%')
  order by (lower(nombre) like lower(q) || '%') desc, nombre
  limit 10
$$;

-- Lo que vence pronto en tu nevera
create or replace function public.por_vencer(dias int default 3)
returns table (ingrediente_id int, nombre text, vence_el date, dias_restantes int)
language sql stable set search_path = public as $$
  select n.ingrediente_id, i.nombre, n.vence_el, (n.vence_el - current_date)::int
  from nevera n join ingredientes i on i.id = n.ingrediente_id
  where n.usuario_id = auth.uid() and n.vence_el is not null
    and n.vence_el <= current_date + dias
  order by n.vence_el
$$;

-- Al agregar a la nevera, estima la fecha de vencimiento si no viene
create or replace function public.tg_nevera_vence() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.vence_el is null then
    select current_date + i.dias_duracion into new.vence_el
    from ingredientes i where i.id = new.ingrediente_id and i.dias_duracion is not null;
  end if;
  return new;
end $$;
create trigger nevera_vence before insert on public.nevera
  for each row execute function public.tg_nevera_vence();

-- =====================================================================
-- SEGURIDAD (Row Level Security)
-- Todo se puede leer; cada uno solo escribe lo suyo.
-- =====================================================================
alter table public.ingredientes        enable row level security;
alter table public.perfiles            enable row level security;
alter table public.recetas             enable row level security;
alter table public.receta_ingredientes enable row level security;
alter table public.nevera              enable row level security;
alter table public.notas               enable row level security;
alter table public.likes               enable row level security;
alter table public.guardadas           enable row level security;
alter table public.comentarios         enable row level security;
alter table public.asi_me_quedo        enable row level security;
alter table public.reportes            enable row level security;
alter table public.eventos_xp          enable row level security;
alter table public.logros              enable row level security;
alter table public.logros_usuario      enable row level security;
alter table public.clases_usuario      enable row level security;

create policy "lectura publica" on public.ingredientes        for select using (true);
create policy "lectura publica" on public.perfiles            for select using (true);
create policy "lectura publica" on public.recetas             for select using (true);
create policy "lectura publica" on public.receta_ingredientes for select using (true);
create policy "lectura publica" on public.notas               for select using (true);
create policy "lectura publica" on public.likes               for select using (true);
create policy "lectura publica" on public.comentarios         for select using (true);
create policy "lectura publica" on public.asi_me_quedo        for select using (true);
create policy "lectura publica" on public.logros              for select using (true);
create policy "lectura publica" on public.logros_usuario      for select using (true);
create policy "lectura publica" on public.clases_usuario      for select using (true);

-- Perfil: solo el dueño lo edita, y nunca su XP (se protege con un trigger)
create policy "editar mi perfil" on public.perfiles for update using (auth.uid() = id);
create or replace function public.tg_proteger_xp() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then new.xp := old.xp; end if;
  return new;
end $$;
create trigger proteger_xp before update on public.perfiles
  for each row execute function public.tg_proteger_xp();

create policy "crear mis recetas"  on public.recetas for insert with check (auth.uid() = autor_id);
create policy "editar mis recetas" on public.recetas for update using (auth.uid() = autor_id);
create policy "borrar mis recetas" on public.recetas for delete using (auth.uid() = autor_id);

create policy "ingredientes de mis recetas" on public.receta_ingredientes for all
  using (exists (select 1 from public.recetas r where r.id = receta_id and r.autor_id = auth.uid()))
  with check (exists (select 1 from public.recetas r where r.id = receta_id and r.autor_id = auth.uid()));

create policy "mi nevera" on public.nevera for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "mis guardadas" on public.guardadas for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "mis notas" on public.notas for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "mis likes" on public.likes for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "mis comentarios" on public.comentarios for all
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);
create policy "mis reportes" on public.reportes for insert with check (auth.uid() = usuario_id);
create policy "mi xp" on public.eventos_xp for select using (auth.uid() = usuario_id);

create policy "subir mi version" on public.asi_me_quedo for insert with check (auth.uid() = usuario_id);
create policy "borrar mi version" on public.asi_me_quedo for delete using (auth.uid() = usuario_id);
-- Puede editar quien cocinó (su nota) o el creador de la receta (su respuesta)
create policy "editar o responder" on public.asi_me_quedo for update using (
  auth.uid() = usuario_id
  or exists (select 1 from public.recetas r where r.id = receta_id and r.autor_id = auth.uid())
);

-- Vista de perfil con nivel y título calculados
create or replace view public.perfiles_publicos with (security_invoker = on) as
  select p.*, public.nivel_de(p.xp) as nivel, public.titulo_de(public.nivel_de(p.xp)) as titulo
  from public.perfiles p;

-- =====================================================================
-- PERMISOS EXPLÍCITOS para la API (el proyecto se crea con
-- "Automatically expose new tables" desactivado)
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on
  public.perfiles, public.recetas, public.receta_ingredientes, public.nevera,
  public.notas, public.likes, public.guardadas, public.comentarios,
  public.asi_me_quedo, public.reportes
  to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on function
  public.buscar_recetas(int[], int, boolean, text, int, int),
  public.buscar_ingrediente(text),
  public.por_vencer(int),
  public.nivel_de(int),
  public.titulo_de(int)
  to anon, authenticated;
-- Funciones internas de XP: nadie las llama directo desde la app
revoke execute on function public.dar_xp(uuid, text, int, text, int), public.otorgar_logro(uuid, text) from public, anon, authenticated;
