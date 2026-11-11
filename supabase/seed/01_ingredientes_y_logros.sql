-- =====================================================================
-- Qué Hay · Catálogo inicial de ingredientes y logros
-- Ejecutar DESPUÉS de 001_esquema.sql
-- (nombre, sinónimos, categoría, es_básico, días de duración en refri)
-- =====================================================================
insert into public.ingredientes (nombre, sinonimos, categoria, es_basico, dias_duracion) values
-- Genéricos (sirven como comodín en la nevera)
('Carne', '{carnes}', 'Carnes y huevos', false, 3),
('Pescado', '{pescados}', 'Pescados y mariscos', false, 2),
('Queso', '{quesos}', 'Lácteos', false, 14),
('Fideos', '{pasta,tallarines}', 'Despensa', false, null),
('Ají', '{chile,picante}', 'Condimentos', false, 10),
-- Carnes y huevos
('Pollo', '{pechuga,trutro,ave}', 'Carnes y huevos', false, 2),
('Vacuno', '{carne de vacuno,res,posta,lomo}', 'Carnes y huevos', false, 3),
('Carne molida', '{molida,carne picada}', 'Carnes y huevos', false, 2),
('Cerdo', '{chancho,costillar,pulpa de cerdo}', 'Carnes y huevos', false, 3),
('Longaniza', '{chorizo}', 'Carnes y huevos', false, 7),
('Vienesas', '{salchichas,hot dog}', 'Carnes y huevos', false, 10),
('Jamón', '{jamon}', 'Carnes y huevos', false, 5),
('Tocino', '{panceta,bacon}', 'Carnes y huevos', false, 7),
('Huevos', '{huevo}', 'Carnes y huevos', false, 21),
-- Pescados y mariscos
('Merluza', '{}', 'Pescados y mariscos', false, 2),
('Salmón', '{salmon}', 'Pescados y mariscos', false, 2),
('Reineta', '{}', 'Pescados y mariscos', false, 2),
('Atún en lata', '{atun,atún}', 'Pescados y mariscos', false, null),
('Jurel en lata', '{jurel}', 'Pescados y mariscos', false, null),
('Choritos', '{mejillones,choros}', 'Pescados y mariscos', false, 2),
('Camarones', '{gambas}', 'Pescados y mariscos', false, 2),
('Machas', '{}', 'Pescados y mariscos', false, 2),
-- Lácteos
('Leche', '{}', 'Lácteos', false, 5),
('Yogur', '{yogurt,yoghurt}', 'Lácteos', false, 10),
('Mantequilla', '{manteca}', 'Lácteos', false, 30),
('Crema', '{crema de leche,nata}', 'Lácteos', false, 5),
('Queso mantecoso', '{mantecoso}', 'Lácteos', false, 14),
('Queso rallado', '{parmesano,queso parmesano}', 'Lácteos', false, 30),
('Quesillo', '{queso fresco}', 'Lácteos', false, 7),
('Leche condensada', '{}', 'Lácteos', false, null),
('Manjar', '{dulce de leche,arequipe}', 'Lácteos', false, null),
-- Verduras
('Cebolla', '{cebollas}', 'Verduras', false, 21),
('Ajo', '{ajos,dientes de ajo}', 'Verduras', false, 30),
('Tomate', '{tomates}', 'Verduras', false, 7),
('Papas', '{papa,patatas}', 'Verduras', false, 21),
('Zanahoria', '{zanahorias}', 'Verduras', false, 21),
('Zapallo', '{calabaza,zapallo camote}', 'Verduras', false, 7),
('Zapallo italiano', '{zucchini,calabacín}', 'Verduras', false, 7),
('Pimentón', '{pimiento,morrón}', 'Verduras', false, 7),
('Choclo', '{maíz,elote}', 'Verduras', false, 4),
('Porotos verdes', '{judías verdes,ejotes}', 'Verduras', false, 5),
('Arvejas', '{chícharos,guisantes}', 'Verduras', false, 4),
('Espinaca', '{espinacas}', 'Verduras', false, 4),
('Lechuga', '{}', 'Verduras', false, 5),
('Acelga', '{}', 'Verduras', false, 4),
('Brócoli', '{brocoli}', 'Verduras', false, 5),
('Coliflor', '{}', 'Verduras', false, 7),
('Repollo', '{col}', 'Verduras', false, 14),
('Pepino', '{}', 'Verduras', false, 7),
('Champiñones', '{champinones,hongos}', 'Verduras', false, 5),
('Palta', '{aguacate,palta hass}', 'Verduras', false, 4),
('Cilantro', '{culantro}', 'Verduras', false, 5),
('Perejil', '{}', 'Verduras', false, 5),
('Cebollín', '{cebolla de verdeo}', 'Verduras', false, 7),
('Camote', '{batata,boniato}', 'Verduras', false, 21),
-- Frutas
('Limón', '{limon,limones}', 'Frutas', false, 21),
('Plátano', '{banana,platano}', 'Frutas', false, 5),
('Manzana', '{manzanas}', 'Frutas', false, 21),
('Naranja', '{naranjas}', 'Frutas', false, 14),
('Frutillas', '{fresas}', 'Frutas', false, 3),
('Durazno', '{melocotón}', 'Frutas', false, 5),
('Pera', '{}', 'Frutas', false, 7),
-- Despensa
('Arroz', '{}', 'Despensa', false, null),
('Spaghetti', '{espagueti,tallarines largos}', 'Despensa', false, null),
('Corbatas', '{farfalle}', 'Despensa', false, null),
('Lentejas', '{}', 'Despensa', false, null),
('Porotos', '{frijoles,porotos granados}', 'Despensa', false, null),
('Garbanzos', '{}', 'Despensa', false, null),
('Harina', '{harina sin polvos}', 'Despensa', false, null),
('Harina con polvos', '{harina leudante}', 'Despensa', false, null),
('Azúcar', '{azucar}', 'Despensa', false, null),
('Avena', '{}', 'Despensa', false, null),
('Pan rallado', '{}', 'Despensa', false, null),
('Salsa de tomate', '{pomarola,tomate triturado,salsa pomarola}', 'Despensa', false, 5),
('Caldo', '{cubo de caldo,caldo en cubo}', 'Despensa', false, null),
('Mayonesa', '{}', 'Despensa', false, 30),
('Chuchoca', '{harina de maíz}', 'Despensa', false, null),
('Polvos de hornear', '{levadura química}', 'Despensa', false, null),
('Chocolate', '{cacao}', 'Despensa', false, null),
('Vinagre', '{}', 'Despensa', false, null),
('Salsa de soya', '{soya,sillao}', 'Despensa', false, null),
-- Condimentos
('Merkén', '{merken}', 'Condimentos', false, null),
('Comino', '{}', 'Condimentos', false, null),
('Orégano', '{oregano}', 'Condimentos', false, null),
('Paprika', '{pimentón dulce,ají color}', 'Condimentos', false, null),
('Ají de color', '{}', 'Condimentos', false, null),
('Ají verde', '{}', 'Verduras', false, 7),
('Laurel', '{}', 'Condimentos', false, null),
-- Panadería
('Pan', '{marraqueta,hallulla,pan amasado}', 'Panadería', false, 3),
('Pan de molde', '{}', 'Panadería', false, 7),
('Tortillas', '{wraps}', 'Panadería', false, 14),
('Masa de empanadas', '{discos de empanada}', 'Panadería', false, 7),
-- Congelados
('Verduras congeladas', '{mix de verduras}', 'Congelados', false, null),
('Papas fritas congeladas', '{}', 'Congelados', false, null),
-- Básicos de despensa (no cuentan como faltantes si el usuario lo activa)
('Sal', '{}', 'Condimentos', true, null),
('Aceite', '{aceite vegetal,aceite de oliva}', 'Despensa', true, null),
('Agua', '{}', 'Bebidas', true, null),
('Pimienta', '{}', 'Condimentos', true, null);

