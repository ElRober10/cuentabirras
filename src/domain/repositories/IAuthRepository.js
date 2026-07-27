/**
 * Contrato que debe cumplir cualquier implementación de autenticación
 * (Supabase, o un mock en tests). Nada en `application/` debe importar
 * directamente de `infrastructure/` — solo depende de esta forma.
 *
 * @typedef {Object} IAuthRepository
 * @property {(params: {email: string, password: string, firstName: string, lastName: string}) => Promise<UserProfile>} signUpWithPassword
 * @property {(params: {email: string, password: string}) => Promise<UserProfile>} signInWithPassword
 * @property {() => Promise<UserProfile>} signInWithGoogle
 * @property {() => Promise<void>} signOut
 * @property {() => Promise<UserProfile|null>} getCurrentUser
 * @property {(callback: (user: UserProfile|null) => void) => () => void} onAuthStateChange - devuelve función para desuscribirse
 */

export {};
