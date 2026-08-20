import { Platform } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// React Native Paper sigue el sistema de diseño "Material Design 3" (MD3) de
// Google: define un theme con MUCHOS colores con nombres fijos (primary,
// onPrimary, background, surface...) y todos sus componentes (Button,
// TextInput, Switch...) los usan automáticamente. No tocamos el theme
// entero desde cero: partimos del tema por defecto de Paper
// (MD3LightTheme/MD3DarkTheme) y solo sobreescribimos los colores que nos
// interesan para darle nuestra identidad ("cerveza").
//
// Truco de los nombres "onX": `onPrimary` es el color que debe tener el
// TEXTO que va ENCIMA de un fondo `primary`, para que se lea bien. Por eso
// onPrimary es blanco en el tema claro (letra blanca sobre botón ámbar) y
// marrón oscuro en el tema oscuro (letra oscura sobre botón ámbar claro).
const amber = {
  amber10: '#FFF8E9', // ámbar casi blanco
  amber30: '#FFE0A3', // ámbar claro (dorado)
  amber50: '#F2A900', // ámbar medio
  amber60: '#D98E00', // ámbar algo más oscuro (color principal en modo claro)
  amber80: '#7A4B00', // marrón cerveza
  amber90: '#4A2E00', // marrón muy oscuro
  foam: '#FFF6E5', // "espuma de cerveza": fondo del tema claro
  stout: '#231609', // "cerveza negra": fondo del tema oscuro
};

// configureFonts con un único objeto "config" (en vez de uno por variante)
// coge TODO el catálogo tipográfico de Material Design 3 (headlineLarge,
// titleMedium, bodySmall...) y le cambia la fuente a todos a la vez,
// conservando el tamaño/grosor propio de cada uno — así "Metal Mania" se
// aplica en toda la app (títulos, botones...) sin tener que ir variante por
// variante.
const rawFonts = configureFonts({ config: { fontFamily: 'MetalMania_400Regular' } });

// +2px en el tamaño de TODAS las variantes tipográficas (títulos, cuerpo,
// etiquetas...) sin tocar cada pantalla una por una.
const baseFonts = Object.fromEntries(
  Object.entries(rawFonts).map(([variant, style]) => [
    variant,
    { ...style, fontSize: style.fontSize + 2 },
  ])
);

// Metal Mania es decorativa y casi todo mayúsculas — perfecta para títulos,
// pero en los campos de texto (lo que escribes, y su etiqueta) hace
// indistinguibles las mayúsculas de las minúsculas. React Native Paper
// pinta el texto de CUALQUIER TextInput con la variante "bodyLarge" (y su
// etiqueta flotante con "bodyLarge"/"bodySmall" según esté enfocada o no —
// ver TextInputFlat.js/InputLabel.js de la librería), así que sobreescribir
// esas 2 variantes a una fuente normal del sistema arregla TODOS los
// campos de la app de una vez, sin tener que tocar cada pantalla.
//
// Ojo: NO se toca "bodyMedium" — HelperText (los mensajes de ayuda/error
// bajo cada campo) la usa como variante por defecto, y se decidió a
// propósito dejarlos en Metal Mania, igual que el resto de texto de la
// app; solo lo que escribes de verdad (y su etiqueta) necesita legibilidad
// de mayúsculas/minúsculas.
const systemFontFamily = Platform.select({ ios: 'System', android: 'sans-serif' });
const fonts = {
  ...baseFonts,
  bodyLarge: { ...baseFonts.bodyLarge, fontFamily: systemFontFamily },
  bodySmall: { ...baseFonts.bodySmall, fontFamily: systemFontFamily },
};

// Tema para cuando el móvil está en modo claro.
export const lightTheme = {
  ...MD3LightTheme, // partimos de todos los valores por defecto de Paper...
  fonts,
  colors: {
    ...MD3LightTheme.colors, // ...y solo sobreescribimos estos:
    primary: amber.amber60, // color principal (botones, switches activados...)
    onPrimary: '#FFFFFF', // texto sobre el color principal
    primaryContainer: amber.amber30,
    onPrimaryContainer: amber.amber90,
    secondary: amber.amber80,
    background: amber.foam, // fondo general de las pantallas
    surface: '#FFFFFF', // fondo de "superficies" (tarjetas, inputs...)
    surfaceVariant: amber.amber10,
  },
};

// Tema para cuando el móvil está en modo oscuro. Mismo patrón, colores
// distintos (más claros los "primary", porque sobre fondo oscuro necesitan
// contraste al revés que en el tema claro).
export const darkTheme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: amber.amber30,
    onPrimary: amber.stout,
    primaryContainer: amber.amber80,
    onPrimaryContainer: amber.amber10,
    secondary: amber.amber50,
    background: amber.stout,
    surface: '#2E1F10',
    surfaceVariant: amber.amber90,
    // Sin esto, Paper usa su rojo de error por defecto de MD3, que es
    // distinto entre modo claro y oscuro (más rosado en oscuro) — el botón
    // de quitar bebidas (TabItemRow.jsx) usa theme.colors.error como color
    // del icono, y se veía de un rojo distinto según el modo. Mismo rojo
    // que el tema claro en los dos, a propósito.
    error: MD3LightTheme.colors.error,
  },
};

// ¿Quién decide cuál de los dos se usa? app/_layout.jsx, mirando el ajuste
// de tema (claro/oscuro) del propio sistema operativo del móvil.
