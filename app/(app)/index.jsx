import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { biometricAuth } from '../../src/infrastructure/auth/biometricAuth';
import { AppButton } from '../../src/presentation/components/AppButton';
import { useAuth } from '../../src/presentation/hooks/useAuth';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    biometricAuth.isSupported().then(setBiometricSupported);
    biometricAuth.isEnabled().then(setBiometricEnabled);
  }, []);

  const toggleBiometric = useCallback(async (value) => {
    try {
      await biometricAuth.setEnabled(value);
      setBiometricEnabled(value);
    } catch (error) {
      console.warn('No se pudo guardar la preferencia de biometría:', error);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium">CuentaBirras 🍺</Text>
      <Text variant="bodyLarge" style={styles.greeting}>
        Hola, {user?.firstName}
      </Text>

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
