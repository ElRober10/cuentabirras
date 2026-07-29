// Categoría de cada bebida/comida: solo decide el icono GENÉRICO de
// respaldo para cuando no se elige ninguno de los 12 iconos concretos (ver
// drinkIcons.js) — es decir, cuando se elige "Otro". Vive en shared/ porque
// la usan las dos capas: la validación del formulario (application/) y el
// dibujado de los iconos (presentation/).
//
// Solo dos categorías por ahora: "bebida" (la principal, la única usable de
// verdad todavía) y "comida", que se deja preparada para una versión
// futura de la app.
export const DRINK_CATEGORIES = [
  { value: 'bebida', label: 'Bebida', icon: 'glass-mug-variant', defaultColor: '#D9A441' },
  { value: 'comida', label: 'Comida', icon: 'food', defaultColor: '#D2A679' },
];

export function getDrinkCategory(value) {
  return DRINK_CATEGORIES.find((category) => category.value === value) ?? DRINK_CATEGORIES[0];
}

// Paleta de colores para afinar el color de una bebida (sobre todo útil en
// "refresco": naranja, limón, té, transparente... todas comparten la misma
// forma de botella pero con un color de líquido distinto).
export const DRINK_COLOR_PALETTE = [
  { label: 'Naranja', value: '#FFA500' },
  { label: 'Amarillo (limón)', value: '#FFD700' },
  { label: 'Marrón (té/nestea)', value: '#6F4E37' },
  { label: 'Naranja claro (isotónico)', value: '#FFB877' },
  { label: 'Transparente (tónica/lima-limón)', value: '#BEE3EC' },
  { label: 'Rojo', value: '#E53935' },
  { label: 'Verde', value: '#43A047' },
  { label: 'Rosa', value: '#EC407A' },
  { label: 'Morado', value: '#8E44AD' },
  { label: 'Azul', value: '#2196F3' },
  { label: 'Marrón oscuro', value: '#4A2E00' },
  { label: 'Beige', value: '#D2A679' },
  { label: 'Gris', value: '#888888' },
];
