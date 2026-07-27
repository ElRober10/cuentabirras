import { supabase } from '../client';

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

/** @type {import('../../../domain/repositories/IAuthRepository').IAuthRepository} */
export const supabaseAuthRepository = {
  async signUpWithPassword({ email, password, firstName, lastName, phone }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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

  async signInWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return fetchProfile(data.user.id);
  },

  async signInWithGoogle() {
    throw new Error('Login con Google todavía no implementado (Fase 2 del plan).');
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return fetchProfile(data.session.user.id);
  },

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
    return () => data.subscription.unsubscribe();
  },
};
