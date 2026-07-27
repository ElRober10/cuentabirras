// Esto es una "entidad de dominio": describe QUÉ es un UserProfile en nuestra
// app, sin decir de dónde viene el dato (Supabase, un mock de test, etc.).
// Como usamos JavaScript (no TypeScript), no podemos definir un "tipo" real
// que el editor compruebe automáticamente. En su lugar usamos un comentario
// especial de JSDoc (@typedef): no cambia el comportamiento del código, pero
// VSCode lo lee y te autocompleta/avisa si usas mal un campo en otros ficheros.
/**
 * @typedef {Object} UserProfile
 * @property {string} id - UUID, es el mismo id que auth.users.id en Supabase
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string|null} phone - Opcional, puede no existir (null)
 * @property {string|null} username
 * @property {string|null} avatarUrl
 */

// Este archivo no tiene ninguna función ni variable real que usar en otro
// sitio (solo el comentario de arriba). El "export {}" vacío es un truco
// para que Node/Metro lo traten como un módulo ES (import/export) y no como
// un script suelto; sin esto, algunas herramientas dan error.
export {};
