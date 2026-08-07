import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text, useTheme } from 'react-native-paper';

const FLIP_DURATION_MS = 300;
const REVEAL_DURATION_MS = 10000;

// Un icono de bebida "volteable": tocarlo da la vuelta (como una carta,
// rotación 3D en el eje Y) y enseña la hora — solo hora y minutos — a la
// que se pidió ESA unidad concreta, en vez del dibujo de siempre. A los 10
// segundos se da la vuelta solo, sin tocar nada. Tocarlo mientras está
// volteado lo devuelve al momento, sin esperar los 10 segundos.
//
// Técnica del "flip": las dos caras están superpuestas (position:
// 'absolute', mismo hueco) y giran a la vez, una empezando en 0° y la otra
// en -180° — con backfaceVisibility:'hidden' en las dos, React Native
// oculta automáticamente la que en cada instante está "de espaldas", sin
// tener que ir calculando nosotros cuándo enseñar cada una.
export function DrinkUnitIcon({ timestamp, size, renderIcon }) {
  const theme = useTheme();
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);

  // El hueco de cada unidad es estrecho y alto (una botella, una copa...),
  // así que "21:45" en una sola línea no cabe bien — se parte en dos
  // renglones, hora arriba y minutos debajo.
  const date = timestamp ? new Date(timestamp) : null;
  const hours = date ? String(date.getHours()).padStart(2, '0') : null;
  const minutes = date ? String(date.getMinutes()).padStart(2, '0') : null;

  // Toda mutación de `rotation` (SharedValue de Reanimated) vive AQUÍ, en un
  // único efecto que reacciona a `flipped` — el compilador de React no deja
  // mutar un SharedValue directamente desde un manejador de evento si ese
  // mismo valor también se toca dentro de un efecto (error de
  // "immutability"). `handlePress` de más abajo, por tanto, solo cambia
  // `flipped`; es este efecto el que traduce ese cambio en animación.
  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, { duration: FLIP_DURATION_MS });
    if (!flipped) return undefined;
    const timer = setTimeout(() => setFlipped(false), REVEAL_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  const handlePress = () => {
    if (!date) return; // Sin hora guardada (dato antiguo), no hay nada que enseñar.
    setFlipped((previous) => !previous);
  };

  const frontStyle = useAnimatedStyle(() => ({ transform: [{ rotateY: `${rotation.value}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ rotateY: `${rotation.value - 180}deg` }] }));

  return (
    <Pressable onPress={handlePress} style={[styles.wrapper, size]}>
      <Animated.View style={[styles.face, size, frontStyle]}>{renderIcon()}</Animated.View>
      {date ? (
        <Animated.View
          style={[styles.face, styles.timeFace, size, backStyle, { backgroundColor: theme.colors.primaryContainer }]}
        >
          <MaterialCommunityIcons
            name="clock-outline"
            size={12}
            color={theme.colors.onPrimaryContainer}
            style={styles.timeIcon}
          />
          <Text style={[styles.timeText, { color: theme.colors.onPrimaryContainer }]}>{hours}</Text>
          {/* Dos puntitos entre horas y minutos, como los ":" de un reloj —
              sin ellos, dos números uno debajo del otro no se leen a simple
              vista como una hora. Dos puntos propios (no el carácter ":")
              para que se vean igual de redondos pase lo que pase con la
              fuente. */}
          <View style={styles.timeDivider}>
            <View style={[styles.timeDividerDot, { backgroundColor: theme.colors.onPrimaryContainer }]} />
            <View style={[styles.timeDividerDot, { backgroundColor: theme.colors.onPrimaryContainer }]} />
          </View>
          <Text style={[styles.timeText, { color: theme.colors.onPrimaryContainer }]}>{minutes}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  timeFace: {
    borderRadius: 8,
  },
  timeIcon: {
    marginBottom: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
  },
  timeDivider: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 2,
  },
  timeDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.7,
  },
});
