// Contrato para leer/escribir el catálogo de precios de un bar.
// Implementación real: infrastructure/supabase/repositories/SupabaseCatalogRepository.js
/**
 * @typedef {Object} ICatalogRepository
 * @property {(barId: string) => Promise<CatalogItem[]>} listByBar - Todas las bebidas de un bar (para pintar la lista de tarjetas y para elegir al añadir una nueva). `priceCents` puede ser `null` si todavía nadie le ha puesto precio.
 * @property {(params: {barId: string, name: string, category: string, color: string, icon: string|null, priceCents: number|null}) => Promise<CatalogItem>} createItem - Añade una bebida NUEVA al catálogo. `icon` es una de las 12 ilustraciones de drinkIcons.js (o `null` para usar el icono genérico de la categoría). El precio es opcional, se puede dejar en blanco y ponerlo más tarde. Puede fallar si ya existe una con ese mismo nombre en ese bar (la base de datos lo impide con `unique(bar_id, name)`) — quien llame a esto debe comprobar antes si ya existe, para no intentarlo a ciegas.
 * @property {(params: {catalogItemId: string, priceCents: number}) => Promise<CatalogItem>} updatePrice - Pone o corrige el precio de una bebida ya existente en el catálogo (colaborativo: cualquiera que vea el bar puede hacerlo).
 * @property {(barId: string) => Promise<{catalog_item_id: string, my_quantity: number, total_quantity: number}[]>} getPopularity - Cuánto se ha pedido cada bebida de este bar: por ti (`my_quantity`) y por todo el mundo (`total_quantity`), sumando cantidades de todas las cuentas. Se usa para ordenar la lista de tarjetas.
 * @property {() => Promise<{icon: string, my_quantity: number, total_quantity: number}[]>} getIconPopularity - Lo mismo que getPopularity, pero por ICONO (drinkIcons.js) y en TODA la app, no en un bar concreto — se usa para ordenar el selector de iconos del botón +, antes de saber siquiera si esa bebida existe ya en este bar.
 */

export {};
