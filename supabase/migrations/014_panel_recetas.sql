-- 014 · Panel de administración: Recetas
-- Ver todas las recetas (también las ocultas), ponerles o quitarles foto, y ocultarlas o mostrarlas.
-- Requiere la 013. Se puede ejecutar más de una vez sin error.

-- ---------- Lista de recetas ----------
drop function if exists public.panel_recetas(text, text);
create or replace function public.panel_recetas(p_filtro text default 'sin_foto', p_buscar text default null)
returns table (id bigint, titulo text, foto_url text, foto_credito text, oculta boolean, creado_en timestamptz,
               autor_id uuid, autor text, num_likes int, num_cocinadas int, minutos int, categorias text[])
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select r.id, r.titulo, r.foto_url, r.foto_credito, r.oculta, r.creado_en, r.autor_id, p.usuario,
         r.num_likes, r.num_cocinadas, r.minutos, r.categorias
    from recetas r join perfiles p on p.id = r.autor_id
   where (case p_filtro
            when 'sin_foto' then r.foto_url is null
            when 'con_foto' then r.foto_url is not null
            when 'ocultas'  then r.oculta
            else true end)
     and (p_buscar is null or p_buscar = '' or r.titulo ilike '%' || p_buscar || '%' or p.usuario ilike '%' || p_buscar || '%')
   order by p.usuario, r.titulo
   limit 500;
end $$;
grant execute on function public.panel_recetas(text, text) to authenticated;

-- ---------- Detalle de una receta ----------
create or replace function public.panel_receta(p_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare resultado jsonb;
begin
  perform public.exigir_admin();
  select jsonb_build_object(
    'receta', (select to_jsonb(x) from (
        select r.id, r.titulo, r.descripcion, r.pasos, r.minutos, r.porciones, r.dificultad, r.categorias,
               r.foto_url, r.foto_credito, r.oculta, r.creado_en, r.num_likes, r.num_cocinadas, r.nota_promedio,
               r.autor_id, p.usuario autor
          from recetas r join perfiles p on p.id = r.autor_id where r.id = p_id) x),
    'ingredientes', (select coalesce(jsonb_agg(jsonb_build_object('nombre', i.nombre, 'cantidad', ri.cantidad, 'opcional', ri.opcional)
                                     order by ri.opcional, i.nombre), '[]')
                       from receta_ingredientes ri join ingredientes i on i.id = ri.ingrediente_id where ri.receta_id = p_id)
  ) into resultado;
  return resultado;
end $$;
grant execute on function public.panel_receta(bigint) to authenticated;

-- ---------- Poner o quitar la foto ----------
-- p_url null = quitar la foto. p_credito: enlace a la licencia cuando la foto no es propia (ej. Wikimedia)
create or replace function public.panel_foto_receta(p_id bigint, p_url text, p_credito text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_url is not null and p_url !~ '^https://' then raise exception 'La foto debe ser un enlace https'; end if;
  if p_credito is not null and p_credito <> '' and p_credito !~ '^https://' then raise exception 'El crédito debe ser un enlace https'; end if;
  update recetas set foto_url = p_url, foto_credito = nullif(p_credito, '') where id = p_id;
  if not found then raise exception 'No encontré esa receta'; end if;
  perform public.anotar_accion(case when p_url is null then 'quitar_foto' else 'poner_foto' end, null,
                               jsonb_build_object('receta', p_id));
end $$;
grant execute on function public.panel_foto_receta(bigint, text, text) to authenticated;

-- ---------- Ocultar o mostrar ----------
create or replace function public.panel_ocultar_receta(p_id bigint, p_oculta boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  update recetas set oculta = p_oculta where id = p_id;
  if not found then raise exception 'No encontré esa receta'; end if;
  perform public.anotar_accion(case when p_oculta then 'ocultar_receta' else 'mostrar_receta' end, null,
                               jsonb_build_object('receta', p_id));
end $$;
grant execute on function public.panel_ocultar_receta(bigint, boolean) to authenticated;

revoke execute on function public.panel_recetas(text, text), public.panel_receta(bigint),
  public.panel_foto_receta(bigint, text, text), public.panel_ocultar_receta(bigint, boolean) from public, anon;
