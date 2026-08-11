import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { checkVersion } from 'react-native-check-version';

// Comprueba UNA VEZ por apertura de la app si hay una versión más nueva
// publicada en la tienda (Play Store/App Store) que la instalada —
// react-native-check-version mira la propia ficha pública de la tienda
// (sin necesitar ninguna clave ni configuración nuestra), así que el
// enlace de "Actualizar" (result.url) siempre apunta solo a la versión
// real que haya publicada en cada momento, sin tener que tocar código cada
// vez que se publique una actualización nueva.
//
// Ni Android ni iOS dejan que una app se descargue/instale sola a sí misma
// (por seguridad) — por eso esto solo AVISA; el usuario decide si quiere
// ir a la tienda a actualizar.
export function useAppUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const bundleId = Platform.select({
      android: Constants.expoConfig?.android?.package,
      ios: Constants.expoConfig?.ios?.bundleIdentifier,
    });

    checkVersion({ bundleId, currentVersion: Constants.expoConfig?.version })
      .then((result) => {
        if (!cancelled && result.needsUpdate) setUpdateInfo(result);
      })
      .catch((error) => {
        // "Best effort": antes de publicar la app (todavía no hay ficha en
        // la tienda) o sin conexión, esto falla — nunca debe romper el
        // arranque de la app por esto.
        console.warn('No se pudo comprobar si hay una actualización:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return updateInfo;
}
