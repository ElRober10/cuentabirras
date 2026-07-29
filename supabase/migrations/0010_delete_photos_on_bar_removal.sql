-- Al borrar un bar DE VERDAD (rama "deleted" de remove_bar_for_current_user),
-- también hay que borrar los archivos de foto guardados en Storage — si no,
-- se quedan huérfanos ahí para siempre. Borrar la fila de `bars` ya borra en
-- cascada las filas de `bar_photos` (la migración 0003 lo dejó con "on
-- delete cascade"), pero eso solo limpia la BASE DE DATOS, no el archivo
-- real dentro del bucket "bar-photos".
--
-- Ojo: esto se hace SOLO en la rama de borrado real. Cuando el bar se
-- oculta (rama "hidden"), ni `bars` ni `bar_photos` se tocan para nada, así
-- que la foto se queda intacta — es justo lo que se pide.
--
-- Se borran las fotos de TODOS los usuarios que se la hubieran puesto a ese
-- bar (no solo la tuya): al borrarse el bar entero, ya no tiene sentido que
-- quede la foto de nadie. La función puede verlas todas porque es
-- "security definer" (permisos elevados), aunque bar_photos normalmente es
-- 100% privado entre usuarios.
create or replace function public.remove_bar_for_current_user(target_bar_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  used_by_others boolean;
begin
  select exists (
    select 1 from public.tabs
    where bar_id = target_bar_id and created_by <> auth.uid()
  ) into used_by_others;

  if used_by_others then
    insert into public.hidden_bars (user_id, bar_id)
    values (auth.uid(), target_bar_id)
    on conflict (user_id, bar_id) do nothing;
    return 'hidden';
  else
    delete from storage.objects
    where bucket_id = 'bar-photos'
      and name in (select photo_path from public.bar_photos where bar_id = target_bar_id);

    delete from public.bars where id = target_bar_id;
    return 'deleted';
  end if;
end;
$$;
