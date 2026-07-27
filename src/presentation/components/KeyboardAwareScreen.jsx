import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

// Envoltorio que usan las pantallas de login/registro para que el teclado
// del móvil no tape el campo que estás rellenando (era otra de las cosas
// que pediste). Se usa así: <KeyboardAwareScreen>...tu formulario...</KeyboardAwareScreen>
export function KeyboardAwareScreen({ children, contentContainerStyle }) {
  const theme = useTheme();

  return (
    // KeyboardAvoidingView "empuja" su contenido hacia arriba cuando aparece
    // el teclado, para que no lo tape. iOS y Android se comportan distinto
    // por eso, así que el `behavior` cambia según la plataforma
    // (Platform.OS): en iOS funciona mejor 'padding', en Android 'height'.
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ScrollView permite hacer scroll si el formulario no cabe entero en
          pantalla (por ejemplo, con el teclado abierto ocupando media
          pantalla). keyboardShouldPersistTaps="handled" es para que, si
          tocas un botón mientras el teclado está abierto, el toque SÍ se
          registre en vez de solo cerrar el teclado (comportamiento por
          defecto de RN que suele sorprender). */}
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
