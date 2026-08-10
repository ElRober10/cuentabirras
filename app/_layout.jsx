import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MetalMania_400Regular, useFonts } from '@expo-google-fonts/metal-mania';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdBanner } from '../src/presentation/components/AdBanner';
import { queryClient } from '../src/config/queryClient';
import { darkTheme, lightTheme } from '../src/presentation/theme/tokens';

// Nota sobre expo-router (el sistema de navegación): cada archivo dentro de
// `app/` es una PANTALLA, y su ruta en el sistema de archivos ES la URL de
// esa pantalla (como en Next.js). Un archivo llamado `_layout.jsx` no es una
// pantalla en sí, es el "molde" que envuelve a todas las pantallas de su
// misma carpeta (y de las subcarpetas). Este de aquí, en la raíz de `app/`,
// envuelve TODA la app — es el primer código que se ejecuta.
export default function RootLayout() {
  // useColorScheme() de React Native te dice si el sistema operativo del
  // móvil está en modo claro u oscuro AHORA MISMO, y se actualiza solo si el
  // usuario lo cambia mientras la app está abierta.
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Las fuentes personalizadas (aquí, "Metal Mania" para el logo) no vienen
  // instaladas en el sistema operativo: hay que cargarlas como un archivo
  // más, de forma asíncrona, antes de poder usarlas. Mientras `fontsLoaded`
  // es false, no dibujamos nada (evita ver el texto un instante con la
  // fuente por defecto y que luego "salte" a la definitiva).
  const [fontsLoaded] = useFonts({ MetalMania_400Regular });

  if (!fontsLoaded) {
    return null;
  }

  return (
    // QueryClientProvider hace que cualquier pantalla de la app pueda usar
    // react-query (useQuery/useMutation) para pedir y cachear datos de
    // Supabase (bares, catálogo, cuentas...), usando la única instancia de
    // queryClient que creamos en src/config/queryClient.js.
    // SafeAreaProvider mide el "área segura" de cada dispositivo (la parte
    // de pantalla que NO tapan la barra de notificaciones, el notch, ni los
    // botones de gestos de abajo). Sin esto, useSafeAreaInsets() (usado en
    // la pantalla de inicio para no pegar el logo a la barra de arriba) no
    // sabría cuánto espacio dejar en cada móvil.
    <SafeAreaProvider>
      {/* QueryClientProvider hace que cualquier pantalla de la app pueda usar
          react-query (useQuery/useMutation) para pedir y cachear datos de
          Supabase (bares, catálogo, cuentas...), usando la única instancia de
          queryClient que creamos en src/config/queryClient.js. */}
      <QueryClientProvider client={queryClient}>
        {/* PaperProvider es obligatorio para poder usar cualquier componente de
            React Native Paper (Button, TextInput...) en la app; aquí es también
            donde le pasamos NUESTRO tema (claro u oscuro) para que todos esos
            componentes usen la paleta "cerveza" en vez de la de Paper por defecto.
            El `settings.icon` le dice a Paper qué librería de iconos usar
            (@expo/vector-icons) para cosas como el ojo de mostrar/ocultar contraseña. */}
        <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
          {/* <Stack /> es el navegador: apila pantallas unas encima de otras (como
              las apps normales, con su animación de "entrar/salir"). headerShown:
              false quita la barra superior por defecto de cada pantalla — la
              teníamos activada sin querer al principio y salía fea (te acordarás
              del bug de la barra "(auth)"). */}
          {/* AdBanner vive FUERA del <Stack/>, como hermano suyo dentro de
              esta columna flex — así el hueco de abajo se reserva en TODAS
              las pantallas de golpe (el Stack solo ocupa lo que le queda),
              sin tener que tocar cada pantalla una a una. */}
          <View style={styles.appContainer}>
            <View style={styles.screenArea}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
            <AdBanner />
          </View>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  screenArea: {
    flex: 1,
  },
});
