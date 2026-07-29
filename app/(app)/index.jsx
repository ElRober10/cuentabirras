import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listBarsSortedByDistance } from '../../src/application/bars/listBarsSortedByDistance';
import { container } from '../../src/di/container';
import { AppButton } from '../../src/presentation/components/AppButton';
import { BarListItem } from '../../src/presentation/components/BarListItem';
import { useAuth } from '../../src/presentation/hooks/useAuth';

const PAGE_SIZE = 5;

// Pantalla de la ruta "/(app)" — la primera que ves una vez logueado y
// desbloqueado: cabecera (logo animado + saludo) arriba, el listado de
// bares en medio (o el botón de crear el primero, si no hay ninguno), y
// "Cerrar sesión" anclado abajo del todo.
export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  // insets.top = la altura de la barra de notificaciones/notch en ESTE
  // móvil en concreto (varía de un modelo a otro). Sumamos un poco más (16)
  // para que quede un pequeño margen de respiro, no justo pegado.
  const insets = useSafeAreaInsets();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Bar pendiente de confirmar su eliminación (o null si no hay ningún
  // diálogo abierto ahora mismo).
  const [barPendingRemoval, setBarPendingRemoval] = useState(null);

  const queryClient = useQueryClient();

  const { data: bars, isLoading } = useQuery({
    queryKey: ['bars'],
    queryFn: listBarsSortedByDistance,
  });

  const visibleBars = useMemo(() => (bars ?? []).slice(0, visibleCount), [bars, visibleCount]);
  const hasMore = (bars?.length ?? 0) > visibleBars.length;

  // La propia base de datos decide si el bar se borra de verdad o solo se
  // oculta para ti (ver la función remove_bar_for_current_user, migración
  // 0007) — aquí solo refrescamos la lista una vez decidido.
  const removeBarMutation = useMutation({
    mutationFn: async (barId) => {
      // Hay que mirar si tenías foto puesta ANTES de borrar el bar: si se
      // borra de verdad, la fila de bar_photos desaparece en cascada junto
      // con el bar, y ya no habría forma de saber qué archivo borrar del
      // Storage.
      const myPhoto = await container.barPhotoRepository.getForBar(barId);
      const result = await container.barRepository.removeBarForCurrentUser(barId);
      // Solo se borra el archivo si el bar se ha borrado DE VERDAD, nunca si
      // solo se ha ocultado (ahí el bar sigue existiendo para otros, así que
      // tu foto también debe seguir intacta).
      if (result === 'deleted' && myPhoto) {
        await container.barPhotoRepository.deletePhotoFile(myPhoto.photoPath);
      }
      return result;
    },
    // El segundo argumento (barId) es justo lo que le pasamos a `.mutate(barId)`
    // más abajo — react-query nos lo devuelve aquí para saber A CUÁL quitar.
    onSuccess: (_result, barId) => {
      // Actualización "optimista": quitamos el bar de la lista que ya
      // tenemos en caché AL INSTANTE, sin esperar a volver a pedirla entera
      // (esa nueva consulta pide de nuevo la ubicación GPS, que puede
      // tardar varios segundos — por eso antes parecía que no pasaba nada).
      queryClient.setQueryData(['bars'], (previousBars) =>
        (previousBars ?? []).filter((bar) => bar.id !== barId),
      );
      // Aun así, disparamos un refresco de verdad en segundo plano, por si
      // hubiera cambiado algo más mientras tanto.
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      setBarPendingRemoval(null);
    },
    onError: (error) => {
      // Antes esto fallaba en silencio (ningún mensaje, el diálogo se
      // quedaba tal cual) — ahora al menos se ve el motivo real.
      console.warn('No se pudo quitar el bar:', error);
    },
  });

  // Animación de entrada (fundido + deslizamiento) y el balanceo en bucle
  // del icono de cerveza — ver la explicación larga en versiones anteriores
  // de este archivo; el patrón es el mismo que en AppButton.
  const [entrance] = useState(() => new Animated.Value(0));
  const [sway] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 450, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 900, useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ).start();
  }, [entrance, sway]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 }]}>
      <Animated.View style={[styles.header, { opacity: entrance, transform: [{ translateY }] }]}>
        <View style={styles.brandRow}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialCommunityIcons name="glass-mug-variant" size={48} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.title}>CuentaBirras</Text>
        </View>
        <Text variant="bodyLarge" style={styles.greeting}>
          Hola, {user?.firstName} 👋
        </Text>
      </Animated.View>

      {/* Este View con flex:1 es lo que empuja "Cerrar sesión" hasta el
          fondo de la pantalla: ocupa TODO el espacio que sobra entre la
          cabecera y el botón de abajo, tenga la lista muchos bares, pocos, o
          ninguno. */}
      <View style={styles.listArea}>
        {isLoading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : (
          <FlatList
            data={visibleBars}
            keyExtractor={(bar) => bar.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <BarListItem
                bar={item}
                onPress={() => router.push(`/bars/${item.id}`)}
                onRequestRemove={setBarPendingRemoval}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Todavía no tienes ningún bar. ¡Crea el primero!</Text>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {hasMore ? (
                  <AppButton mode="text" onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    Buscar más bares
                  </AppButton>
                ) : null}
                <AppButton mode="contained" onPress={() => router.push('/bars/new')} style={styles.newBarButton}>
                  + Crear nuevo bar
                </AppButton>
              </View>
            }
          />
        )}
      </View>

      <AppButton mode="text" onPress={handleLogout} style={styles.logoutButton}>
        Cerrar sesión
      </AppButton>

      <Portal>
        <Dialog visible={!!barPendingRemoval} onDismiss={() => setBarPendingRemoval(null)}>
          <Dialog.Title>¿Quitar este bar?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Vas a quitar &quot;{barPendingRemoval?.name}&quot; de tu lista. Si nadie más lo usa se
              eliminará del todo; si lo usan más personas, solo se ocultará para ti.
            </Text>
            {removeBarMutation.isError ? (
              <HelperText type="error" visible>
                {removeBarMutation.error?.message ?? 'No se pudo quitar el bar.'}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setBarPendingRemoval(null)}>
              Cancelar
            </AppButton>
            <AppButton
              mode="contained"
              loading={removeBarMutation.isPending}
              onPress={() => removeBarMutation.mutate(barPendingRemoval.id)}
            >
              Quitar
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop se calcula en el render con useSafeAreaInsets (varía según
    // el móvil), así que aquí solo dejamos el resto de espaciado fijo.
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'MetalMania_400Regular',
    fontSize: 32,
  },
  greeting: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    opacity: 0.8,
  },
  listArea: {
    flex: 1,
  },
  spinner: {
    marginTop: 24,
  },
  list: {
    flexGrow: 1,
  },
  footer: {
    gap: 8,
    marginTop: 4,
    marginHorizontal: 16,
  },
  newBarButton: {
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.7,
    paddingHorizontal: 24,
  },
  logoutButton: {
    alignSelf: 'center',
  },
});
