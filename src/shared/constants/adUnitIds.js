// ID del bloque de anuncios (banner) real, uno por plataforma — creados en
// AdMob (Aplicaciones → CuentaBirras → Bloques de anuncios → "Banner
// principal"). Ojo: NO es lo mismo que el App ID de app.json (ese lleva
// "~", este lleva "/" antes del número final).
//
// OJO al probar en real: al no ser ya IDs de prueba, cualquier toque
// accidental en el propio anuncio mientras se prueba la app cuenta como
// "actividad no válida" para AdMob (ver condiciones de AdSense, sección
// 5-6) — evitar tocarlo aposta, solo mirar que aparece y que el hueco
// reservado se ve bien.
import { Platform } from 'react-native';

const REAL_BANNER_AD_UNIT_ID = {
  android: 'ca-app-pub-8850172965752172/7752398866',
  ios: 'ca-app-pub-8850172965752172/7928226901',
};

export const BANNER_AD_UNIT_ID = Platform.select(REAL_BANNER_AD_UNIT_ID);
