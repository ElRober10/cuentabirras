-- ============================================================
-- handle_new_user: también sabe leer los datos que manda Google
-- ============================================================
-- El registro normal (app/(auth)/register.jsx) manda first_name/last_name
-- sueltos en raw_user_meta_data. El login con Google (Fase 2, ya
-- implementada) NO pasa por ahí — Supabase rellena raw_user_meta_data con
-- lo que Google dé de su propio perfil, típicamente given_name/family_name
-- (o, si no, full_name/name de una sola pieza). Sin este cambio, cualquier
-- cuenta creada con Google se quedaría con first_name/last_name vacíos.
--
-- terms_accepted_at se queda en null para cuentas de Google (nunca pasan
-- por la casilla del registro) — el propio cliente detecta esto
-- (user.termsAcceptedAt) y manda a "Editar datos personales" a aceptarlos
-- antes de dejar entrar a la app (ver login.jsx).
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
    coalesce(
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'given_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data ->> 'last_name',
      new.raw_user_meta_data ->> 'family_name',
      ''
    ),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    case when (new.raw_user_meta_data ->> 'terms_accepted')::boolean then now() else null end
  );
  return new;
end;
$$;
