-- =====================================================================
-- Qué Hay · Almacenamiento de fotos (recetas y "así me quedó")
-- Pegar en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- Carpeta pública de fotos: cualquiera puede verlas, cada usuario
-- solo sube, cambia o borra dentro de su propia carpeta (su id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

create policy "subir mis fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cambiar mis fotos" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar mis fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
