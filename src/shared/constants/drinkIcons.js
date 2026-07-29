// Los iconos "de verdad" (ilustraciones, no iconos genéricos) que se
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
  // --- Cervezas ---
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
    image: require('../../../assets/drinks/sin-alcohol-00.png'),
  },

  // --- Refrescos ---
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
    value: 'coca-cola-zero-zero',
    label: 'Coca-Cola Zero Zero',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/coca-cola-zero-zero.png'),
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
  {
    value: 'fanta-limon',
    label: 'Fanta Limón',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/fanta-limon.png'),
  },
  {
    value: 'sprite',
    label: 'Sprite',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/sprite.png'),
  },
  {
    value: 'tonica',
    label: 'Tónica',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.8,
    image: require('../../../assets/drinks/tonica.png'),
  },
  {
    value: 'nestea',
    label: 'Nestea',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/nestea.png'),
  },
  {
    value: 'nestea-maracuya',
    label: 'Nestea Maracuyá',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/nestea-maracuya.png'),
  },
  {
    value: 'aquarius-naranja',
    label: 'Aquarius Naranja',
    category: 'bebida',
    alcohol: false,
    ml: 500,
    scale: 0.9,
    image: require('../../../assets/drinks/aquarius-naranja.png'),
  },
  {
    value: 'aquarius-limon',
    label: 'Aquarius Limón',
    category: 'bebida',
    alcohol: false,
    ml: 500,
    scale: 0.9,
    image: require('../../../assets/drinks/aquarius-limon.png'),
  },
  {
    value: 'red-bull',
    label: 'Red Bull',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.75,
    image: require('../../../assets/drinks/red-bull.png'),
  },

  // --- Café y chocolate ---
  {
    value: 'cafe',
    label: 'Café',
    category: 'bebida',
    alcohol: false,
    ml: 50,
    scale: 0.6,
    image: require('../../../assets/drinks/cafe.png'),
  },
  {
    value: 'cola-cao',
    label: 'ColaCao',
    category: 'bebida',
    alcohol: false,
    ml: 200,
    scale: 0.65,
    image: require('../../../assets/drinks/cola-cao.png'),
  },
  {
    value: 'nesquik',
    label: 'Nesquik',
    category: 'bebida',
    alcohol: false,
    ml: 200,
    scale: 0.65,
    image: require('../../../assets/drinks/nesquik.png'),
  },

  // --- Copas y chupitos --- (3 niveles de copa por PRECIO, no por sabor —
  // para no tener que meter una marca de licor distinta por cada bar)
  {
    value: 'copa',
    label: 'Copa',
    category: 'bebida',
    alcohol: true,
    ml: 500,
    scale: 1,
    image: require('../../../assets/drinks/copa.png'),
  },
  {
    value: 'copa-premium',
    label: 'Copa Premium',
    category: 'bebida',
    alcohol: true,
    ml: 500,
    scale: 1,
    image: require('../../../assets/drinks/copa-premiun-1.png'),
  },
  {
    value: 'copa-premium-2',
    label: 'Copa Super Premium',
    category: 'bebida',
    alcohol: true,
    ml: 500,
    scale: 1,
    image: require('../../../assets/drinks/copa-premium-2.png'),
  },
  {
    value: 'chupitos',
    label: 'Chupito',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/chupitos.png'),
  },
  {
    value: 'tequifresa',
    label: 'Tequifresa',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/tequifresa.png'),
  },
  {
    value: 'crema-orujo',
    label: 'Crema de Orujo',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/crema-orujo.png'),
  },
];

export function getDrinkIcon(value) {
  return DRINK_ICONS.find((icon) => icon.value === value) ?? null;
}
