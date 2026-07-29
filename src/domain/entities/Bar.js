// Mismo patrón que UserProfile.js: esto es solo documentación (JSDoc), no
// código que se ejecute. Ver ese archivo si quieres el porqué de este truco.
/**
 * @typedef {Object} Bar
 * @property {string} id
 * @property {string} name
 * @property {string|null} address
 * @property {number|null} latitude - Si es null, el bar es "privado": nadie más lo ve (ver migración 0003). No hay un campo aparte "isPublic" a propósito — se deduce de si hay coordenadas o no.
 * @property {number|null} longitude
 * @property {string} createdBy - id del usuario que creó el bar
 * @property {string} createdAt
 */

export {};
