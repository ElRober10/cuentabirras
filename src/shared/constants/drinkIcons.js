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
//
// `stages` (opcional): la "escalada de borrachera". Cada bebida alcohólica
// va cambiando de dibujo según cuántas llevas de ESA bebida en la cuenta:
// normal (`image`, de siempre) → `images[0]` (contentillo) → `images[1]`
// (muy borracho) → `images[2]` (vomitando, se queda así de ahí en
// adelante). `every` marca cada cuántas unidades se sube un nivel. Usa
// `getUnitImage(icon, unitNumber)` para pintar la unidad correcta.
//
// `aliases` (opcional): palabras extra por las que el buscador del selector
// (AddDrinkModal) debe encontrar esta bebida, además de por `label`. Por
// ejemplo, todo lo que es un tipo de cerveza lleva `aliases: ['cerveza']`
// para que buscar "cerveza" saque botellín, cañas, jarras, tercios y las
// sin alcohol juntas, aunque ninguna se llame literalmente "cerveza".
export const DRINK_ICONS = [
  // --- Cervezas ---
  {
    value: 'botellin',
    label: 'Botellín',
    category: 'bebida',
    alcohol: true,
    ml: 250,
    scale: 0.8,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/botellin.png'),
    stages: {
      every: 5,
      images: [
        require('../../../assets/drinks/botellin-s2.png'),
        require('../../../assets/drinks/botellin-s3.png'),
        require('../../../assets/drinks/botellin-s4.png'),
      ],
    },
  },
  {
    value: 'tercio',
    label: 'Tercio',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/tercio.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/tercio-s2.png'),
        require('../../../assets/drinks/tercio-s3.png'),
        require('../../../assets/drinks/tercio-s4.png'),
      ],
    },
  },
  {
    value: 'tercio-alhambra',
    label: 'Tercio Alhambra',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/tercio-alhambra.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/tercio-alhambra-s2.png'),
        require('../../../assets/drinks/tercio-alhambra-s3.png'),
        require('../../../assets/drinks/tercio-alhambra-s4.png'),
      ],
    },
  },
  {
    value: 'tercio-1906',
    label: 'Tercio 1906',
    category: 'bebida',
    alcohol: true,
    ml: 330,
    scale: 0.9,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/tercio-1906.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/tercio-1906-s2.png'),
        require('../../../assets/drinks/tercio-1906-s3.png'),
        require('../../../assets/drinks/tercio-1906-s4.png'),
      ],
    },
  },
  {
    value: 'cana',
    label: 'Caña',
    category: 'bebida',
    alcohol: true,
    ml: 200,
    scale: 0.75,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/cana.png'),
    stages: {
      every: 5,
      images: [
        require('../../../assets/drinks/cana-s2.png'),
        require('../../../assets/drinks/cana-s3.png'),
        require('../../../assets/drinks/cana-s4.png'),
      ],
    },
  },
  {
    value: 'jarra',
    label: 'Jarra',
    category: 'bebida',
    alcohol: true,
    ml: 300,
    scale: 0.95,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/jarra.png'),
  },
  {
    value: 'jarra-grande',
    label: 'Jarra grande',
    category: 'bebida',
    alcohol: true,
    ml: 1000,
    scale: 1.25,
    aliases: ['cerveza'],
    image: require('../../../assets/drinks/jarra-grande.png'),
  },
  {
    value: 'sin-alcohol',
    label: 'Sin alcohol',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.85,
    aliases: ['cerveza', 'sin alcohol'],
    image: require('../../../assets/drinks/sin-alcohol.png'),
  },
  {
    value: 'sin-alcohol-00',
    label: 'Sin alcohol 0,0',
    category: 'bebida',
    alcohol: false,
    ml: 250,
    scale: 0.85,
    aliases: ['cerveza', 'sin alcohol'],
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
  {
    value: 'zumo',
    label: 'Zumo',
    category: 'bebida',
    alcohol: false,
    ml: 330,
    scale: 0.85,
    image: require('../../../assets/drinks/zumo.png'),
  },

  // --- Agua ---
  {
    value: 'botella-agua-pequena',
    label: 'Botella de agua pequeña',
    category: 'bebida',
    alcohol: false,
    ml: 500,
    scale: 0.85,
    image: require('../../../assets/drinks/botella-agua-pequeña.png'),
  },
  {
    value: 'botella-agua-grande',
    label: 'Botella de agua grande',
    category: 'bebida',
    alcohol: false,
    ml: 1500,
    scale: 1.1,
    image: require('../../../assets/drinks/botella-agua-grande.png'),
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

  // --- Vinos y batidos ---
  {
    value: 'vino-tinto',
    label: 'Vino tinto',
    category: 'bebida',
    alcohol: true,
    ml: 150,
    scale: 0.85,
    image: require('../../../assets/drinks/vino-tinto.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/vino-tinto-s2.png'),
        require('../../../assets/drinks/vino-tinto-s3.png'),
        require('../../../assets/drinks/vino-tinto-s4.png'),
      ],
    },
  },
  {
    value: 'vino-blanco',
    label: 'Vino blanco',
    category: 'bebida',
    alcohol: true,
    ml: 150,
    scale: 0.85,
    image: require('../../../assets/drinks/vino-blanco.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/vino-blanco-s2.png'),
        require('../../../assets/drinks/vino-blanco-s3.png'),
        require('../../../assets/drinks/vino-blanco-s4.png'),
      ],
    },
  },
  {
    value: 'tinto-verano',
    label: 'Tinto de verano',
    category: 'bebida',
    alcohol: true,
    ml: 200,
    scale: 0.9,
    image: require('../../../assets/drinks/tinto-verano.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/tinto-verano-s2.png'),
        require('../../../assets/drinks/tinto-verano-s3.png'),
        require('../../../assets/drinks/tinto-verano-s4.png'),
      ],
    },
  },
  {
    value: 'batido',
    label: 'Batido',
    category: 'bebida',
    alcohol: false,
    ml: 300,
    scale: 0.85,
    image: require('../../../assets/drinks/batido.png'),
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
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/copa-s2.png'),
        require('../../../assets/drinks/copa-s3.png'),
        require('../../../assets/drinks/copa-s4.png'),
      ],
    },
  },
  {
    value: 'copa-premium',
    label: 'Copa Premium',
    category: 'bebida',
    alcohol: true,
    ml: 500,
    scale: 1,
    image: require('../../../assets/drinks/copa-premiun-1.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/copa-premium-s2.png'),
        require('../../../assets/drinks/copa-premium-s3.png'),
        require('../../../assets/drinks/copa-premium-s4.png'),
      ],
    },
  },
  {
    value: 'copa-premium-2',
    label: 'Copa Super Premium',
    category: 'bebida',
    alcohol: true,
    ml: 500,
    scale: 1,
    image: require('../../../assets/drinks/copa-premium-2.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/copa-premium-2-s2.png'),
        require('../../../assets/drinks/copa-premium-2-s3.png'),
        require('../../../assets/drinks/copa-premium-2-s4.png'),
      ],
    },
  },
  {
    value: 'chupitos',
    label: 'Chupito',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/chupitos.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/chupitos-s2.png'),
        require('../../../assets/drinks/chupitos-s3.png'),
        require('../../../assets/drinks/chupitos-s4.png'),
      ],
    },
  },
  {
    value: 'tequifresa',
    label: 'Tequifresa',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/tequifresa.png'),
    stages: {
      every: 3,
      images: [
        require('../../../assets/drinks/tequifresa-s2.png'),
        require('../../../assets/drinks/tequifresa-s3.png'),
        require('../../../assets/drinks/tequifresa-s4.png'),
      ],
    },
  },
  {
    value: 'crema-orujo',
    label: 'Crema de Orujo',
    category: 'bebida',
    alcohol: true,
    ml: 40,
    scale: 0.5,
    image: require('../../../assets/drinks/crema-orujo.png'),
    stages: {
      every: 4,
      images: [
        require('../../../assets/drinks/crema-orujo-s2.png'),
        require('../../../assets/drinks/crema-orujo-s3.png'),
        require('../../../assets/drinks/crema-orujo-s4.png'),
      ],
    },
  },
];

