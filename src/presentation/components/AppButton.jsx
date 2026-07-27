import { useState } from 'react';
import { Animated } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

// El <Button> de React Native Paper ya tiene un efecto "ripple" (la onda de
// Material Design) al pulsar, pero no el efecto de "encogerse un poco" que
// pediste. Este componente ENVUELVE el Button de Paper añadiendo esa
// animación, y se usa en TODA la app en vez del Button normal — así el
// efecto es consistente en todos los botones con un solo sitio que mantener.
//
// `{ style, onPressIn, onPressOut, ...rest }`: sacamos aparte los props que
// necesitamos tocar nosotros, y `...rest` recoge TODO lo demás (mode,
// loading, children, onPress, disabled...) para pasárselo tal cual al Button
// de Paper sin tener que listarlo uno a uno.
export function AppButton({ style, onPressIn, onPressOut, ...rest }) {
  // `Animated.Value` es un número "vivo" que React Native puede animar de
  // forma eficiente (fuera del hilo de JavaScript, gracias a
  // useNativeDriver). Lo guardamos con useState(() => ...) en vez de crear
  // `new Animated.Value(1)` directamente, porque si no se crearía uno NUEVO
  // en cada render — con useState, solo se crea la primera vez.
  const [scale] = useState(() => new Animated.Value(1));

  // Anima `scale` hasta `toValue` con un muelle (spring). bounciness: 0 =
  // sin rebote, solo un movimiento suave.
  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true, // más fluido: la animación corre en el hilo nativo, no en JS
      speed: 50,
      bounciness: 0,
    }).start();
  };

  // onPressIn se dispara en el momento exacto de tocar (antes de soltar);
  // onPressOut, al soltar el dedo. Aquí encogemos al tocar y volvemos al
  // tamaño normal al soltar. El `?.()` es por si el que usa <AppButton>
  // también pasó su propio onPressIn/onPressOut (por ejemplo, Link de
  // expo-router lo hace en algunos casos) — así no se pierde.
  const handlePressIn = (event) => {
    animateTo(0.96); // 96% del tamaño = "encogido"
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    animateTo(1); // tamaño normal
    onPressOut?.(event);
  };

  return (
    // Animated.View es como una View normal, pero puede tener estilos que
    // cambian con una Animated.Value. `transform: [{ scale }]` es la forma
    // de React Native de decir "escala este elemento según este valor".
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <PaperButton {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut} />
    </Animated.View>
  );
}
