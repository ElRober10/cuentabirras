import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { biometricAuth } from '../../src/infrastructure/auth/biometricAuth';
import { AppButton } from '../../src/presentation/components/AppButton';
import { useAuth } from '../../src/presentation/hooks/useAuth';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)),
  ]);
}

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const [locked, setLocked] = useState(true);
  const [checkingLock, setCheckingLock] = useState(true);

  useEffect(() => {
    if (isLoading || !user) return;

    let cancelled = false;

    async function unlock() {
      setCheckingLock(true);
      try {
        const [supported, enabled] = await withTimeout(
          Promise.all([biometricAuth.isSupported(), biometricAuth.isEnabled()]),
          5000,
        );

        if (!supported || !enabled) {
          if (!cancelled) setLocked(false);
          return;
        }

        const success = await withTimeout(biometricAuth.authenticate(), 10000);
        if (!cancelled) setLocked(!success);
      } catch (error) {
        // Si falla la comprobación biométrica por un motivo inesperado, no dejamos
        // al usuario bloqueado fuera de su propia sesión: desbloqueamos por defecto.
        console.warn('Comprobación biométrica fallida, se desbloquea por defecto:', error);
        if (!cancelled) setLocked(false);
      } finally {
        if (!cancelled) setCheckingLock(false);
      }
    }

    unlock();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (checkingLock) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.text}>
          Sesión bloqueada
        </Text>
        <AppButton
          mode="contained"
          onPress={() =>
            withTimeout(biometricAuth.authenticate(), 10000)
              .then((ok) => setLocked(!ok))
              .catch((error) => {
                console.warn('Comprobación biométrica fallida, se desbloquea por defecto:', error);
                setLocked(false);
              })
          }
        >
          Desbloquear
        </AppButton>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    marginBottom: 4,
  },
});
