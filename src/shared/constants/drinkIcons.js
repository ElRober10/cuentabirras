// Los 12 iconos "de verdad" (ilustraciones, no iconos genéricos) que se
// pueden elegir al dar de alta una bebida. Viven en shared/ por el mismo
// motivo que drinkCategories.js: los usan tanto el formulario (elegir
// icono) como las tarjetas (pintarlo).
//
// Si una bebida NO tiene ninguno de estos iconos elegido (`item.icon` es
// null — por ejemplo, bebidas creadas antes de que existiera esta lista, o
// alguien elige "Otro"), se sigue usando el icono genérico de
// drinkCategories.js como respaldo.
//
// `category` es la misma "bebida"/"comida" de drinkCategories.js — decide
// en qué pestaña del selector de iconos aparece cada uno. De momento todos
// son de bebida; el día que haya iconos de comida, solo hay que añadirlos
// aquí con category: 'comida'.
//
// `alcohol` y `ml` son informativos (para más adelante: filtros,
// estadísticas...). `scale` es un multiplicador de tamaño (1 = tamaño
// base) para que el icono se pinte más grande o más pequeño según el
// tamaño REAL de la bebida — así un botellín no ocupa lo mismo que una
// jarra grande. Valores orientativos de partida, a corregir.
export const DRINK_ICONS = [
  {
    value: 'botellin',
    label: 'Botellín',
    category: 'bebida',
    alcohol: true,
    ml: 250,
    scale: 0.8,
    image: require('../../../assets/drinks/botellin.png'),
  },
  {
    value: 'tercio',
    label: 'Tercio',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    image: require('../../../assets/drinks/tercio.png'),
  },
  {
    value: 'tercio-alhambra',
    label: 'Tercio Alhambra',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    image: require('../../../assets/drinks/tercio-alhambra.png'),
  },
  {
    value: 'tercio-1906',
    label: 'Tercio 1906',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    image: require('../../../assets/drinks/tercio-1906.png'),
  },
  {
    value: 'cana',
    label: 'Caña',
    category: 'bebida',
    alcohol: true,
    ml: 200,
    scale: 0.75,
    image: require('../../../assets/drinks/cana.png'),
  },
  {
    value: 'jarra',
    label: 'Jarra',
    category: 'bebida',
    alcohol: true,
    ml: 300,
    scale: 0.95,
    image: require('../../../assets/drinks/jarra.png'),
  },
  {
    value: 'jarra-grande',
    label: 'Jarra grande',
    category: 'bebida',
    alcohol: true,
    ml: 1000,
    scale: 1.25,
    image: require('../../../assets/drinks/jarra-grande.png'),
  },
  {
    value: 'sin-alcohol',
    label: 'Sin alcohol',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.85,
    image: require('../../../assets/drinks/sin-alcohol.png'),
  },
  {
    value: 'sin-alcohol-00',
    label: 'Sin alcohol 0,0',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.85,
    image: require('../../../assets/drinks/sin-alcohol-00.jpg'),
  },
  {
    value: 'coca-cola',
    label: 'Coca-Cola',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/coca-cola.png'),
  },
  {
    value: 'coca-cola-zero',
    label: 'Coca-Cola Zero',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/coca-cola-zero.png'),
  },
  {
    value: 'coca-cola-light',
    label: 'Coca-Cola Light',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/coca-cola-light.png'),
  },
  {
    value: 'fanta-naranja',
    label: 'Fanta Naranja',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/fanta-naranja.png'),
  },
];

export function getDrinkIcon(value) {
  return DRINK_ICONS.find((icon) => icon.value === value) ?? null;
}
