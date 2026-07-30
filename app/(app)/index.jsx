import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ActivityIndicator, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listBarsSortedByDistance } from '../../src/application/bars/listBarsSortedByDistance';
import { container } from '../../src/di/container';
import { AppButton } from '../../src/presentation/components/AppButton';
import { BarListItem } from '../../src/presentation/components/BarListItem';
import { useAuth } from '../../src/presentation/hooks/useAuth';

const PAGE_SIZE = 5;

// Arranca los 3 bucles de la animación del logo (ver HomeScreen más abajo).
// Está fuera del componente (recibe los shared values ya creados, en vez de
// crearlos aquí) para que la asignación `algo.value = ...` no quede en el
// mismo scope donde se llamó a useSharedValue — así el comprobador de
// "hooks" no la confunde con estar mutando el resultado de un hook normal
// (piensa en un useState), que sería un bug real; aquí es justo cómo se usa
// un SharedValue de Reanimated.
function startBrandAnimation({ entrance, sway, bounce }) {
  entrance.value = withTiming(1, { duration: 450 });

  // Vaivén continuo: un único withTiming a 1, con el 3er parámetro de
  // withRepeat ("reverse") en true — así, en vez de reiniciar la animación
  // desde el principio en cada vuelta (que era lo que provocaba el salto al
  // llegar al extremo izquierdo), Reanimated la reproduce hacia atrás justo
  // por donde vino, garantizando que no haya ningún punto de discontinuidad.
  // Importante: para que alterne de verdad entre -1 y 1 (no entre 0 y 1),
  // `sway` tiene que arrancar ya en -1 (ver useSharedValue(-1) más abajo) —
  // el "reverse" siempre vuelve al valor CON EL QUE ARRANCÓ, no a un punto
  // fijo distinto.
  sway.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);

  // Segundo bucle, más rápido e independiente: un saltito vertical + un
  // pequeño "pop" de tamaño, para que dé sensación de brindar con energía,
  // no solo inclinarse. Aquí SÍ usamos una secuencia de dos tramos con
  // easings distintos (arriba rápido, abajo suave) en vez del truco del
  // "reverse" — es seguro porque el ciclo siempre vuelve a su mismo valor
  // de partida (0), así que reiniciar desde ahí no produce ningún salto.
  bounce.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
    ),
    -1,
  );
}

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

  // Animación de entrada (fundido + deslizamiento) y balanceo del icono de
  // la caña, con react-native-reanimated en vez de la Animated de React
  // Native. Motivo del cambio: la Animated "de toda la vida", aunque use
  // useNativeDriver, sigue necesitando que JS reinicie cada vuelta del
  // bucle (Animated.loop) — ese ida-y-vuelta por el puente JS↔nativo se
  // notaba como un tirón justo al llegar a cada extremo del balanceo.
  // Reanimated corre el bucle entero (withRepeat) en el hilo de UI, sin
  // pasar por JS en cada vuelta, así que no debería quedar ningún punto
  // donde "tironee".
  const entrance = useSharedValue(0);
  const sway = useSharedValue(-1);
  const bounce = useSharedValue(0);

  useEffect(() => {
    startBrandAnimation({ entrance, sway, bounce });
  }, [entrance, sway, bounce]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: interpolate(entrance.value, [0, 1], [20, 0]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(sway.value, [-1, 1], [-16, 16])}deg` },
      { translateY: interpolate(bounce.value, [0, 1], [0, -6]) },
      { scale: interpolate(bounce.value, [0, 1], [1, 1.1]) },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 }]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.brandRow}>
          <Animated.View style={iconStyle}>
            <Image
              source={require('../../assets/drinks/cana.png')}
              style={styles.brandIcon}
              resizeMode="contain"
            />
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
  // Misma altura (48) que tenía el icono genérico que sustituye; el ancho
  // sale de la proporción real de cana.png (428x583) para no deformarla.
  brandIcon: {
    width: 35,
    height: 48,
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
