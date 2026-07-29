// Una bebida concreta añadida a una cuenta (Tab). Si pides 2 cañas de golpe,
// eso es UNA fila con quantity=2, no dos filas.
/**
 * @typedef {Object} TabItem
 * @property {string} id
 * @property {string} tabId - a qué cuenta pertenece
 * @property {string} catalogItemId - qué bebida del catálogo del bar es (de ahí se sabe el nombre)
 * @property {string} addedBy - quién la añadió (importante para el reparto "cada uno paga lo suyo" de la Fase 3)
 * @property {number} priceCentsAtAdd - Precio "congelado" en el momento de añadirla: aunque luego cambie el precio en el catálogo del bar, esta cuenta sigue mostrando lo que de verdad se pagó ese día.
 * @property {number} quantity
 * @property {string} createdAt
 */

export {};
