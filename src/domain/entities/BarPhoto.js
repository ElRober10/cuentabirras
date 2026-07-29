// Tu foto PERSONAL de un bar (para reconocerlo de un vistazo en tu lista).
// A diferencia de CatalogItem.js (colaborativo), esto es privado: solo tú la
// ves, aunque otros usuarios usen el mismo bar.
/**
 * @typedef {Object} BarPhoto
 * @property {string} id
 * @property {string} barId
 * @property {string} userId - de quién es esta foto (por RLS, solo ese mismo usuario puede leerla/tocarla)
 * @property {string} photoPath - Ruta dentro del bucket privado de Storage "bar-photos" (algo como "miUserId/esteBarId.jpg"), NO la imagen en sí ni una URL pública — el bucket es privado, así que la URL para verla se pide "firmada" cuando hace falta.
 * @property {string} createdAt
 */

export {};
