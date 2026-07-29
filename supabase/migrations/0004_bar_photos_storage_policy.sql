-- El bucket "bar-photos" se crea desde el Dashboard (Storage > New bucket),
-- no por SQL. Este script solo añade la política de seguridad: cada foto se
-- guardará en el bucket con una ruta tipo "{tu_user_id}/{bar_id}.jpg", y esta
-- política obliga a que el primer trozo de esa ruta coincida con tu propio
-- id de usuario — así nadie puede leer ni escribir en la "carpeta" de otro.
--
-- storage.foldername(name) trocea la ruta del archivo en partes (separadas
-- por "/"); [1] coge la primera parte (la carpeta del usuario).
create policy "bar_photos_storage_own"
  on storage.objects
  for all
  using (bucket_id = 'bar-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bar-photos' and (storage.foldername(name))[1] = auth.uid()::text);
