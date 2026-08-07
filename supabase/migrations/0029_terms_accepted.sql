-- ============================================================
-- Constancia de aceptación de términos y condiciones
-- ============================================================
-- Para publicar en Play Store hace falta que el registro deje constancia de
-- que el usuario aceptó los términos y la política de privacidad (docs/ de
-- este repositorio, servido por GitHub Pages). Se guarda CUÁNDO se aceptó,
-- no solo un booleano — útil si algún día cambian los términos y hay que
-- volver a pedir aceptación a quien los aceptó antes de esa fecha.
alter table public.profiles
  add column terms_accepted_at timestamptz;

-- El registro (app/(auth)/register.jsx) manda "terms_accepted: true" en el
-- mismo raw_user_meta_data que ya usa para first_name/last_name/phone (ver
-- migración 0001) — se amplía aquí el trigger para leer también ese campo,
-- en vez de depender de una segunda petición aparte desde el cliente que
-- podría fallar a medias justo después de crear la cuenta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    case when (new.raw_user_meta_data ->> 'terms_accepted')::boolean then now() else null end
  );
  return new;
end;
$$;
