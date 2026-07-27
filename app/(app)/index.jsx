import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { biometricAuth } from '../../src/infrastructure/auth/biometricAuth';
import { AppButton } from '../../src/presentation/components/AppButton';
import { useAuth } from '../../src/presentation/hooks/useAuth';

// Pantalla de la ruta "/(app)" — la primera que ves una vez logueado y
// desbloqueado. De momento es solo un saludo + el interruptor de biometría
// + cerrar sesión; en la Fase 1 aquí irá la lista de bares.
export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Al entrar en esta pantalla, comprobamos si el móvil soporta biometría y
  // si el usuario ya la tenía activada, para pintar el interruptor en su
  // estado correcto desde el principio (en vez de arrancar siempre en "no").
  useEffect(() => {
    biometricAuth.isSupported().then(setBiometricSupported);
    biometricAuth.isEnabled().then(setBiometricEnabled);
  }, []);

  // Se llama cuando el usuario toca el interruptor. Guarda la preferencia
  // en SecureStore (biometricAuth.setEnabled) y actualiza lo que se ve.
  const toggleBiometric = useCallback(async (value) => {
    try {
      await biometricAuth.setEnabled(value);
      setBiometricEnabled(value);
    } catch (error) {
      console.warn('No se pudo guardar la preferencia de biometría:', error);
    }
  }, []);

  const handleLogout = async () => {
    await logout(); // cierra sesión en Supabase de verdad (invalida el token)
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium">CuentaBirras 🍺</Text>
      <Text variant="bodyLarge" style={styles.greeting}>
        Hola, {user?.firstName}
      </Text>

      {/* Este View SIEMPRE ocupa el mismo espacio en pantalla (con
          opacity: 0 si no hay biometría soportada), en vez de desaparecer
          del todo. Truco para evitar que el resto de elementos "salten" de
          sitio cuando isSupported tarda un instante en resolverse — nos
          pasó de verdad y se veía raro. */}
      <View style={[styles.switchRow, !biometricSupported && styles.switchRowHidden]}>
        <Text>Desbloqueo con huella / Face ID</Text>
        <Switch value={biometricEnabled} onValueChange={toggleBiometric} disabled={!biometricSupported} />
      </View>

      <AppButton mode="outlined" onPress={handleLogout} style={styles.button}>
        Cerrar sesión
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  greeting: {
    marginTop: -8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchRowHidden: {
    opacity: 0,
  },
  button: {
    marginTop: 8,
  },
});
