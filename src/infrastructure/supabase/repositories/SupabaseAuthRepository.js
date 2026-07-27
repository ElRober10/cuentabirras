import { supabase } from '../client';

// auth.users (la tabla interna de Supabase con email/contraseña) no tiene
// nombre, apellidos, teléfono, etc. — esos datos viven en NUESTRA tabla
// `profiles` (ver supabase/migrations/0001_init_profiles.sql). Esta función
// junta "quién eres" (el id de sesión) con "tus datos" (la fila de profiles),
// y los traduce del formato de la base de datos (snake_case: first_name) al
// formato que usa el resto de la app en JS (camelCase: firstName). Este
// "traducir de un formato a otro" es exactamente el trabajo de un repositorio.
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, username, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    username: data.username,
    avatarUrl: data.avatar_url,
  };
}

// Esta es la implementación REAL del contrato IAuthRepository (domain/repositories/IAuthRepository.js).
// El comentario de arriba (@type) le dice al editor "este objeto debe tener
// exactamente estas funciones", para que avise si nos falta alguna.
/** @type {import('../../../domain/repositories/IAuthRepository').IAuthRepository} */
export const supabaseAuthRepository = {
  // Se llama desde la pantalla de registro (app/(auth)/register.jsx).
  async signUpWithPassword({ email, password, firstName, lastName, phone }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Todo lo que va dentro de `options.data` se guarda como "metadata" del
      // usuario en auth.users. Nuestro trigger de la base de datos
      // (handle_new_user, en la migración SQL) lee estos mismos campos para
      // rellenar automáticamente la tabla `profiles` al crearse el usuario.
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        },
      },
    });
    if (error) throw error;

    // Si el proyecto tiene "Confirm email" activado (por defecto en Supabase),
    // no hay sesión hasta que el usuario confirme el enlace que le llega por email.
    if (!data.session) {
      return { needsEmailConfirmation: true, user: null };
    }

    return { needsEmailConfirmation: false, user: await fetchProfile(data.user.id) };
  },

  // Se llama desde la pantalla de login (app/(auth)/login.jsx).
  async signInWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return fetchProfile(data.user.id);
  },

  // Placeholder: se implementará en la Fase 2 del plan (login con Google).
  async signInWithGoogle() {
    throw new Error('Login con Google todavía no implementado (Fase 2 del plan).');
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Pregunta "¿hay alguien ya logueado ahora mismo?" — se usa poco, porque
  // normalmente confiamos en onAuthStateChange (justo debajo) para enterarnos
  // de la sesión automáticamente.
  async getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return fetchProfile(data.session.user.id);
  },

  // Esta es la pieza más importante del archivo: le decimos a Supabase
  // "avísame cada vez que cambie la sesión" (login, logout, o renovación
  // automática del token). `useAuth.js` (en presentation/hooks) se suscribe
  // a esto para saber en todo momento si hay usuario o no, en toda la app.
  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      try {
        callback(await fetchProfile(session.user.id));
      } catch {
        callback(null);
      }
    });
    // Devolvemos una función para "desconectar" esta suscripción cuando ya
    // no haga falta (evita fugas de memoria si el componente se desmonta).
    return () => data.subscription.unsubscribe();
  },
};
