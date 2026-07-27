import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { darkTheme, lightTheme } from '../src/presentation/theme/tokens';

// TODO sobre expo-router (el sistema de navegación): cada archivo dentro de
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

  return (
    // PaperProvider es obligatorio para poder usar cualquier componente de
    // React Native Paper (Button, TextInput...) en la app; aquí es también
    // donde le pasamos NUESTRO tema (claro u oscuro) para que todos esos
    // componentes usen la paleta "cerveza" en vez de la de Paper por defecto.
    // El `settings.icon` le dice a Paper qué librería de iconos usar
    // (@expo/vector-icons) para cosas como el ojo de mostrar/ocultar contraseña.
    <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      {/* <Stack /> es el navegador: apila pantallas unas encima de otras (como
          las apps normales, con su animación de "entrar/salir"). headerShown:
          false quita la barra superior por defecto de cada pantalla — la
          teníamos activada sin querer al principio y salía fea (te acordarás
          del bug de la barra "(auth)"). */}
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
