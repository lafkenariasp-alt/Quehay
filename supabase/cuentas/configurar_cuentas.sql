-- =====================================================================
-- Qué Hay · Configurar cuentas: oficial, administrador (tú) y de prueba
--
-- ANTES de ejecutar, crea estas cuentas DESDE LA APP (Crear cuenta, con nick y contraseña):
--   quehay      -> cuenta oficial "Qué Hay" (créala primero, antes de compartir la app)
--   tu nick     -> tu cuenta personal (serás administrador)
--   prueba_uno  -> cuenta de prueba 1
--   prueba_dos  -> cuenta de prueba 2
-- Luego cambia TU_NICK abajo por tu nick (entre comillas simples) y presiona Run.
-- Se puede ejecutar más de una vez.
-- =====================================================================
do $$
declare
  nick_admin text := 'TU_NICK';
  oficial uuid;
  yo uuid;
  movidas int;
begin
  select id into oficial from public.perfiles where usuario = 'quehay';
  select id into yo from public.perfiles where usuario = lower(nick_admin);
  if oficial is null then raise exception 'No existe la cuenta "quehay". Créala primero desde la app.'; end if;
  if yo is null then raise exception 'No existe la cuenta "%". Créala desde la app y revisa que el nick esté bien escrito.', nick_admin; end if;

  -- Cuenta oficial "Qué Hay"
  update public.perfiles set rol = 'oficial', nombre = 'Qué Hay', fundador = true where id = oficial;

  -- Tú: administrador (para el futuro panel de gestión)
  update public.perfiles set rol = 'admin', fundador = true where id = yo;

  -- Las 12 recetas de prueba pasan a la cuenta oficial (estén en la cuenta que estén)
  create temp table if not exists _movidas (receta_id bigint, autor_anterior uuid) on commit drop;
  insert into _movidas
    select id, autor_id from public.recetas
     where autor_id <> oficial and titulo in (
       'Arroz con pollo casero', 'Pollo arvejado', 'Cazuela de ave', 'Tallarines con salsa de tomate',
       'Tortilla de papas', 'Charquicán', 'Huevos revueltos con tomate', 'Lentejas guisadas',
       'Pollo con espinaca a la crema', 'Batido de plátano y yogur', 'Ensalada chilena', 'Panqueques con manjar');
  update public.recetas set autor_id = oficial where id in (select receta_id from _movidas);
  get diagnostics movidas = row_count;

  -- A quien las tenía antes se le descuenta el XP de haberlas publicado
  delete from public.eventos_xp e using _movidas m
   where e.usuario_id = m.autor_anterior and e.tipo = 'publicar_receta' and e.ref = m.receta_id::text;
  update public.perfiles p set xp = greatest(0, (select coalesce(sum(puntos), 0) from public.eventos_xp where usuario_id = p.id))
   where p.id in (select autor_anterior from _movidas);
  delete from public.logros_usuario l
   where l.usuario_id in (select autor_anterior from _movidas)
     and ((l.codigo = 'diez_recetas'   and (select count(*) from public.recetas where autor_id = l.usuario_id) < 10)
       or (l.codigo = 'primera_receta' and (select count(*) from public.recetas where autor_id = l.usuario_id) < 1));

  -- Cuentas de prueba (si ya existen)
  update public.perfiles set rol = 'prueba', nombre = 'Prueba Uno' where usuario = 'prueba_uno';
  update public.perfiles set rol = 'prueba', nombre = 'Prueba Dos' where usuario = 'prueba_dos';

  raise notice 'Listo: % recetas movidas a la cuenta oficial', movidas;
end $$;

-- Revisión: deberías ver tus cuentas con su rol
select p.nombre, p.usuario, p.rol, p.xp, p.fundador, (select count(*) from public.recetas r where r.autor_id = p.id) as recetas
from public.perfiles p where p.rol <> 'usuario' order by p.rol;
