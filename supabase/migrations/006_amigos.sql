-- =====================================================================
-- Qué Hay · Sugerencias de amigos
-- Pegar en Supabase > SQL Editor > New query > Run (se puede repetir)
--
-- sugerir_amigos(limite) devuelve cocineros que quizás conoces, con el motivo:
--   te sigue · lo siguen tus amigos · es de tu ciudad · cocina lo mismo que tú
--   · cocinó las mismas recetas · cuenta oficial · cocinero activo
-- Usa solo datos públicos del perfil. Sin sesión, sugiere cuentas activas.
-- =====================================================================
create or replace function public.sugerir_amigos(p_limite int default 20)
returns table (id uuid, nombre text, usuario text, avatar_url text, nivel int, titulo text, ciudad text, motivo text, puntaje numeric)
language sql stable security definer set search_path = public as $$
  with yo as (select auth.uid() as id),
  mio as (select p.* from perfiles p, yo where p.id = yo.id),
  sigo as (select s.seguido_id from seguidores s, yo where s.seguidor_id = yo.id),
  -- categorías que me gustan: de recetas que publiqué, cociné, guardé o marqué con me gusta
  mis_cats as (
    select distinct unnest(r.categorias) as cat from recetas r, yo
     where r.autor_id = yo.id
        or r.id in (select receta_id from likes l where l.usuario_id = yo.id)
        or r.id in (select receta_id from guardadas g where g.usuario_id = yo.id)
        or r.id in (select receta_id from asi_me_quedo a where a.usuario_id = yo.id)
  ),
  señales as (
    -- me sigue y yo no a él
    select s.seguidor_id as cand, 5.0 as pts, 'Te sigue' as motivo
      from seguidores s, yo where s.seguido_id = yo.id
    union all
    -- lo siguen personas que yo sigo
    select s2.seguido_id, 3.0 * count(*), case when count(*) = 1 then 'Lo sigue alguien que tú sigues' else 'Lo siguen ' || count(*) || ' personas que sigues' end
      from seguidores s1 join seguidores s2 on s2.seguidor_id = s1.seguido_id, yo
     where s1.seguidor_id = yo.id group by s2.seguido_id
    union all
    -- misma ciudad
    select p.id, 4.0, 'También es de ' || initcap(trim(p.ciudad))
      from perfiles p, mio
     where mio.ciudad is not null and trim(mio.ciudad) <> '' and lower(trim(p.ciudad)) = lower(trim(mio.ciudad))
    union all
    -- cocina las mismas categorías (por las recetas que publica o cocina)
    select x.autor, least(3, count(distinct x.cat))::numeric, 'Cocina ' || lower(min(x.cat)) || ' como tú'
      from (
        select r.autor_id as autor, unnest(r.categorias) as cat from recetas r where not r.oculta
        union all
        select a.usuario_id, unnest(r.categorias) from asi_me_quedo a join recetas r on r.id = a.receta_id
      ) x
     where x.cat in (select cat from mis_cats)
     group by x.autor
    union all
    -- cocinó las mismas recetas que yo
    select a2.usuario_id, 2.0, 'Cocinó las mismas recetas que tú'
      from asi_me_quedo a1 join asi_me_quedo a2 on a2.receta_id = a1.receta_id, yo
     where a1.usuario_id = yo.id group by a2.usuario_id
    union all
    -- la cuenta oficial, para quien recién llega
    select p.id, 6.0, 'Cuenta oficial de Qué Hay' from perfiles p where p.rol = 'oficial'
    union all
    -- cocineros activos (relleno para cuentas nuevas o invitados)
    select p.id, 0.5 + least(1.5, p.xp / 500.0), 'Cocinero activo'
      from perfiles p where p.xp > 0
  ),
  total as (
    select cand, sum(pts) as puntaje, (array_agg(motivo order by pts desc))[1] as motivo
      from señales group by cand
  )
  select p.id, p.nombre, p.usuario, p.avatar_url, nivel_de(p.xp), titulo_de(nivel_de(p.xp)), p.ciudad, t.motivo, round(t.puntaje, 2)
    from total t join perfiles p on p.id = t.cand
   where p.id is distinct from (select id from yo)
     and p.id not in (select seguido_id from sigo)
     and p.rol <> 'prueba'
   order by t.puntaje desc, p.xp desc
   limit least(greatest(coalesce(p_limite, 20), 1), 50);
$$;
grant execute on function public.sugerir_amigos(int) to anon, authenticated;

-- La ciudad del perfil es opcional y corta (se usa para sugerir gente cercana)
do $$ begin
  alter table public.perfiles add constraint perfiles_ciudad_largo check (ciudad is null or char_length(ciudad) <= 40);
exception when duplicate_object then null; end $$;