-- Tipos de cada genérico (el buscador los trata como intercambiables)
update public.ingredientes set padre_id = (select id from public.ingredientes where nombre = 'Carne')
 where nombre in ('Pollo','Vacuno','Carne molida','Cerdo');
update public.ingredientes set padre_id = (select id from public.ingredientes where nombre = 'Pescado')
 where nombre in ('Merluza','Salmón','Reineta');
update public.ingredientes set padre_id = (select id from public.ingredientes where nombre = 'Queso')
 where nombre in ('Queso mantecoso','Queso rallado','Quesillo');
update public.ingredientes set padre_id = (select id from public.ingredientes where nombre = 'Fideos')
 where nombre in ('Spaghetti','Corbatas');
update public.ingredientes set padre_id = (select id from public.ingredientes where nombre = 'Ají')
 where nombre in ('Ají verde','Merkén');

-- ---------- Logros iniciales ----------
insert into public.logros (codigo, nombre, descripcion, rareza, clase) values
('primera_receta',     'Primera receta',        'Publica tu primera receta',                         'Común',      'base'),
('diez_recetas',       '10 recetas',            'Publica 10 recetas',                                'Poco común', 'base'),
('cincuenta_recetas',  '50 recetas',            'Publica 50 recetas',                                'Épico',      'base'),
('dar_10_likes',       'Buen paladar',          'Da 10 me gusta',                                    'Común',      'base'),
('receta_100_likes',   'Receta viral',          'Una receta tuya llega a 100 me gusta',              'Legendario', 'base'),
('cocinada_10_veces',  'Inspiración',           '10 personas cocinaron tu receta',                   'Raro',       'base'),
('maestro_nevera',     'Maestro de la nevera',  'Cocina 5 recetas sin ingredientes faltantes',       'Raro',       'base'),
('cero_desperdicio',   'Cero desperdicio',      'Cocina algo antes de que venza',                    'Poco común', 'base'),
('nevera_al_dia',      'Nevera al día',         'Actualiza tu nevera 4 semanas seguidas',            'Raro',       'base'),
('racha_7',            'Racha de 7 días',       'Cocina 7 días seguidos',                            'Poco común', 'base'),
('maestro_pasta',      'Maestro de la pasta',   'Publica 10 recetas de pasta',                       'Épico',      'base');
