-- =====================================================================
-- Qué Hay · Configurar cuentas: oficial, administrador (tú) y de prueba
--
-- ANTES de ejecutar:
--   1. Crea las cuentas en Supabase > Authentication > Users > Add user > Create new user
--      (marca "Auto Confirm User"). Sugerencia con Gmail, todo llega a tu mismo correo:
--        tucorreo+oficial@gmail.com   -> cuenta oficial "Qué Hay"
--        tucorreo+prueba1@gmail.com   -> cuenta de prueba 1
--        tucorreo+prueba2@gmail.com   -> cuenta de prueba 2
--   2. Reemplaza los 4 correos de abajo (entre comillas simples) y presiona Run.
-- Se puede ejecutar más de una vez.
-- =====================================================================
do $$
declare
  correo_oficial text := 'CORREO_OFICIAL';   -- ej. tucorreo+oficial@gmail.com
  correo_admin   text := 'CORREO_TUYO';      -- el correo con el que ya usas la app
  correo_prueba1 text := 'CORREO_PRUEBA_1';
  correo_prueba2 text := 'CORREO_PRUEBA_2';
  oficial uuid;
  yo uuid;
  movidas int;
begin
  select id into oficial from auth.users where lower(email) = lower(correo_oficial);
  select id into yo from auth.users where lower(email) = lower(correo_admin);
  if oficial is null then raise exception 'No existe la cuenta oficial %. Créala primero en Authentication > Users.', correo_oficial; end if;
  if yo is null then raise exception 'No existe tu cuenta %.', correo_admin; end if;

  -- Cuenta oficial "Qué Hay"
  update public.perfiles set rol = 'oficial', nombre = 'Qué Hay', usuario = 'quehay', fundador = true where id = oficial;

  -- Tú: administrador (para el futuro panel de gestión)
  update public.perfiles set rol = 'admin', fundador = true where id = yo;

  -- Las 12 recetas de prueba pasan de tu cuenta a la oficial
  update public.recetas set autor_id = oficial
   where autor_id = yo and titulo in (
     'Arroz con pollo casero', 'Pollo arvejado', 'Cazuela de ave', 'Tallarines con salsa de tomate',
     'Tortilla de papas', 'Charquicán', 'Huevos revueltos con tomate', 'Lentejas guisadas',
     'Pollo con espinaca a la crema', 'Batido de plátano y yogur', 'Ensalada chilena', 'Panqueques con manjar');
  get diagnostics movidas = row_count;

  -- Tu XP se recalcula sin esas recetas (y sin los logros de publicar que venían de ellas)
  delete from public.eventos_xp where usuario_id = yo and tipo = 'publicar_receta'
    and ref in (select id::text from public.recetas where autor_id = oficial);
  update public.perfiles set xp = greatest(0, (select coalesce(sum(puntos), 0) from public.eventos_xp where usuario_id = yo)) where id = yo;
  if (select count(*) from public.recetas where autor_id = yo) < 10 then
    delete from public.logros_usuario where usuario_id = yo and codigo = 'diez_recetas';
  end if;
  if (select count(*) from public.recetas where autor_id = yo) < 1 then
    delete from public.logros_usuario where usuario_id = yo and codigo = 'primera_receta';
  end if;

  -- Cuentas de prueba
  update public.perfiles set rol = 'prueba', nombre = 'Prueba Uno', usuario = 'prueba_uno'
   where id = (select id from auth.users where lower(email) = lower(correo_prueba1));
  update public.perfiles set rol = 'prueba', nombre = 'Prueba Dos', usuario = 'prueba_dos'
   where id = (select id from auth.users where lower(email) = lower(correo_prueba2));

  raise notice 'Listo: % recetas movidas a la cuenta oficial', movidas;
end $$;

-- Revisión: deberías ver tus cuentas con su rol
select p.nombre, p.usuario, p.rol, p.xp, p.fundador, (select count(*) from public.recetas r where r.autor_id = p.id) as recetas
from public.perfiles p where p.rol <> 'usuario' order by p.rol;
