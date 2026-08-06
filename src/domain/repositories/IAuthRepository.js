// Un "repositorio" es, en esta arquitectura, cualquier pieza que sabe hablar
// con una fuente de datos externa (aquí: el sistema de login). Este archivo
// NO tiene código que se ejecute — es solo un "contrato" (documentado con
// JSDoc) que dice qué funciones debe tener CUALQUIER implementación de auth,
// sin importar si por debajo usa Supabase, Firebase, o un mock falso en tests.
//
// ¿Para qué sirve esto si no se ejecuta? Para que `src/application/` y
// `src/presentation/` (pantallas, hooks) nunca escriban `import supabase`
// directamente. Si mañana cambiamos de proveedor, solo tocamos
// `src/infrastructure/` y `src/di/container.js` — el resto de la app no se
// entera. Esto es el principio SOLID de "inversión de dependencias".
//
// La implementación real que SÍ cumple este contrato está en:
// src/infrastructure/supabase/repositories/SupabaseAuthRepository.js
/**
 * @typedef {Object} IAuthRepository
 * @property {(params: {email: string, password: string, firstName: string, lastName: string, phone?: string}) => Promise<{needsEmailConfirmation: boolean, user: UserProfile|null}>} signUpWithPassword
 * @property {(params: {email: string, password: string}) => Promise<UserProfile>} signInWithPassword
 * @property {() => Promise<UserProfile>} signInWithGoogle - de momento lanza un error, se implementa en la Fase 2
 * @property {() => Promise<void>} signOut
 * @property {() => Promise<UserProfile|null>} getCurrentUser
 * @property {(callback: (user: UserProfile|null) => void) => () => void} onAuthStateChange - se llama cada vez que cambia la sesión (login/logout/renovación de token). Devuelve una función para "desuscribirse" cuando el componente que lo usa se desmonta.
 * @property {(email: string) => Promise<void>} requestPasswordReset - manda el email de "recuperar contraseña" con un enlace que abre la app en /reset-password.
 * @property {(params: {accessToken?: string, refreshToken?: string, code?: string}) => Promise<void>} establishRecoverySession - crea una sesión temporal a partir de los tokens/código que trae el enlace de recuperación, necesaria antes de poder llamar a updatePassword.
 * @property {(newPassword: string) => Promise<void>} updatePassword - cambia la contraseña del usuario ya autenticado (sesión normal, o la sesión temporal de establishRecoverySession).
 * @property {(token: string) => Promise<void>} updatePushToken - guarda el token de notificaciones push de Expo de este dispositivo en profiles.push_token (Fase D2), para que se le puedan mandar avisos.
 */

export {};
