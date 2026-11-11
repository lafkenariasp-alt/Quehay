\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
-- dos usuarios
insert into auth.users (id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','{"nombre":"Marta"}'),
 ('22222222-2222-2222-2222-222222222222','{"nombre":"Javi"}');
\i seed/02_recetas_demo.sql
\echo '--- 1) Tengo pollo, arroz, cebolla, tomate, ajo'
select titulo, tengo_n, faltan_n, faltantes from buscar_recetas(
  (select array_agg(id) from ingredientes where nombre in ('Pollo','Arroz','Cebolla','Tomate','Ajo')));
\echo '--- 2) Tengo "Carne" genérica + papas + zapallo (debe calzar charquicán y cazuela)'
select titulo, faltan_n, faltantes from buscar_recetas(
  (select array_agg(id) from ingredientes where nombre in ('Carne','Papas','Zapallo')), 4);
\echo '--- 3) Sin despensa básica: aceite y sal pasan a faltar'
select titulo, faltan_n, faltantes from buscar_recetas(
  (select array_agg(id) from ingredientes where nombre in ('Huevos','Tomate')), 4, false) limit 3;
\echo '--- 4) Autocompletado por sinónimo: "aguac" y "pech"'
select nombre from buscar_ingrediente('aguac'); select nombre from buscar_ingrediente('pech');
\echo '--- 5) XP, logros, likes y "así me quedó" como Javi'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
insert into likes values ('22222222-2222-2222-2222-222222222222', (select id from recetas where titulo='Pollo arvejado'));
insert into notas values ('22222222-2222-2222-2222-222222222222', (select id from recetas where titulo='Pollo arvejado'), 5);
insert into asi_me_quedo (receta_id, usuario_id, foto_url, nota) values
 ((select id from recetas where titulo='Pollo arvejado'),'22222222-2222-2222-2222-222222222222','https://x/foto.jpg','Le puse merkén');
\echo '--- 6) Javi intenta subirse XP a mano (debe ignorarse) y editar receta ajena (0 filas)'
update perfiles set xp = 99999 where id = '22222222-2222-2222-2222-222222222222';
update recetas set titulo = 'hackeada' where titulo = 'Pollo arvejado';
\echo '--- 7) Javi intenta responder como creador (debe fallar)'
do $$ begin
  update asi_me_quedo set respuesta_creador = 'falso' where nota = 'Le puse merkén';
  raise notice 'ERROR: debió fallar';
exception when others then raise notice 'OK, bloqueado: %', sqlerrm; end $$;
\echo '--- 8) Marta (creadora) responde'
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
update asi_me_quedo set respuesta_creador = '¡Buena idea!' where nota = 'Le puse merkén';
reset role;
select titulo, nota_promedio, num_likes, num_cocinadas from recetas where titulo in ('Pollo arvejado','hackeada');
select nombre, xp, nivel, titulo from perfiles_publicos order by nombre;
select usuario_id = '11111111-1111-1111-1111-111111111111' as es_marta, codigo from logros_usuario order by 1, 2;
\echo '--- 9) Nevera: vencimiento estimado y por_vencer'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
insert into nevera (usuario_id, ingrediente_id) select '22222222-2222-2222-2222-222222222222', id from ingredientes where nombre in ('Pollo','Yogur','Arroz','Espinaca');
select nombre, dias_restantes from por_vencer(4);
reset role;
\echo '--- 10) Niveles'
select x, nivel_de(x), titulo_de(nivel_de(x)) from unnest(array[0,49,50,500,2250,9500]) x;
