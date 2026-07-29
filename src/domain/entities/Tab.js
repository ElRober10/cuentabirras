// Una "cuenta" (tab) abierta o cerrada en un bar concreto — lo que en la vida
// real sería tu comanda/cuenta de esa noche.
/**
 * @typedef {Object} Tab
 * @property {string} id
 * @property {string} barId
 * @property {'open'|'closed'} status - Solo se pueden añadir bebidas mientras está 'open'; una vez 'closed' queda como histórico fijo.
 * @property {'per_consumer'|'equal_split'} splitMode - Cómo se reparte el gasto si hay varias personas en la cuenta. Todavía no se usa de verdad (eso es de la Fase 3, cuando se puedan compartir cuentas), pero ya está en la base de datos para no tener que rediseñar la tabla más adelante.
 * @property {string} createdBy - quién abrió la cuenta
 * @property {string} createdAt
 * @property {string|null} closedAt - cuándo se cerró (null mientras sigue abierta)
 */

export {};
