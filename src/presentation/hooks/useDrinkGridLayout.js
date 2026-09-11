// Calcula el tamaño de las tarjetas de la rejilla de iconos de AddDrinkModal.
//
// En vertical la rejilla tiene que caber en 4 columnas — por eso el tamaño
// de cada tarjeta no es un número fijo, se calcula a partir del ancho real
// de pantalla (ver modal.margin/padding en el componente, restados aquí para
// que el cálculo cuadre con el hueco disponible de verdad). En horizontal NO
// se reutilizan esas mismas 4 columnas (se verían gigantes, el ancho es
// mucho mayor): se mantiene el tamaño de tarjeta de vertical y se calculan
// más columnas para llenar el hueco, en vez de estirar 4 más grandes.
const GRID_COLUMNS = 4;
const GRID_GAP = 8;
// margin + padding FIJOS del modal, a cada lado — el hueco de más por el
// área segura (insets.left/right, los botones del sistema en horizontal)
// se suma aparte, porque varía según el móvil.
const MODAL_BASE_INSET = 2 * (24 + 20);

export function useDrinkGridLayout({ windowWidth, windowHeight, insets }) {
  // El lado CORTO del móvil es el mismo gire como gire (es su ancho real en
  // vertical) — se usa como referencia para el tamaño "normal" de tarjeta,
  // en vez del ancho de pantalla actual, que en horizontal es el lado largo
  // y haría las tarjetas enormes si se repartiera igual en solo 4 columnas.
  const shortSide = Math.min(windowWidth, windowHeight);
  const referenceTileWidth =
    (shortSide - MODAL_BASE_INSET - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  // Con el tamaño de tarjeta ya fijado (referenceTileWidth), se calculan
  // cuántas caben en el ancho REAL disponible ahora mismo — 4 en vertical
  // (coincide con GRID_COLUMNS, sin cambios respecto a antes) y más en
  // horizontal, en vez de estirar siempre las mismas 4.
  const availableWidth = windowWidth - MODAL_BASE_INSET - insets.left - insets.right;
  const columns = Math.max(
    GRID_COLUMNS,
    Math.floor((availableWidth + GRID_GAP) / (referenceTileWidth + GRID_GAP)),
  );
  const tileWidth = (availableWidth - GRID_GAP * (columns - 1)) / columns;
  const imageAreaSize = { width: tileWidth - 8, height: (tileWidth - 8) * 1.5 };
  const tileBase = { width: imageAreaSize.width / 1.3, height: imageAreaSize.height / 1.3 };

  return { tileWidth, imageAreaSize, tileBase };
}

export { GRID_GAP };
