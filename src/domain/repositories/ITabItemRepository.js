// Contrato para las bebidas dentro de una cuenta concreta.
// Implementación real: infrastructure/supabase/repositories/SupabaseTabItemRepository.js
/**
 * @typedef {Object} ITabItemRepository
 * @property {(tabId: string) => Promise<TabItem[]>} listByTab - Las bebidas añadidas a una cuenta (para pintar la lista y sumar el total).
 * @property {(params: {tabId: string, catalogItemId: string, priceCentsAtAdd: number, quantity?: number}) => Promise<TabItem>} addItem - Añade una bebida a la cuenta. `priceCentsAtAdd` se le pasa YA calculado desde fuera (el precio actual del catálogo en ese momento) — este repositorio solo guarda, no decide precios.
 * @property {(params: {tabId: string, catalogItemId: string}) => Promise<void>} removeOneUnit - Quita una unidad de esa bebida (la que TÚ añadiste más recientemente), para corregir un error. No hace nada si no tienes ninguna de esa bebida en esta cuenta.
 */

export {};
