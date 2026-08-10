import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { LEGAL_LINKS } from '../../../shared/constants/legalLinks';
import { supabase } from '../client';

// auth.users (la tabla interna de Supabase con email/contraseña) no tiene
// nombre, apellidos, teléfono, etc. — esos datos viven en NUESTRA tabla
// `profiles` (ver supabase/migrations/0001_init_profiles.sql). Esta función
// junta "quién eres" (el id de sesión) con "tus datos" (la fila de profiles),
// y los traduce del formato de la base de datos (snake_case: first_name) al
// formato que usa el resto de la app en JS (camelCase: firstName). Este
// "traducir de un formato a otro" es exactamente el trabajo de un repositorio.
async function fetchProfile(userId) {
  // profiles no sabe con qué te autenticaste (eso vive en auth.users, no en
  // nuestra tabla) — lo sacamos de la sesión local (getSession no hace red,
  // lee de lo que ya hay guardado en el dispositivo) para poder distinguir
  // cuentas creadas con Google de las de email/contraseña, por ejemplo para
  // no ofrecer "cambiar contraseña" a quien nunca tuvo una (ver edit-profile.jsx).
  const [{ data, error }, { data: sessionData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, username, avatar_url, is_admin, terms_accepted_at')
      .eq('id', userId)
      .single(),
    supabase.auth.getSession(),
  ]);

  if (error) throw error;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    username: data.username,
    avatarUrl: data.avatar_url,
    isAdmin: data.is_admin,
    termsAcceptedAt: data.terms_accepted_at,
    authProvider: sessionData.session?.user?.app_metadata?.provider ?? 'email',
  };
}

// Esta es la implementación REAL del contrato IAuthRepository (domain/repositories/IAuthRepository.js).
// El comentario de arriba (@type) le dice al editor "este objeto debe tener
// exactamente estas funciones", para que avise si nos falta alguna.
/** @type {import('../../../domain/repositories/IAuthRepository').IAuthRepository} */
export const supabaseAuthRepository = {
  // Se llama desde la pantalla de registro (app/(auth)/register.jsx).
  async signUpWithPassword({ email, password, firstName, lastName, phone, termsAccepted }) {
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
          terms_accepted: !!termsAccepted,
        },
        // Sin esto, el enlace de "confirma tu email" manda a la "Site URL"
        // por defecto del proyecto de Supabase, que no apunta a ninguna
        // página real — de ahí el "esto no existe" que se veía antes.
        emailRedirectTo: LEGAL_LINKS.emailConfirmed,
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

  // Se llama desde la pantalla de login. En vez del SDK nativo de Google
  // (que exige un módulo nativo propio y complica el build), usamos el
  // flujo OAuth que ya trae Supabase: abre un navegador seguro con Google,
  // y Google devuelve a Supabase, que a su vez redirige aquí — a nuestro
  // propio esquema `cuentabirras://`, el mismo patrón que ya usa
  // requestPasswordReset. Todo esto pasa configurando el proveedor Google en
  // el panel de Supabase (Authentication → Providers), no aquí.
  async signInWithGoogle() {
    const redirectTo = Linking.createURL('auth/callback');

    // skipBrowserRedirect: sin esto, el propio supabase-js intentaría
    // redirigir la pestaña actual (comportamiento pensado para web) — en
    // React Native no hay "pestaña actual", así que le pedimos solo la URL
    // y abrimos NOSOTROS el navegador con expo-web-browser.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      throw new Error('Inicio de sesión con Google cancelado.');
    }

    // Supabase manda los tokens en el FRAGMENTO de la URL de vuelta
    // (después del #, no del ?) — por eso no vale con
    // Linking.parse()/searchParams normales, hay que partir la URL a mano.
    const fragment = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      throw new Error('No se pudo completar el inicio de sesión con Google.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;

    return fetchProfile(sessionData.session.user.id);
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

  // Se llama desde app/(auth)/forgot-password.jsx. `redirectTo` es el enlace
  // que llevará el email — usamos el esquema propio de la app
  // (`cuentabirras://reset-password`, definido en app.json) para que, al
  // tocar el enlace desde el correo, se abra la app directamente en
  // /reset-password en vez de una página web. Ese redirect debe estar dado
  // de alta en Supabase (Authentication → URL Configuration → Redirect URLs).
  async requestPasswordReset(email) {
    const redirectTo = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  // Se llama desde app/reset-password.jsx nada más abrirse desde el enlace
  // del email. Supabase puede mandar los datos de dos formas distintas según
  // la configuración del proyecto: como access_token/refresh_token (flujo
  // "implicit", en el trozo de la URL después de #) o como un `code` (flujo
  // "PKCE", en la query después de ?) — aceptamos cualquiera de los dos para
  // no depender de esa configuración.
  async establishRecoverySession({ accessToken, refreshToken, code }) {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return;
    }
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return;
    }
    throw new Error('El enlace de recuperación no es válido.');
  },

  // Se llama desde app/reset-password.jsx, una vez ya hay sesión (normal o
  // la temporal de establishRecoverySession) para fijar la contraseña nueva.
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  // Se llama una vez por sesión desde application/auth/registerPushToken.js.
  // Update directo (no RPC): profiles_update_own ya deja a cualquiera tocar
  // su propia fila.
  async updatePushToken(token) {
    const { data } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', data.session.user.id);
    if (error) throw error;
  },

  // Se llama desde app/(app)/settings/edit-profile.jsx. Nombre/apellidos/
  // teléfono viven solo en profiles (no en auth.users), así que esto es un
  // update directo, igual que updatePushToken — sin RPC, profiles_update_own
  // ya basta. `acceptTerms` solo se manda en true cuando la pantalla exige
  // aceptarlos (cuenta creada por Google, que no pasa por el registro
  // normal) — nunca se manda en false, así nunca "desacepta" nada ya aceptado.
  async updateProfile({ firstName, lastName, phone, acceptTerms }) {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session.user.id;
    const updates = { first_name: firstName, last_name: lastName, phone: phone || null };
    if (acceptTerms) {
      updates.terms_accepted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
      // 23505 = unique_violation. El mensaje de Postgres de serie ("duplicate
      // key value violates unique constraint...") no dice nada a un usuario
      // normal — el único campo único que se toca aquí es el teléfono.
      if (error.code === '23505') {
        throw new Error('Ese teléfono ya lo usa otra cuenta.');
      }
      throw error;
    }
    return fetchProfile(userId);
  },

  // Cambiar el email de ACCESO no es un simple update: Supabase exige
  // confirmarlo desde un enlace mandado a la dirección nueva (para que nadie
  // pueda robarte la cuenta solo con tener la sesión abierta un momento) —
  // auth.users.email no cambia hasta que se confirma ese enlace, y
  // profiles.email se sincroniza solo cuando eso pasa (trigger, migración
  // 0028). emailRedirectTo apunta a la propia app (mismo scheme que ya usa
  // reset-password) para que, si se abre el enlace desde el móvil, vuelva
  // aquí en vez de a una página web genérica.
  async updateEmail(newEmail) {
    const redirectTo = Linking.createURL('/');
    const { error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: redirectTo });
    if (error) throw error;
  },
};