// Icono "genérico": se pinta cuando una bebida NO tiene ninguno de los
// iconos de arriba asignado (`item.icon === null` — nace así al crearla con
// "Otro", nombre a mano). A propósito NO vive dentro de DRINK_ICONS: si
// estuviera ahí, aparecería como una tarjeta más, seleccionable, tanto en
// el selector de "Bebida nueva" como en la lista de precios del bar — y no
// es una bebida de verdad que se pueda elegir para crear, es solo el
// dibujo de respaldo de una que ya existe. Por eso solo se usa desde fuera
// (TabItemRow, AddDrinkModal al mostrar una bebida "Otro" ya creada,
// settings.jsx), nunca listado junto a las demás.
export const GENERIC_DRINK_ICON_IMAGE = require('../../../assets/drinks/generica.png');

export function getDrinkIcon(value) {
  return DRINK_ICONS.find((icon) => icon.value === value) ?? null;
}

// Dado un icono (de getDrinkIcon) y el número de unidad dentro de la cuenta
// (1 = la primera de esa bebida, 2 = la segunda...), devuelve la imagen que
// toca pintar según la escalada de `stages`. Si el icono no tiene `stages`
// (bebida sin alcohol, o bebida alcohólica cuyos dibujos aún no se han
// subido), siempre devuelve la imagen normal de siempre.
export function getUnitImage(icon, unitNumber) {
  if (!icon.stages) return icon.image;
  const level = Math.floor((unitNumber - 1) / icon.stages.every);
  if (level <= 0) return icon.image;
  // Nivel 1 → images[0] (contentillo), nivel 2 → images[1] (borracho), y de
  // ahí en adelante se queda fijo en images[2] (vomitando).
  return icon.stages.images[Math.min(level, icon.stages.images.length) - 1];
}
