import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { container } from '../../src/di/container';
import { biometricAuth } from '../../src/infrastructure/auth/biometricAuth';
import { AppButton } from '../../src/presentation/components/AppButton';
import { PendingLinkInvitationDialog } from '../../src/presentation/components/PendingLinkInvitationDialog';
import { useAuth } from '../../src/presentation/hooks/useAuth';
import { usePendingLinkInvitations } from '../../src/presentation/hooks/usePendingLinkInvitations';

// Este es el archivo más "enredado" de la app, así que primero la idea
// general: este _layout es el GUARDIÁN de todo lo que hay dentro del grupo
// (app). Antes de dejarte ver cualquier pantalla de aquí dentro, decide en
// orden 4 cosas:
//   1. ¿Todavía no sabemos si hay sesión? → spinner
//   2. ¿No hay sesión? → al login
//   3. ¿Hay sesión, pero aún no hemos comprobado la huella? → spinner
//   4. ¿La huella está activada y no se ha desbloqueado? → pantalla de bloqueo
//   5. Si pasa las 4, muestra las pantallas de verdad (<Stack />).
// El ORDEN de estas comprobaciones importa mucho — tuvimos un bug real
// donde, si no había usuario, el código se quedaba pillado en el paso 3
// para siempre en vez de pasar al paso 2. Por eso están en este orden
// exacto más abajo.

// Pequeña ayuda: envuelve una promesa para que, si tarda más de `ms`
// milisegundos, la demos por fallida en vez de esperar eternamente. La
// usamos porque el sensor de huella, en algunos móviles, se puede
// quedar colgado sin responder ni éxito ni error — sin este timeout, la app
// se quedaría con el spinner para siempre (nos pasó de verdad probándolo).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)),
  ]);
}

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const queryClient = useQueryClient();
  // locked: ¿la sesión está "bloqueada" pendiente de huella? Empieza en
  // true por seguridad (mejor pedir de más que dejar pasar sin querer).
  const [locked, setLocked] = useState(true);
  // checkingLock: ¿estamos AHORA MISMO comprobando la huella? (distinto de
  // `locked`: puede que aún no sepamos si hace falta bloquear o no).
  const [checkingLock, setCheckingLock] = useState(true);

  // Comprobación de invitaciones de "vincular cuenta" pendientes, en cuanto
  // hay sesión de verdad desbloqueada (no antes: la RPC necesita auth.uid()).
  // Los Hooks no se pueden llamar solo a veces, así que esto se monta
  // siempre — es el `enabled` el que decide si dispara la petición o no.
  const sessionReady = !isLoading && !!user && !checkingLock && !locked;
  const pendingInvitationsQuery = usePendingLinkInvitations(sessionReady);
  const pendingInvitation = pendingInvitationsQuery.data?.[0] ?? null;

  const respondMutation = useMutation({
    mutationFn: ({ requestId, accept }) => container.accountLinkRepository.respondToInvitation({ requestId, accept }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLinkInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['myAccountLink'] });
    },
  });

  useEffect(() => {
    // Si todavía no sabemos si hay usuario, o no lo hay, no tiene sentido
    // comprobar la huella — nos vamos sin tocar `checkingLock` (por eso el
    // render de más abajo comprueba `!user` ANTES que `checkingLock`).
    if (isLoading || !user) return;

    // `cancelled` evita "actualizar un componente que ya no está en
    // pantalla" si el usuario navega fuera mientras esto sigue en marcha
    // (React avisaría con un warning si no lo controlásemos).
    let cancelled = false;

    async function unlock() {
      setCheckingLock(true);
      try {
        // ¿El móvil soporta huella Y el usuario la activó en el interruptor?
        const [supported, enabled] = await withTimeout(
          Promise.all([biometricAuth.isSupported(), biometricAuth.isEnabled()]),
          5000,
        );

        if (!supported || !enabled) {
          // No hace falta pedir huella: se considera "desbloqueado" directamente.
          if (!cancelled) setLocked(false);
          return;
        }

        // Lanza el diálogo nativo (huella/Face ID) y espera la respuesta.
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

    // Función de limpieza: se ejecuta si el efecto se vuelve a disparar o el
    // componente se desmonta, antes de la siguiente ejecución.
    return () => {
      cancelled = true;
    };
    // Este efecto se repite si cambia isLoading o el propio user — pero OJO:
    // sessionStore.js está hecho a propósito para NO crear un `user` nuevo
    // en cada renovación de token, si no, esto se repetiría sin parar (era
    // justo el bug de "la pantalla hace cosas raras" que tuvimos).
  }, [isLoading, user]);

  // A partir de aquí, los 5 posibles resultados, en orden:

  // 1) Aún no sabemos si hay sesión guardada.
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  // 2) Sabemos que NO hay sesión → fuera, al login. (Este check va antes que
  // `checkingLock` a propósito: si no, alguien sin sesión se quedaría
  // viendo un spinner para siempre, que fue el bug que arreglamos.)
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3) Hay sesión, pero todavía estamos preguntando al sensor de huella.
  if (checkingLock) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  // 4) Hace falta huella y aún no se ha desbloqueado: pantalla de bloqueo
  // con un botón para reintentar a mano (por si el usuario canceló el
  // diálogo sin querer, o falló el primer intento).
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

  // 5) Todo en orden: mostramos el navegador con las pantallas reales de
  // dentro de (app). Por defecto sin cabecera (como la pantalla de inicio,
  // que ya tiene su propio diseño) — pero las pantallas de bares SÍ llevan
  // cabecera nativa, porque eso nos da gratis el botón "atrás" y el gesto
  // de deslizar para volver.
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="bars/new" options={{ headerShown: true, title: 'Nuevo bar' }} />
        <Stack.Screen name="bars/[barId]/index" options={{ headerShown: false }} />
        <Stack.Screen name="bars/[barId]/tab/[tabId]" options={{ headerShown: true, title: 'Cuenta' }} />
        <Stack.Screen name="bars/[barId]/edit" options={{ headerShown: true, title: 'Editar bar' }} />
        <Stack.Screen name="bars/[barId]/settings" options={{ headerShown: true, title: 'Precios del bar' }} />
        <Stack.Screen name="settings/index" options={{ headerShown: true, title: 'Ajustes' }} />
        <Stack.Screen name="settings/link-account" options={{ headerShown: true, title: 'Vincular cuenta' }} />
      </Stack>

      <PendingLinkInvitationDialog
        invitation={pendingInvitation}
        isResponding={respondMutation.isPending}
        onAccept={() => respondMutation.mutate({ requestId: pendingInvitation.requestId, accept: true })}
        onReject={() => respondMutation.mutate({ requestId: pendingInvitation.requestId, accept: false })}
      />
    </>
  );
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
