-- =====================================================================
-- Qué Hay · ¿Qué pasos ya están hechos? Pegar en SQL Editor y Run.
-- =====================================================================
select paso, case when listo then '✅ Listo' else '❌ Falta' end as estado, detalle
from (
  select 1 as orden, '1. Migración 003 (seguidores)' as paso,
         to_regclass('public.seguidores') is not null as listo,
         '' as detalle
  union all
  select 2, '2. Migración 004 (versión nueva, con nick)',
         to_regprocedure('public.usuario_disponible(text)') is not null,
         case when to_regprocedure('public.usuario_disponible(text)') is null
              then 'Ejecuta el 004_estabilidad.sql nuevo' else '' end
  union all
  select 3, '3. Más ingredientes (seed 03)',
         (select count(*) from public.ingredientes) >= 250,
         (select count(*) from public.ingredientes)::text || ' ingredientes (deberían ser ~285)'
  union all
  select 4, '4. Cuenta oficial "quehay" creada en la app',
         exists (select 1 from public.perfiles where usuario = 'quehay'), ''
  union all
  select 5, '5. Cuentas prueba_uno y prueba_dos creadas en la app',
         (select count(*) from public.perfiles where usuario in ('prueba_uno', 'prueba_dos')) = 2,
         (select count(*) from public.perfiles where usuario in ('prueba_uno', 'prueba_dos'))::text || ' de 2'
  union all
  select 6, '6. Script configurar_cuentas ejecutado',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'perfiles' and column_name = 'rol')
           and exists (select 1 from public.perfiles where usuario = 'quehay' and rol::text = 'oficial')
           and exists (select 1 from public.perfiles where rol::text = 'admin'),
         coalesce((select 'Admin: ' || string_agg(usuario, ', ') from public.perfiles where rol::text = 'admin'), 'Sin admin aún')
         || ' · Recetas de Qué Hay: '
         || coalesce((select count(*) from public.recetas r join public.perfiles p on p.id = r.autor_id where p.usuario = 'quehay'), 0)::text
) t
order by orden;
