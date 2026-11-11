\set ON_ERROR_STOP on
\echo '=== 004: aplicar ==='
\i migrations/004_estabilidad.sql
\set ON_ERROR_STOP off
-- usuarios: Marta (autor de las demo) y Javi; uno nuevo para probar bienvenida
insert into auth.users (id, raw_user_meta_data) values ('33333333-3333-3333-3333-333333333333','{"nombre":"Nuevo"}');
\echo '--- Bienvenida: Nuevo debe tener 30 XP, delantal y fundador'
select nombre, xp, accesorios, fundador from perfiles where id='33333333-3333-3333-3333-333333333333';
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
\echo '--- Javi intenta subirse rol/accesorios/xp (debe ignorarse)'
update perfiles set xp=9999, rol='admin', accesorios='{trampa}', fundador=true where id='22222222-2222-2222-2222-222222222222';
\echo '--- Javi cocina Pollo arvejado con foto A (XP 20 a Javi, 30 a Marta)'
insert into nevera (usuario_id, ingrediente_id) select '22222222-2222-2222-2222-222222222222', id from ingredientes where nombre in ('Arvejas','Cebolla','Ajo','Zanahoria','Pollo') on conflict do nothing;
update nevera set vence_el = current_date + 1 where usuario_id='22222222-2222-2222-2222-222222222222';
insert into asi_me_quedo (receta_id, usuario_id, foto_url, foto_hash) values ((select id from recetas where titulo='Pollo arvejado'),'22222222-2222-2222-2222-222222222222','https://x/a.jpg','hashA');
\echo '--- Misma foto otra vez (debe fallar)'
insert into asi_me_quedo (receta_id, usuario_id, foto_url, foto_hash) values ((select id from recetas where titulo='Pollo arvejado'),'22222222-2222-2222-2222-222222222222','https://x/a.jpg','hashA');
\echo '--- Repite receta con otra foto (registra, sin XP)'
insert into asi_me_quedo (receta_id, usuario_id, foto_url, foto_hash) values ((select id from recetas where titulo='Pollo arvejado'),'22222222-2222-2222-2222-222222222222','https://x/b.jpg','hashB');
\echo '--- Javi intenta calificar... receta ajena OK; Marta su propia receta debe fallar'
insert into notas values ('22222222-2222-2222-2222-222222222222', (select id from recetas where titulo='Charquicán'), 4) on conflict do nothing;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
insert into notas values ('11111111-1111-1111-1111-111111111111', (select id from recetas where titulo='Charquicán'), 5);
\echo '--- Marta intenta inflar contadores de su receta (debe ignorarse)'
update recetas set num_likes = 9999, num_cocinadas = 9999 where titulo='Charquicán';
\echo '--- Marta (creadora) intenta cambiar la foto de la versión de Javi (debe fallar)'
update asi_me_quedo set foto_url='https://x/falsa.jpg' where foto_hash='hashA';
\echo '--- Marta responde (OK, +10 XP una sola vez)'
update asi_me_quedo set respuesta_creador='¡Gracias!' where foto_hash='hashA';
update asi_me_quedo set respuesta_creador=null where foto_hash='hashA';
update asi_me_quedo set respuesta_creador='Otra vez' where foto_hash='hashA';
\echo '--- Anónimo registra evento (OK) y no puede leerlos'
reset role; set role anon;
select set_config('request.jwt.claim.sub','', false);
insert into eventos_app (nombre, dispositivo, datos) values ('bienvenida_inicio','dev1','{"x":1}');
select count(*) as eventos_visibles_anon from eventos_app;
reset role;
\echo '=== Resultados ==='
select nombre, xp, rol, fundador, accesorios from perfiles order by nombre;
select tipo, puntos, usuario_id = '11111111-1111-1111-1111-111111111111' as es_marta from eventos_xp where tipo in ('cocinar','recibir_asi_me_quedo','responder_asi_me_quedo','bienvenida') order by id;
select foto_hash, sin_faltantes, aprovecho_vencimiento from asi_me_quedo order by id;
select codigo from logros_usuario where usuario_id='22222222-2222-2222-2222-222222222222' order by 1;
select titulo, num_likes, num_cocinadas from recetas where titulo in ('Charquicán','Pollo arvejado');
\echo '--- Borrar receta descuenta 50 XP'
select xp as xp_marta_antes from perfiles where id='11111111-1111-1111-1111-111111111111';
delete from recetas where titulo='Ensalada chilena';
select xp as xp_marta_despues from perfiles where id='11111111-1111-1111-1111-111111111111';
\echo '--- Racha 7 días y nevera al día (simulado)'
alter table asi_me_quedo disable trigger asi_antes;
insert into asi_me_quedo (receta_id, usuario_id, foto_url, foto_hash, creado_en)
  select (select id from recetas where titulo='Tortilla de papas'), '22222222-2222-2222-2222-222222222222', 'https://x/'||d, 'r'||d, now() - (d||' days')::interval from generate_series(1,6) d;
alter table asi_me_quedo enable trigger asi_antes;
insert into asi_me_quedo (receta_id, usuario_id, foto_url, foto_hash) values ((select id from recetas where titulo='Tortilla de papas'),'22222222-2222-2222-2222-222222222222','https://x/hoy','rhoy');
insert into nevera_semanas select '22222222-2222-2222-2222-222222222222', date_trunc('week', now() at time zone 'America/Santiago')::date - (7*w) from generate_series(1,3) w;
delete from nevera where usuario_id='22222222-2222-2222-2222-222222222222' and ingrediente_id=(select id from ingredientes where nombre='Pollo');
insert into nevera (usuario_id, ingrediente_id) values ('22222222-2222-2222-2222-222222222222',(select id from ingredientes where nombre='Pollo'));
select codigo from logros_usuario where usuario_id='22222222-2222-2222-2222-222222222222' order by 1;
