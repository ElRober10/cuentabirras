-- Esta es una "migración": un archivo SQL que describe un cambio en la base
-- de datos, guardado y versionado junto al código (como si fuera un commit
-- de la base de datos). Se ejecuta a mano en el SQL Editor de Supabase.
--
-- Supabase ya tiene su propia tabla `auth.users` (email + contraseña
-- cifrada), pero ahí NO se puede guardar nombre, apellidos, teléfono, etc.
-- Por eso creamos NUESTRA propia tabla `profiles`, con una fila por cada
-- usuario de auth.users (de ahí "1:1").
create table public.profiles (
  -- El mismo id que en auth.users. "references auth.users(id) on delete
  -- cascade" significa: si se borra el usuario de auth.users, se borra
  -- automáticamente también su fila aquí (no queda huérfana).
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  email         text not null unique,
  phone         text unique,               -- opcional, para invitar/asociar por teléfono
  username      text unique,
  avatar_url    text,
  push_token    text,                      -- para notificaciones push, se usará en fases futuras
  created_at    timestamptz not null default now()
);

-- RLS = Row Level Security ("seguridad a nivel de fila"). Sin esto, CUALQUIER
-- persona con la anon key de la app (que va embebida en el propio código,
-- no es secreta) podría leer o modificar TODAS las filas de esta tabla,
-- de cualquier usuario. Con RLS activado, por defecto NADIE puede tocar
-- nada hasta que se lo permitamos explícitamente con "policies" (ver abajo).
alter table public.profiles enable row level security;

-- Una "policy" es una regla de RLS: aquí decimos que cada usuario solo
-- puede LEER (select) su propia fila. `auth.uid()` es una función especial
-- de Supabase que devuelve el id del usuario que está haciendo la petición
-- (sacado del token de sesión) — si no coincide con `id`, la fila
-- simplemente no aparece en el resultado, como si no existiera.
-- (La búsqueda de otros usuarios para invitar, por email/username/teléfono,
-- se resolverá más adelante vía una vista/RPC controlada, no dando SELECT
-- abierto sobre esta tabla completa.)
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Misma idea, pero para poder EDITAR (update) solo tu propia fila.
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Un "trigger" es código que la base de datos ejecuta SOLA, automáticamente,
-- cuando pasa algo (aquí: cada vez que se inserta un usuario nuevo en
-- auth.users, es decir, cada vez que alguien se registra). Así nos
-- aseguramos de que SIEMPRE exista la fila en `profiles` correspondiente,
-- sin depender de que la app haga una segunda petición aparte (que podría
-- fallar a medias).
--
-- "security definer" es importante: significa que esta función se ejecuta
-- con permisos de administrador (no con los del usuario recién creado, que
-- todavía no podría ni insertar en `profiles` por las policies de arriba).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- new.raw_user_meta_data son los datos que la app mandó en signUp()
  -- dentro de `options.data` (ver SupabaseAuthRepository.js). coalesce(x, '')
  -- significa "usa x, pero si es null usa '' en su lugar".
  insert into public.profiles (id, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

-- Conecta el trigger con la función de arriba: "después de insertar (after
-- insert) en auth.users, ejecuta handle_new_user() para esa fila (for each row)".
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
