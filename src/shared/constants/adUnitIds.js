// ID de la unidad de anuncios (banner) — TODAVÍA es el de pruebas de Google
// (TestIds.BANNER, de react-native-google-mobile-ads): siempre devuelve un
// anuncio de prueba, sin importar cuenta ni país, y evita que un toque
// accidental mientras probamos cuente como "actividad no válida" en la
// cuenta real de AdMob (algo que Google penaliza de verdad, hasta con el
// cierre de la cuenta — ver condiciones de AdSense, sección 5-6).
//
// ANTES DE PUBLICAR EN LAS TIENDAS: hay que crear el bloque de anuncios de
// verdad en AdMob (Aplicaciones → CuentaBirras → Bloques de anuncios →
// Añadir bloque de anuncios → Banner) y sustituir esto por el ID real
// (formato "ca-app-pub-8850172965752172/XXXXXXXXXX", con barra "/" antes
// del número final, no "~" como el App ID de app.json).
import { TestIds } from 'react-native-google-mobile-ads';

export const BANNER_AD_UNIT_ID = TestIds.BANNER;
