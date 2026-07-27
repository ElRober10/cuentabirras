-- Perfiles de usuario (1:1 con auth.users)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  email         text not null unique,
  phone         text unique,               -- opcional, para invitar/asociar por teléfono
  username      text unique,
  avatar_url    text,
  push_token    text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario solo puede ver y editar su propia fila.
-- (La búsqueda de otros usuarios para invitar, por email/username/teléfono,
-- se resolverá más adelante vía una vista/RPC controlada, no dando SELECT
-- abierto sobre esta tabla completa.)
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea automáticamente la fila en profiles al registrarse un usuario,
-- usando first_name/last_name/phone pasados en options.data del signUp.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
