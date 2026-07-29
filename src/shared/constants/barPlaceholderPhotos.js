// Fotos "genéricas" de bar que se usan como imagen por defecto cuando un
// bar todavía no tiene foto personal tuya puesta. React Native necesita que
// las imágenes locales se referencien con require(...) y una ruta escrita
// literal (no se puede construir la ruta con una variable), así que hay que
// listarlas todas a mano aquí — es el único sitio del proyecto donde hace falta.
export const BAR_PLACEHOLDER_PHOTOS = [
  require('../../../assets/bars/01-bar.jpg'),
  require('../../../assets/bars/02-bar.jpg'),
  require('../../../assets/bars/03-bar.jpg'),
  require('../../../assets/bars/04-bar.jpg'),
  require('../../../assets/bars/05-bar.jpg'),
  require('../../../assets/bars/06-bar.jpg'),
  require('../../../assets/bars/07-bar.jpg'),
  require('../../../assets/bars/08-bar.jpg'),
  require('../../../assets/bars/09-bar.jpg'),
  require('../../../assets/bars/10-bar.jpg'),
];

// Elige SIEMPRE la misma foto para el mismo bar (no una al azar cada vez
// que se pinta la pantalla, que quedaría raro) — se calcula a partir del id
// del bar, así que es estable sin tener que guardar nada en la base de datos.
export function getBarPlaceholderPhoto(barId) {
  if (BAR_PLACEHOLDER_PHOTOS.length === 0) return null;

  let hash = 0;
  for (let i = 0; i < barId.length; i++) {
    hash = (hash + barId.charCodeAt(i)) % BAR_PLACEHOLDER_PHOTOS.length;
  }
  return BAR_PLACEHOLDER_PHOTOS[hash];
}
