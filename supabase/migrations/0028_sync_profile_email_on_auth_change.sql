-- ============================================================
-- Mantener profiles.email sincronizado con auth.users.email
-- ============================================================
-- Hasta ahora profiles.email solo se rellenaba UNA VEZ, al registrarte
-- (trigger handle_new_user, migración 0001) — no había nada que lo
-- mantuviera al día si el email de acceso cambiaba después. Hace falta para
-- el nuevo formulario "Editar datos personales": cambiar el email pasa por
-- supabase.auth.updateUser({ email }), que dispara el flujo de confirmación
-- propio de Supabase (manda un enlace a la dirección nueva) y NO actualiza
-- auth.users.email hasta que se confirma — este trigger reacciona justo a
-- ESE momento (cuando auth.users.email cambia de verdad), no a la petición
-- inicial, así que profiles.email nunca queda por delante del email
-- realmente confirmado.
create function public.handle_auth_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update on auth.users
  for each row execute function public.handle_auth_user_email_changed();
