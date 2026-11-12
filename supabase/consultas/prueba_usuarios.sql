-- Qué Hay · Panel de la prueba con usuarios
-- Ejecuta cada consulta por separado en Supabase → SQL Editor (solo lee, no cambia nada).
-- Cambia la fecha de inicio si la prueba parte otro día.

-- 1) Embudo: cuántos teléfonos llegaron a cada paso
with ev as (
  select * from public.eventos_app where creado_en >= '2026-11-12'
)
select paso, telefonos from (
  select 1 as o, 'Abrió la app'           as paso, count(distinct dispositivo) as telefonos from ev where nombre = 'bienvenida_inicio'
  union all select 2, 'Vio recetas en la bienvenida', count(distinct dispositivo) from ev where nombre = 'bienvenida_resultados'
  union all select 3, 'Terminó el tutorial',          count(distinct dispositivo) from ev where nombre = 'tutorial_completado'
  union all select 4, 'Saltó el tutorial',            count(distinct dispositivo) from ev where nombre = 'tutorial_saltado'
  union all select 5, 'Creó su cuenta',               count(distinct dispositivo) from ev where nombre = 'registro'
  union all select 6, 'Buscó recetas',                count(distinct dispositivo) from ev where nombre = 'busqueda'
  union all select 7, 'Usó el paso a paso',           count(distinct dispositivo) from ev where nombre = 'modo_cocina'
  union all select 8, 'Subió «Lo cociné»',            count(distinct dispositivo) from ev where nombre = 'lo_cocine'
  union all select 9, 'Compartió una receta',         count(distinct dispositivo) from ev where nombre = 'compartir_receta'
) x order by o;

-- 2) Tutorial: en qué línea se quedó o lo saltó cada teléfono
--    (la línea es la posición en src/guion.js, contando desde 0)
select dispositivo,
       max((datos->>'linea')::int) filter (where nombre = 'tutorial_linea') as ultima_linea,
       bool_or(nombre = 'tutorial_saltado')    as salto,
       bool_or(nombre = 'tutorial_completado') as termino
from public.eventos_app
where creado_en >= '2026-11-12' and nombre like 'tutorial%'
group by dispositivo
order by ultima_linea nulls first;

-- 3) Búsquedas sin resultados (señal de que faltan recetas)
select creado_en, datos->>'ingredientes' as ingredientes, datos->>'resultados' as resultados, (datos->>'cercanas')::boolean as solo_cercanas
from public.eventos_app
where creado_en >= '2026-11-12' and nombre = 'busqueda' and ((datos->>'resultados')::int = 0 or (datos->>'cercanas')::boolean)
order by creado_en desc;

-- 4) Recorrido de cada teléfono, en orden (para ver dónde se trabó alguien en particular)
select dispositivo, to_char(creado_en at time zone 'America/Santiago', 'DD/MM HH24:MI') as hora, nombre, datos
from public.eventos_app
where creado_en >= '2026-11-12'
order by dispositivo, creado_en;
