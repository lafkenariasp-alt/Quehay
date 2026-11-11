-- =====================================================================
-- Qué Hay · Recetas de prueba
-- Ejecutar DESPUÉS de crear tu cuenta en la app: usa al primer
-- usuario registrado como autor. Borra o reemplaza luego con
-- recetas reales.
-- =====================================================================
do $$
declare
  autor uuid := (select id from public.perfiles order by creado_en limit 1);
  rid bigint;

begin
  if autor is null then
    raise exception 'Primero crea tu cuenta en la app y luego ejecuta este archivo';
  end if;

  create temp table _r (titulo text, minutos int, porciones int, dificultad text, categorias text[], pasos text[], ingredientes text[]) on commit drop;

  insert into _r values
  ('Arroz con pollo casero', 45, 4, 'Fácil', '{Chilena,Casera}',
   '{"Dora el pollo en trozos con un poco de aceite y sal.","Agrega cebolla, ajo y tomate picados y sofríe 5 minutos.","Suma el arroz, revuelve y cubre con agua caliente (doble del arroz).","Cocina tapado a fuego bajo 20 minutos hasta que el arroz esté listo."}',
   '{"Pollo|4 trutros|f","Arroz|2 tazas|f","Cebolla|1|f","Ajo|2 dientes|f","Tomate|1|f","Aceite||f","Sal||f","Agua||f"}'),
  ('Pollo arvejado', 40, 4, 'Fácil', '{Chilena,Casera}',
   '{"Dora el pollo en una olla y retíralo.","Sofríe cebolla, ajo y zanahoria en la misma olla.","Vuelve el pollo, suma las arvejas y agua hasta cubrir; cocina 25 minutos.","Sirve con arroz blanco."}',
   '{"Pollo|4 trutros|f","Arvejas|2 tazas|f","Cebolla|1|f","Ajo|2 dientes|f","Zanahoria|1|f","Arroz|para acompañar|t","Aceite||f","Sal||f","Agua||f"}'),
  ('Cazuela de ave', 60, 4, 'Media', '{Chilena,Tradicional,Casera}',
   '{"Hierve el pollo con agua, sal y una cebolla en cuartos por 20 minutos.","Agrega papas, zapallo y choclo en trozos; cocina 20 minutos.","Suma el arroz y los porotos verdes; cocina 10 minutos más.","Sirve con cilantro picado."}',
   '{"Pollo|4 presas|f","Papas|4|f","Zapallo|4 trozos|f","Choclo|2|f","Arroz|1/2 taza|f","Cebolla|1|f","Porotos verdes|1 taza|t","Cilantro|a gusto|t","Sal||f","Agua||f"}'),
  ('Tallarines con salsa de tomate', 25, 3, 'Fácil', '{Pasta,Italiana,Rápida}',
   '{"Cuece los fideos en agua con sal según el envase.","Sofríe cebolla y ajo, agrega la salsa de tomate y orégano; cocina 10 minutos.","Mezcla con los fideos y sirve con queso rallado."}',
   '{"Spaghetti|400 g|f","Salsa de tomate|1 caja|f","Cebolla|1|f","Ajo|2 dientes|f","Orégano|1 cdta|t","Queso rallado|a gusto|t","Aceite||f","Sal||f","Agua||f"}'),
  ('Tortilla de papas', 35, 4, 'Media', '{Casera,Española}',
   '{"Corta las papas en láminas finas y fríelas a fuego bajo con la cebolla hasta que estén blandas.","Bate los huevos con sal y mezcla con las papas escurridas.","Cuaja en sartén 5 minutos por lado, dándola vuelta con un plato."}',
   '{"Papas|4|f","Huevos|5|f","Cebolla|1|t","Aceite||f","Sal||f"}'),
  ('Charquicán', 45, 4, 'Fácil', '{Chilena,Tradicional,Casera}',
   '{"Sofríe cebolla y ajo, agrega la carne molida y dórala.","Suma papas y zapallo en cubos, choclo y agua; cocina 25 minutos.","Muele con un tenedor dejando trozos y sirve con un huevo frito encima."}',
   '{"Carne molida|500 g|f","Papas|5|f","Zapallo|300 g|f","Cebolla|1|f","Ajo|2 dientes|f","Choclo|1 taza|t","Huevos|1 por plato|t","Paprika|1 cdta|t","Aceite||f","Sal||f","Agua||f"}'),
  ('Huevos revueltos con tomate', 10, 1, 'Fácil', '{Rápida,Desayuno}',
   '{"Sofríe el tomate picado 2 minutos.","Agrega los huevos batidos con sal y revuelve a fuego bajo hasta que cuajen."}',
   '{"Huevos|2|f","Tomate|1|f","Cebollín|a gusto|t","Aceite||f","Sal||f"}'),
  ('Lentejas guisadas', 50, 4, 'Fácil', '{Chilena,Casera,Vegetariana}',
   '{"Sofríe cebolla, ajo, zanahoria y pimentón con paprika.","Agrega las lentejas remojadas y agua; cocina 35 minutos.","Suma el arroz los últimos 15 minutos si quieres un plato más contundente."}',
   '{"Lentejas|2 tazas|f","Cebolla|1|f","Ajo|2 dientes|f","Zanahoria|1|f","Pimentón|1/2|f","Paprika|1 cdta|t","Arroz|1/2 taza|t","Aceite||f","Sal||f","Agua||f"}'),
  ('Pollo con espinaca a la crema', 30, 3, 'Fácil', '{Casera,Rápida}',
   '{"Dora la pechuga en cubos con sal y pimienta.","Agrega ajo y espinaca hasta que se marchite.","Suma la crema y cocina 5 minutos. Sirve con arroz o fideos."}',
   '{"Pollo|2 pechugas|f","Espinaca|2 tazas|f","Crema|1 caja|f","Ajo|1 diente|f","Aceite||f","Sal||f","Pimienta||f"}'),
  ('Batido de plátano y yogur', 5, 1, 'Fácil', '{Rápida,Desayuno,Vegetariana}',
   '{"Licúa el plátano con el yogur y la leche hasta que quede suave.","Endulza a gusto y sirve frío."}',
   '{"Plátano|1|f","Yogur|1|f","Leche|1/2 taza|f","Avena|2 cdas|t"}'),
  ('Ensalada chilena', 10, 4, 'Fácil', '{Chilena,Vegetariana,Rápida}',
   '{"Corta los tomates en gajos y la cebolla en pluma fina; lava la cebolla en agua fría.","Mezcla, aliña con aceite, sal y cilantro."}',
   '{"Tomate|4|f","Cebolla|1|f","Cilantro|a gusto|t","Ají verde|1|t","Aceite||f","Sal||f"}'),
  ('Panqueques con manjar', 30, 4, 'Fácil', '{Postre,Casera}',
   '{"Bate leche, huevos y harina hasta lograr una mezcla líquida sin grumos.","Cocina capas finas en sartén con un poco de mantequilla.","Rellena con manjar y enrolla."}',
   '{"Leche|2 tazas|f","Huevos|2|f","Harina|1 taza|f","Manjar|a gusto|f","Mantequilla|1 cda|t"}');

  -- inserta cada receta y sus ingredientes
  declare
    rec record; item text; partes text[]; ing int;
  begin
    for rec in select * from _r loop
      insert into public.recetas (autor_id, titulo, minutos, porciones, dificultad, categorias, pasos)
      values (autor, rec.titulo, rec.minutos, rec.porciones, rec.dificultad, rec.categorias, rec.pasos)
      returning id into rid;
      foreach item in array rec.ingredientes loop
        partes := string_to_array(item, '|');
        select id into ing from public.ingredientes
          where lower(nombre) = lower(partes[1]) or lower(partes[1]) = any(sinonimos) limit 1;
        if ing is null then raise exception 'Ingrediente no encontrado en el catálogo: %', partes[1]; end if;
        insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad, opcional)
        values (rid, ing, nullif(partes[2], ''), partes[3] = 't');
      end loop;
    end loop;
  end;
end $$;
