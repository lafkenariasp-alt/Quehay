-- =====================================================================
-- Qué Hay · 52 recetas chilenas de todos los días
-- Se publican desde la cuenta oficial (nick: quehay). Ejecutar en Supabase → SQL Editor
-- después de crear esa cuenta. Se puede ejecutar más de una vez: no duplica recetas.
-- Cada ingrediente es "Nombre|cantidad|opcional (t/f)" y debe existir en el catálogo.
-- =====================================================================
do $$
declare
  autor uuid := (select id from public.perfiles where usuario = 'quehay');
  rid bigint; rec record; item text; partes text[]; ing int; nuevas int := 0;
begin
  if autor is null then
    raise exception 'Primero crea la cuenta oficial con el nick quehay';
  end if;

  drop table if exists _r;
  create temp table _r (titulo text, minutos int, porciones int, dificultad text, categorias text[], pasos text[], ingredientes text[]) on commit drop;
  insert into _r values
  ('Porotos con riendas', 90, 6, 'Media', array['Chilena','Tradicional','Casera']::text[],
   array['Remoja los porotos la noche anterior y cuécelos en agua sin sal 50 minutos.','Sofríe cebolla, ajo y zapallo en cubos con paprika.','Agrega el sofrito a los porotos con los tallarines quebrados y cocina 15 minutos más.','Sala al final y sirve con ensalada chilena.']::text[],
   array['Porotos|500 g|f','Tallarines|200 g|f','Zapallo|300 g|f','Cebolla|1|f','Ajo|2 dientes|f','Paprika|1 cdta|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Porotos granados', 50, 4, 'Media', array['Chilena','Tradicional','Vegetariana']::text[],
   array['Sofríe cebolla y ajo con ají de color.','Agrega los porotos granados, el zapallo en cubos y agua hasta cubrir; cocina 30 minutos.','Suma el choclo y la albahaca y cocina 10 minutos, revolviendo para que espese.']::text[],
   array['Porotos granados|1 kg|f','Zapallo|300 g|f','Choclo|2|f','Cebolla|1|f','Ajo|2 dientes|f','Albahaca|un puñado|t','Ají de color|1 cdta|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Pastel de choclo', 75, 6, 'Media', array['Chilena','Tradicional']::text[],
   array['Prepara un pino: sofríe cebolla picada con la carne molida, comino y paprika.','Muele el choclo y cocínalo con leche, albahaca y sal hasta que espese.','En una fuente pon el pino, trozos de pollo, huevo duro y aceitunas.','Cubre con la pasta de choclo, espolvorea azúcar y hornea a 200 °C por 30 minutos.']::text[],
   array['Choclo|8|f','Carne molida|500 g|f','Pollo desmenuzado|1 taza|t','Cebolla|2|f','Huevos|2 duros|t','Aceitunas|6|t','Leche|1 taza|f','Albahaca|un puñado|t','Comino|1/2 cdta|t','Paprika|1 cdta|t','Azúcar|2 cdas|t','Aceite||f','Sal||f']::text[]),
  ('Humitas', 60, 6, 'Media', array['Chilena','Tradicional','Vegetariana']::text[],
   array['Desgrana y muele el choclo; guarda las hojas.','Sofríe cebolla en mantequilla y mézclala con el choclo, albahaca y sal.','Pon dos cucharadas en hojas cruzadas, dobla y amarra.','Cuece en agua hirviendo con sal por 30 minutos.']::text[],
   array['Choclo|10|f','Cebolla|1|f','Mantequilla|2 cdas|f','Albahaca|un puñado|f','Sal||f','Agua||f']::text[]),
  ('Charquicán de verduras', 40, 4, 'Fácil', array['Chilena','Vegetariana','Casera']::text[],
   array['Sofríe cebolla y ajo con paprika.','Agrega papas y zapallo en cubos, arvejas y agua; cocina 25 minutos.','Muele dejando trozos y sirve con huevo frito.']::text[],
   array['Papas|5|f','Zapallo|300 g|f','Arvejas|1 taza|f','Cebolla|1|f','Ajo|2 dientes|f','Huevos|1 por plato|t','Paprika|1 cdta|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Carbonada', 50, 6, 'Media', array['Chilena','Tradicional','Casera']::text[],
   array['Dora la carne en cubos con cebolla y ajo.','Agrega zanahoria, papas y zapallo en cubos y cubre con agua; cocina 25 minutos.','Suma porotos verdes, arvejas y choclo; cocina 10 minutos más.','Sirve con perejil picado.']::text[],
   array['Carne para guiso|500 g|f','Papas|4|f','Zapallo|200 g|f','Zanahoria|1|f','Porotos verdes|1 taza|t','Arvejas|1/2 taza|t','Choclo en grano|1/2 taza|t','Cebolla|1|f','Ajo|2 dientes|f','Perejil|a gusto|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Cazuela de vacuno', 90, 6, 'Media', array['Chilena','Tradicional','Casera']::text[],
   array['Cuece el osobuco en agua con sal y cebolla por 45 minutos, sacando la espuma.','Agrega papas, zapallo y choclo en trozos; cocina 20 minutos.','Suma el arroz y los porotos verdes; cocina 15 minutos más.','Sirve con cilantro.']::text[],
   array['Osobuco|6 trozos|f','Papas|6|f','Zapallo|6 trozos|f','Choclo|3|f','Arroz|1/2 taza|f','Porotos verdes|1 taza|t','Cebolla|1|f','Cilantro|a gusto|t','Sal||f','Agua||f']::text[]),
  ('Sopaipillas', 40, 20, 'Media', array['Chilena','Tradicional']::text[],
   array['Mezcla el zapallo cocido y molido con la mantequilla derretida, sal y harina con polvos.','Amasa hasta que no se pegue y uslerea de medio centímetro.','Corta círculos, pínchalos con un tenedor y fríe en aceite caliente hasta dorar.']::text[],
   array['Zapallo|1 taza cocido|f','Harina con polvos|3 tazas|f','Mantequilla|3 cdas|f','Aceite|para freír|f','Sal||f']::text[]),
  ('Sopaipillas pasadas', 20, 6, 'Fácil', array['Chilena','Postre','Tradicional']::text[],
   array['Derrite la chancaca en agua con canela, clavo de olor y cáscara de naranja.','Cuando espese, sumerge las sopaipillas fritas un par de minutos.','Sirve tibias con un poco del almíbar.']::text[],
   array['Chancaca|1 pan|f','Canela|1 rama|t','Clavo de olor|3|t','Naranja|cáscara de 1|t','Harina con polvos|para 12 sopaipillas|f','Zapallo|1 taza cocido|t','Aceite|para freír|f','Agua||f']::text[]),
  ('Pebre', 10, 4, 'Fácil', array['Chilena','Vegetariana','Rápida']::text[],
   array['Pica muy fino el tomate, la cebolla, el cilantro y el ají verde.','Mezcla con aceite, un chorrito de vinagre y sal.','Deja reposar 10 minutos antes de servir.']::text[],
   array['Tomate|3|f','Cebolla|1|f','Cilantro|1 atado|f','Ají verde|1|t','Vinagre|1 cda|t','Aceite||f','Sal||f']::text[]),
  ('Ensalada de papas mayo', 30, 4, 'Fácil', array['Chilena','Casera','Vegetariana']::text[],
   array['Cuece las papas en cubos con sal hasta que estén blandas pero firmes.','Enfría y mezcla con mayonesa, cebollín y huevo duro picado.']::text[],
   array['Papas|6|f','Mayonesa|4 cdas|f','Huevos|2 duros|t','Cebollín|a gusto|t','Sal||f','Agua||f']::text[]),
  ('Arroz graneado', 25, 4, 'Fácil', array['Chilena','Casera','Vegetariana']::text[],
   array['Sofríe el arroz con un poco de aceite y zanahoria rallada hasta que esté brillante.','Agrega agua caliente (doble del arroz) y sal.','Cocina tapado a fuego bajo 18 minutos y deja reposar 5.']::text[],
   array['Arroz|2 tazas|f','Zanahoria|1/2|t','Ajo|1 diente|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Puré de papas', 30, 4, 'Fácil', array['Casera','Vegetariana']::text[],
   array['Cuece las papas peladas en agua con sal hasta que estén muy blandas.','Muele con mantequilla y leche caliente hasta que quede suave.','Ajusta de sal y nuez moscada.']::text[],
   array['Papas|1 kg|f','Leche|1 taza|f','Mantequilla|2 cdas|f','Nuez moscada|una pizca|t','Sal||f','Agua||f']::text[]),
  ('Tallarines con salsa bolognesa', 40, 4, 'Fácil', array['Pasta','Italiana','Casera']::text[],
   array['Sofríe cebolla, ajo y zanahoria rallada.','Agrega la carne molida, dórala y suma la salsa de tomate y orégano; cocina 20 minutos.','Cuece los tallarines y sirve con la salsa y queso rallado.']::text[],
   array['Tallarines|400 g|f','Carne molida|400 g|f','Salsa de tomate|1 caja|f','Cebolla|1|f','Ajo|2 dientes|f','Zanahoria|1|t','Orégano|1 cdta|t','Queso rallado|a gusto|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Fideos con atún', 20, 3, 'Fácil', array['Pasta','Rápida','Casera']::text[],
   array['Cuece los fideos en agua con sal.','Sofríe cebolla y ajo, agrega el atún escurrido y la salsa de tomate; cocina 5 minutos.','Mezcla con los fideos.']::text[],
   array['Fideos|350 g|f','Atún en lata|2|f','Salsa de tomate|1 caja|f','Cebolla|1|f','Ajo|1 diente|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Fideos con salsa blanca y jamón', 25, 3, 'Fácil', array['Pasta','Rápida']::text[],
   array['Cuece los fideos en agua con sal.','Derrite la mantequilla, agrega la harina y luego la leche de a poco, revolviendo hasta espesar.','Suma el jamón picado y queso; mezcla con los fideos.']::text[],
   array['Fideos|350 g|f','Jamón|150 g|f','Leche|2 tazas|f','Mantequilla|2 cdas|f','Harina|2 cdas|f','Queso rallado|a gusto|t','Nuez moscada|una pizca|t','Sal||f','Agua||f']::text[]),
  ('Ñoquis de papa', 60, 4, 'Media', array['Pasta','Italiana','Vegetariana']::text[],
   array['Cuece las papas con cáscara, pélalas y muélelas en caliente.','Mezcla con un huevo, sal y harina hasta formar una masa suave.','Haz cilindros, corta trozos y márcalos con un tenedor.','Cuece en agua hirviendo hasta que suban y sirve con salsa de tomate.']::text[],
   array['Papas|1 kg|f','Harina|1 1/2 taza|f','Huevos|1|f','Salsa de tomate|1 caja|t','Queso rallado|a gusto|t','Sal||f','Agua||f']::text[]),
  ('Arroz chaufa', 25, 3, 'Fácil', array['Peruana','China','Rápida']::text[],
   array['Saltea el pollo en cubos en sartén muy caliente.','Agrega cebollín, pimentón y el arroz cocido frío.','Suma huevo revuelto y salsa de soya; saltea 3 minutos.']::text[],
   array['Arroz|3 tazas cocido|f','Pollo|1 pechuga|f','Huevos|2|f','Cebollín|2|f','Pimentón|1/2|t','Salsa de soya|3 cdas|f','Jengibre|un trozo|t','Aceite||f']::text[]),
  ('Lomo saltado', 30, 3, 'Media', array['Peruana','Rápida']::text[],
   array['Saltea la carne en tiras a fuego alto y resérvala.','En la misma sartén saltea cebolla morada en pluma y tomate en gajos.','Vuelve la carne, agrega salsa de soya y vinagre; mezcla con papas fritas y sirve con arroz.']::text[],
   array['Lomo liso|400 g|f','Cebolla morada|1|f','Tomate|2|f','Papas fritas congeladas|2 tazas|f','Salsa de soya|3 cdas|f','Vinagre|1 cda|t','Ají verde|1|t','Arroz|para acompañar|t','Aceite||f','Sal||f']::text[]),
  ('Pollo al jugo', 45, 4, 'Fácil', array['Chilena','Casera']::text[],
   array['Dora los trutros con sal y pimienta.','Agrega cebolla, ajo, zanahoria y pimentón en tiras; sofríe 5 minutos.','Suma vino blanco y agua; cocina tapado 25 minutos.']::text[],
   array['Trutro de pollo|4|f','Cebolla|1|f','Zanahoria|1|f','Pimentón|1|t','Ajo|2 dientes|f','Vino blanco|1/2 taza|t','Aceite||f','Sal||f','Pimienta||f','Agua||f']::text[]),
  ('Pollo a la plancha con ensalada', 20, 2, 'Fácil', array['Rápida','Casera']::text[],
   array['Aplana las pechugas, sazona con sal, pimienta y orégano.','Cocina en sartén caliente 5 minutos por lado.','Sirve con lechuga, tomate y palta.']::text[],
   array['Pechuga de pollo|2|f','Lechuga|1/2|t','Tomate|1|t','Palta|1|t','Orégano|1 cdta|t','Aceite||f','Sal||f','Pimienta||f']::text[]),
  ('Pollo arvejado con papas', 45, 4, 'Fácil', array['Chilena','Casera']::text[],
   array['Dora el pollo y sofríe cebolla y zanahoria.','Agrega papas en cubos, arvejas y agua hasta cubrir.','Cocina 25 minutos hasta que las papas estén blandas.']::text[],
   array['Pollo|4 presas|f','Papas|4|f','Arvejas|1 1/2 taza|f','Zanahoria|1|f','Cebolla|1|f','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Guiso de zapallo italiano', 30, 4, 'Fácil', array['Chilena','Vegetariana','Casera']::text[],
   array['Sofríe cebolla y ajo.','Agrega zapallo italiano en cubos y choclo; cocina tapado 10 minutos.','Suma huevos batidos y revuelve hasta que cuajen; termina con queso.']::text[],
   array['Zapallo italiano|3|f','Cebolla|1|f','Ajo|1 diente|f','Choclo en grano|1 taza|t','Huevos|2|f','Queso|a gusto|t','Aceite||f','Sal||f']::text[]),
  ('Budín de zapallo italiano', 50, 4, 'Fácil', array['Casera','Vegetariana']::text[],
   array['Sofríe cebolla y zapallo italiano rallado hasta que suelte el agua.','Mezcla con huevos batidos, pan rallado, leche y queso.','Hornea en fuente engrasada a 180 °C por 30 minutos.']::text[],
   array['Zapallo italiano|4|f','Cebolla|1|f','Huevos|3|f','Leche|1/2 taza|f','Pan rallado|1/2 taza|f','Queso rallado|1/2 taza|t','Aceite||f','Sal||f']::text[]),
  ('Tortilla de acelga', 25, 3, 'Fácil', array['Casera','Vegetariana','Rápida']::text[],
   array['Pica la acelga y sofríela con cebolla y ajo.','Mezcla con los huevos batidos y sal.','Cuaja en sartén 4 minutos por lado.']::text[],
   array['Acelga|1 atado|f','Huevos|4|f','Cebolla|1|f','Ajo|1 diente|t','Aceite||f','Sal||f']::text[]),
  ('Garbanzos guisados', 60, 4, 'Fácil', array['Chilena','Vegetariana','Casera']::text[],
   array['Sofríe cebolla, ajo, zanahoria y pimentón con paprika y comino.','Agrega los garbanzos remojados, zapallo en cubos y agua; cocina 45 minutos.','Ajusta de sal y sirve con arroz.']::text[],
   array['Garbanzos|2 tazas|f','Zapallo|200 g|t','Cebolla|1|f','Zanahoria|1|f','Pimentón|1/2|t','Ajo|2 dientes|f','Paprika|1 cdta|t','Comino|1/2 cdta|t','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Lentejas con arroz', 45, 4, 'Fácil', array['Chilena','Vegetariana','Casera']::text[],
   array['Sofríe cebolla, ajo y zanahoria.','Agrega las lentejas y agua; cocina 25 minutos.','Suma el arroz y cocina 15 minutos más, revolviendo de vez en cuando.']::text[],
   array['Lentejas|1 1/2 taza|f','Arroz|1/2 taza|f','Cebolla|1|f','Zanahoria|1|f','Ajo|2 dientes|f','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Crema de zapallo', 35, 4, 'Fácil', array['Vegetariana','Casera']::text[],
   array['Sofríe cebolla y ajo.','Agrega zapallo y papa en cubos y cubre con caldo; cocina 20 minutos.','Licúa y termina con un chorrito de crema.']::text[],
   array['Zapallo|600 g|f','Papas|1|f','Cebolla|1|f','Ajo|1 diente|t','Caldo de verduras|1 litro|f','Crema|1/2 taza|t','Aceite||f','Sal||f']::text[]),
  ('Sopa de verduras', 35, 4, 'Fácil', array['Vegetariana','Casera']::text[],
   array['Sofríe cebolla y apio.','Agrega papas, zanahoria, zapallo italiano y porotos verdes en cubos con agua o caldo.','Cocina 20 minutos y suma fideos cabello de ángel los últimos 5.']::text[],
   array['Papas|2|f','Zanahoria|1|f','Zapallo italiano|1|f','Porotos verdes|1 taza|t','Apio|1 rama|t','Cebolla|1|f','Fideos cabello de ángel|1 taza|t','Caldo de verduras|1 litro|t','Sal||f','Agua||f']::text[]),
  ('Cazuela de chancho con chuchoca', 70, 4, 'Media', array['Chilena','Tradicional']::text[],
   array['Cuece el costillar en agua con sal y cebolla 35 minutos.','Agrega papas, zapallo y zanahoria; cocina 20 minutos.','Espesa con la chuchoca disuelta en agua fría y cocina 5 minutos revolviendo.']::text[],
   array['Costillar de cerdo|600 g|f','Papas|4|f','Zapallo|4 trozos|f','Zanahoria|1|t','Chuchoca|1/2 taza|f','Cebolla|1|f','Sal||f','Agua||f']::text[]),
  ('Merluza frita con puré', 30, 4, 'Fácil', array['Chilena','Casera']::text[],
   array['Sazona la merluza con sal, limón y ajo.','Pásala por harina y huevo batido.','Fríe en aceite caliente hasta dorar y sirve con puré de papas.']::text[],
   array['Merluza|4 filetes|f','Huevos|2|f','Harina|1/2 taza|f','Limón|1|t','Ajo|1 diente|t','Papas|1 kg|t','Aceite|para freír|f','Sal||f']::text[]),
  ('Reineta al horno con papas', 40, 4, 'Fácil', array['Chilena','Casera']::text[],
   array['Pon papas en rodajas finas en una fuente con aceite y sal.','Encima la reineta con limón, ajo, cebolla en pluma y pimentón.','Hornea a 200 °C por 25 minutos.']::text[],
   array['Reineta|4 filetes|f','Papas|4|f','Cebolla|1|f','Pimentón|1|t','Limón|1|f','Ajo|2 dientes|t','Aceite||f','Sal||f']::text[]),
  ('Paila de huevos', 15, 2, 'Fácil', array['Chilena','Desayuno','Rápida']::text[],
   array['Sofríe cebolla y tomate en una paila de greda o sartén chica.','Rompe los huevos encima sin revolver y tapa hasta que cuajen.','Sirve con pan amasado.']::text[],
   array['Huevos|4|f','Tomate|1|t','Cebolla|1/2|t','Pan|para acompañar|t','Aceite||f','Sal||f']::text[]),
  ('Huevos a la copa con pan tostado', 10, 1, 'Fácil', array['Desayuno','Rápida']::text[],
   array['Pon los huevos en agua hirviendo por 4 minutos.','Sirve con pan tostado y mantequilla.']::text[],
   array['Huevos|2|f','Pan|2 rebanadas|f','Mantequilla|a gusto|t','Sal||f','Agua||f']::text[]),
  ('Tostadas con palta y huevo', 10, 1, 'Fácil', array['Desayuno','Rápida','Vegetariana']::text[],
   array['Tuesta el pan.','Muele la palta con sal y limón y úntala.','Pon encima un huevo frito o pochado.']::text[],
   array['Pan|2 rebanadas|f','Palta|1|f','Huevos|1|f','Limón|unas gotas|t','Sal||f']::text[]),
  ('Completo italiano', 15, 4, 'Fácil', array['Chilena','Rápida']::text[],
   array['Calienta las vienesas en agua y el pan en el horno.','Pon la vienesa en el pan con tomate picado y palta molida con sal.','Termina con mayonesa.']::text[],
   array['Pan de completo|4|f','Vienesas|4|f','Tomate|2|f','Palta|2|f','Mayonesa|a gusto|f','Sal||f','Agua||f']::text[]),
  ('Barros Luco', 15, 2, 'Fácil', array['Chilena','Rápida']::text[],
   array['Sella la carne en sartén muy caliente con sal.','Pon el queso encima hasta que se derrita.','Sirve en pan tostado.']::text[],
   array['Lomo liso|2 bistecs|f','Queso mantecoso|4 láminas|f','Pan|2|f','Sal||f','Aceite||f']::text[]),
  ('Sándwich de pollo palta', 15, 2, 'Fácil', array['Rápida','Casera']::text[],
   array['Mezcla el pollo desmenuzado con mayonesa.','Rellena el pan con el pollo y palta molida con sal.']::text[],
   array['Pollo desmenuzado|1 taza|f','Palta|1|f','Mayonesa|2 cdas|f','Pan de molde|4 rebanadas|f','Sal||f']::text[]),
  ('Quesadillas de pollo', 20, 2, 'Fácil', array['Rápida']::text[],
   array['Rellena las tortillas con pollo desmenuzado, queso y pimentón picado.','Dóralas en sartén 2 minutos por lado hasta que el queso se derrita.']::text[],
   array['Tortillas|4|f','Pollo desmenuzado|1 taza|f','Queso|1 taza rallado|f','Pimentón|1/2|t','Aceite||f']::text[]),
  ('Pizza casera rápida', 30, 4, 'Fácil', array['Italiana','Casera']::text[],
   array['Estira la masa en una lata con aceite.','Cubre con salsa de tomate, orégano, jamón y mozzarella.','Hornea a 220 °C por 15 minutos.']::text[],
   array['Masa de pizza|1|f','Salsa de tomate|1/2 caja|f','Mozzarella|200 g|f','Jamón|100 g|t','Orégano|1 cdta|t','Aceite||f']::text[]),
  ('Empanadas de queso fritas', 30, 12, 'Fácil', array['Chilena','Rápida']::text[],
   array['Rellena cada masa con queso en cubos.','Cierra apretando el borde con un tenedor.','Fríe en aceite caliente hasta que estén doradas.']::text[],
   array['Masa de empanadas|12|f','Queso|300 g|f','Aceite|para freír|f']::text[]),
  ('Mote con huesillo', 20, 4, 'Fácil', array['Chilena','Postre','Tradicional']::text[],
   array['Remoja los huesillos la noche anterior.','Cuécelos con su agua, chancaca y canela 15 minutos; deja enfriar.','Sirve en vaso con mote cocido y bien frío.']::text[],
   array['Huesillos|12|f','Mote|1 taza cocido|f','Chancaca|1/2 pan|f','Canela|1 rama|t','Agua||f']::text[]),
  ('Leche asada', 60, 6, 'Fácil', array['Chilena','Postre','Casera']::text[],
   array['Bate los huevos con azúcar y vainilla; agrega la leche.','Vierte en una fuente con caramelo de azúcar.','Hornea a baño maría a 180 °C por 45 minutos.']::text[],
   array['Leche|1 litro|f','Huevos|5|f','Azúcar|1 taza|f','Esencia de vainilla|1 cdta|t','Agua||f']::text[]),
  ('Arroz con leche', 40, 6, 'Fácil', array['Chilena','Postre','Casera']::text[],
   array['Cuece el arroz en agua 5 minutos y escúrrelo.','Agrega la leche, canela y cáscara de limón; cocina a fuego bajo 25 minutos revolviendo.','Suma el azúcar al final y sirve con canela en polvo.']::text[],
   array['Arroz|1 taza|f','Leche|1 litro|f','Azúcar|1/2 taza|f','Canela|1 rama|t','Limón|cáscara de 1|t','Agua||f']::text[]),
  ('Sémola con leche', 20, 4, 'Fácil', array['Postre','Casera']::text[],
   array['Calienta la leche con azúcar y vainilla.','Agrega la sémola en lluvia revolviendo y cocina 5 minutos.','Sirve frío con salsa de caramelo o frutas.']::text[],
   array['Leche|1 litro|f','Sémola|1/2 taza|f','Azúcar|1/2 taza|f','Esencia de vainilla|1 cdta|t']::text[]),
  ('Queque de plátano', 60, 8, 'Fácil', array['Postre','Casera']::text[],
   array['Muele los plátanos y mezcla con huevos, azúcar y aceite.','Agrega la harina con polvos y una pizca de canela.','Hornea en molde enmantequillado a 180 °C por 45 minutos.']::text[],
   array['Plátano|3 maduros|f','Huevos|2|f','Azúcar|3/4 taza|f','Harina con polvos|2 tazas|f','Aceite|1/2 taza|f','Canela|1/2 cdta|t']::text[]),
  ('Calzones rotos', 40, 20, 'Media', array['Chilena','Postre','Tradicional']::text[],
   array['Mezcla harina con polvos, azúcar, huevos, mantequilla y ralladura de naranja.','Uslerea fino, corta rectángulos, haz un corte al medio y pasa una punta por el corte.','Fríe en aceite caliente y espolvorea azúcar flor.']::text[],
   array['Harina con polvos|3 tazas|f','Huevos|2|f','Azúcar|1/4 taza|f','Mantequilla|2 cdas|f','Naranja|ralladura de 1|t','Azúcar flor|para espolvorear|t','Aceite|para freír|f']::text[]),
  ('Ensalada de quínoa', 25, 4, 'Fácil', array['Vegetariana','Rápida']::text[],
   array['Lava la quínoa y cuécela en agua 15 minutos; enfría.','Mezcla con pepino, tomate, cebolla morada y perejil picados.','Aliña con limón, aceite y sal.']::text[],
   array['Quínoa|1 taza|f','Pepino|1|f','Tomate|2|f','Cebolla morada|1/2|t','Perejil|a gusto|t','Limón|1|f','Aceite||f','Sal||f','Agua||f']::text[]),
  ('Salteado de verduras con arroz', 25, 3, 'Fácil', array['Vegetariana','China','Rápida']::text[],
   array['Saltea brócoli, zanahoria en tiras, pimentón y repollo a fuego alto.','Agrega salsa de soya y jengibre rallado.','Sirve sobre arroz blanco.']::text[],
   array['Brócoli|1|f','Zanahoria|1|f','Pimentón|1|t','Repollo|1/4|t','Salsa de soya|3 cdas|f','Jengibre|un trozo|t','Arroz|para acompañar|t','Aceite||f']::text[]),
  ('Ensalada de repollo y zanahoria', 10, 4, 'Fácil', array['Chilena','Vegetariana','Rápida']::text[],
   array['Corta el repollo en tiras finas y ralla la zanahoria.','Aliña con limón, aceite y sal.']::text[],
   array['Repollo|1/2|f','Zanahoria|2|f','Limón|1|f','Aceite||f','Sal||f']::text[]),
  ('Chorrillana casera', 35, 4, 'Fácil', array['Chilena','Casera']::text[],
   array['Hornea o fríe las papas fritas.','Saltea la carne en tiras con cebolla en pluma.','Sirve sobre las papas con huevos fritos encima.']::text[],
   array['Papas fritas congeladas|1 kg|f','Carne|400 g|f','Cebolla|2|f','Huevos|4|t','Aceite||f','Sal||f']::text[]),
  ('Tomaticán', 30, 4, 'Fácil', array['Chilena','Tradicional','Casera']::text[],
   array['Sofríe cebolla y la carne en tiras.','Agrega tomates picados, choclo y orégano; cocina 15 minutos.','Sirve con arroz o puré.']::text[],
   array['Tomate|5|f','Carne|400 g|t','Choclo en grano|1 taza|f','Cebolla|1|f','Orégano|1 cdta|t','Aceite||f','Sal||f']::text[]);

  for rec in select * from _r loop
    if exists (select 1 from public.recetas where autor_id = autor and lower(titulo) = lower(rec.titulo)) then
      continue; -- ya estaba publicada
    end if;
    insert into public.recetas (autor_id, titulo, minutos, porciones, dificultad, categorias, pasos)
    values (autor, rec.titulo, rec.minutos, rec.porciones, rec.dificultad, rec.categorias, rec.pasos)
    returning id into rid;
    foreach item in array rec.ingredientes loop
      partes := string_to_array(item, '|');
      select id into ing from public.ingredientes
        where lower(nombre) = lower(partes[1]) or lower(partes[1]) = any(sinonimos) limit 1;
      if ing is null then raise exception 'Ingrediente no encontrado en el catálogo: % (receta %)', partes[1], rec.titulo; end if;
      insert into public.receta_ingredientes (receta_id, ingrediente_id, cantidad, opcional)
      values (rid, ing, nullif(partes[2], ''), partes[3] = 't');
    end loop;
    nuevas := nuevas + 1;
  end loop;
  raise notice 'Recetas nuevas publicadas: %', nuevas;
end $$;
