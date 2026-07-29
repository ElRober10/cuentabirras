// Una fila del "catálogo de precios" de un bar concreto (una bebida + su
// precio). Es colaborativo: cualquier usuario que vea el bar puede añadir o
// editar precios de este catálogo (a diferencia de BarPhoto.js, que es privado).
/**
 * @typedef {Object} CatalogItem
 * @property {string} id
 * @property {string} barId - a qué bar pertenece esta bebida/precio
 * @property {string} name
 * @property {string} category - una de las categorías de shared/constants/drinkCategories.js (determina la FORMA del icono)
 * @property {string} color - código hexadecimal (ej. "#FFA500"), el COLOR del icono — normalmente el de la categoría, pero se puede personalizar (útil en "refresco": naranja, limón, té... misma forma, distinto color)
 * @property {number} priceCents - El precio en CÉNTIMOS (250 = 2,50€), nunca en euros con decimales, para evitar errores de redondeo al sumar dinero. La conversión euros↔céntimos se hace solo en el formulario, no aquí.
 * @property {string} currency
 * @property {string|null} updatedBy - id de quién puso/cambió el precio por última vez
 * @property {string} updatedAt
 */

export {};
