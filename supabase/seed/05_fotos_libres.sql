-- Seed 05 · Fotos libres (Wikimedia Commons) para recetas de la cuenta quehay
-- Requiere la migración 011. Solo pone foto donde todavía no hay una: nunca reemplaza fotos subidas desde la app.
-- Se puede ejecutar más de una vez sin error.
with fotos(titulo, url, credito) as (values
  ('Pastel de choclo', 'https://commons.wikimedia.org/wiki/Special:FilePath/Pastel_de_choclo_dish.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Pastel_de_choclo_dish.jpg'),
  ('Humitas', 'https://commons.wikimedia.org/wiki/Special:FilePath/Humitas_por_Claudio.N%C3%BA%C3%B1ez.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Humitas_por_Claudio.N%C3%BA%C3%B1ez.jpg'),
  ('Cazuela de vacuno', 'https://commons.wikimedia.org/wiki/Special:FilePath/Chilean_Cazuela.JPG?width=1080', 'https://commons.wikimedia.org/wiki/File:Chilean_Cazuela.JPG'),
  ('Cazuela de ave', 'https://commons.wikimedia.org/wiki/Special:FilePath/Chilean_Cazuela.JPG?width=1080', 'https://commons.wikimedia.org/wiki/File:Chilean_Cazuela.JPG'),
  ('Cazuela de chancho con chuchoca', 'https://commons.wikimedia.org/wiki/Special:FilePath/Chilean_Cazuela.JPG?width=1080', 'https://commons.wikimedia.org/wiki/File:Chilean_Cazuela.JPG'),
  ('Sopaipillas', 'https://commons.wikimedia.org/wiki/Special:FilePath/Sopaipillas_chilenas.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Sopaipillas_chilenas.jpg'),
  ('Sopaipillas pasadas', 'https://commons.wikimedia.org/wiki/Special:FilePath/Sopaipillas_pasadas.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Sopaipillas_pasadas.jpg'),
  ('Mote con huesillo', 'https://commons.wikimedia.org/wiki/Special:FilePath/Mote_con_huesillo.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Mote_con_huesillo.jpg'),
  ('Lomo saltado', 'https://commons.wikimedia.org/wiki/Special:FilePath/Lomo-saltado-perudelights.jpg?width=1080', 'https://commons.wikimedia.org/wiki/File:Lomo-saltado-perudelights.jpg')
)
update public.recetas r
set foto_url = f.url, foto_credito = f.credito
from fotos f, public.perfiles p
where r.titulo = f.titulo and p.id = r.autor_id and p.usuario = 'quehay' and r.foto_url is null;
