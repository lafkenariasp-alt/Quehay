-- =====================================================================
-- Qué Hay · El primer título pasa a ser "Aprendiz de cocina"
-- Pegar en Supabase > SQL Editor > New query > Run (se puede repetir)
-- =====================================================================
create or replace function public.titulo_de(nivel int) returns text
language sql immutable as $$
  select case
    when nivel >= 75 then 'Chef Michelin'
    when nivel >= 50 then 'Chef ejecutivo'
    when nivel >= 35 then 'Sous chef'
    when nivel >= 20 then 'Chef de partida'
    when nivel >= 10 then 'Cocinero de barrio'
    when nivel >= 5  then 'Chefcito'
    else 'Aprendiz de cocina' end
$$;
