import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BANNER_AD_UNIT_ID } from '../../shared/constants/adUnitIds';

// Altura fija del banner (BannerAdSize.BANNER = 320x50dp, el tamaño
// "clásico" de AdMob) — se eligió sobre el adaptativo recomendado por
// Google a propósito: el usuario pidió un hueco de abajo RESERVADO y
// predecible en todas las pantallas, y el adaptativo cambia de alto según
// el dispositivo, lo que complicaría reservar ese margen de forma fija.
const BANNER_HEIGHT = 50;

// Mismo patrón que ExpoPushNotificationRepository.js: react-native-google-mobile-ads
// es un módulo nativo que no existe en Expo Go — ni siquiera se puede
// importar arriba del fichero sin tirar la app entera. Por eso aquí NUNCA
// hay un `import` estático de esa librería: solo un `require(...)` perezoso,
// dentro de un efecto, y solo cuando NO estamos en Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Banner de anuncios fijo, pensado para vivir en app/_layout.jsx (fuera del
// <Stack/>, como hermano suyo) — así se ve en TODAS las pantallas de la app
// sin tener que tocar cada pantalla una a una. El hueco de abajo se reserva
// SIEMPRE, cargue el anuncio o no (sin conexión, sin inventario disponible,
// Expo Go...), para que el resto de la interfaz nunca "salte".
export function AdBanner() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  // null mientras carga o si no está disponible (Expo Go, error de
  // inicialización...); el módulo ya cargado en cuanto está listo — se
  // guarda en estado (no en un ref) porque también hace falta durante el
  // render, para pintar <BannerAd>.
  const [adsModule, setAdsModule] = useState(null);
  // Mensaje de diagnóstico visible mientras probamos la integración — no es
  // para el usuario final, es para poder ver qué ha fallado sin necesitar
  // conectar el móvil a un ordenador a sacar logs. Se puede quitar cuando
  // ya sepamos que todo funciona bien de verdad.
  const [debugMessage, setDebugMessage] = useState(() =>
    isExpoGo ? 'Expo Go: los anuncios no funcionan aquí, hace falta un build.' : null,
  );

  useEffect(() => {
    if (isExpoGo) return undefined;

    let cancelled = false;

    async function setup() {
      try {
        const googleMobileAds = require('react-native-google-mobile-ads');

        // Flujo de consentimiento GDPR (obligatorio en la UE/Reino Unido,
        // exigido también por las propias condiciones de AdSense, sección
        // 10): pregunta a Google si hace falta pedir consentimiento a este
        // usuario concreto y, si es así, enseña el formulario oficial —
        // todo esto antes de pedir ningún anuncio.
        await googleMobileAds.AdsConsent.requestInfoUpdate();
        await googleMobileAds.AdsConsent.loadAndShowConsentFormIfRequired();

        await googleMobileAds.default().initialize();

        if (!cancelled) {
          setAdsModule(googleMobileAds);
          setDebugMessage(null);
        }
      } catch (error) {
        // "Best effort": sin anuncios en este dispositivo/sesión, pero
        // nunca debe romper el resto de la app.
        console.warn('No se pudo inicializar el SDK de anuncios:', error);
        if (!cancelled) setDebugMessage(`Init falló: ${error?.message ?? String(error)}`);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  const wrapperHeight = BANNER_HEIGHT + insets.bottom;

  if (!adsModule) {
    return (
      <View style={[styles.wrapper, { height: wrapperHeight, backgroundColor: theme.colors.surface }]}>
        {debugMessage ? (
          <Text style={styles.debugText} numberOfLines={2}>
            {debugMessage}
          </Text>
        ) : null}
      </View>
    );
  }

  const { BannerAd, BannerAdSize } = adsModule;

  return (
    <View
      style={[
        styles.wrapper,
        { height: wrapperHeight, paddingBottom: insets.bottom, backgroundColor: theme.colors.surface },
      ]}
    >
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => {
          console.warn('El anuncio no se pudo cargar:', error);
          setDebugMessage(`Anuncio falló: ${error?.message ?? String(error)}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugText: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 8,
    color: '#b00020',
  },
});
