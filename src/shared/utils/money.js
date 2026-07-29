// El ÚNICO sitio de toda la app donde se convierte entre "lo que escribe el
// usuario" (euros, con coma) y "lo que se guarda" (céntimos, un entero). Ver
// la discusión en CatalogItem.js sobre por qué priceCents es un entero.

// "2,50" o "2.50" (aceptamos las dos formas, por si el teclado del móvil usa
// punto) → 250. Devuelve null si no es un número válido, para que el
// formulario pueda mostrar un error en vez de guardar cualquier cosa.
export function eurosToCents(input) {
  const normalized = String(input).trim().replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// 250 → "2,50" (para mostrarlo en pantalla).
export function centsToEuros(cents) {
  return (cents / 100).toFixed(2).replace('.', ',');
}
