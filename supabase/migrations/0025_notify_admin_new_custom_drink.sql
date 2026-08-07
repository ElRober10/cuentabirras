-- ============================================================
-- Aviso al admin: bebida nueva sin icono ("Otro")
-- ============================================================
-- Cuando alguien crea una bebida a mano (sin elegir ninguno de los iconos
-- de la lista, ver createItem en SupabaseCatalogRepository.js), catalog_items
-- se guarda con icon = null. Un trigger AFTER INSERT llama a la Edge
-- Function notify-admin-new-custom-drink (mismo patrón que el cron de la
-- migración 0020: pg_net + los secretos ya guardados en Vault), que le
-- manda un push al admin para que le ponga un icono de verdad cuando
-- pueda. Al vivir en un trigger (no en el cliente) da igual desde qué
-- pantalla se cree la bebida — siempre se dispara.
create or replace function public.notify_admin_new_custom_drink()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.icon is null then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify-admin-new-custom-drink',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('catalogItemId', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger on_custom_drink_created
  after insert on public.catalog_items
  for each row execute function public.notify_admin_new_custom_drink();
