-- 011 · Crédito de las fotos de recetas (fotos con licencia libre de Wikimedia Commons)
-- Se puede ejecutar más de una vez sin error.
alter table public.recetas add column if not exists foto_credito text; -- enlace a la página de la foto (autor y licencia)
