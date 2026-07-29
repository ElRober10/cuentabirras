import { useState } from 'react';
import { Animated } from 'react-native';

// La animación de "encogerse un poco al pulsar", extraída de AppButton.jsx a
// un hook aparte para poder reutilizarla en otros elementos tocables hechos
// a medida (como DrinkTile) sin copiar y pegar la misma lógica dos veces.
export function usePressScale({ pressedScale = 0.96 } = {}) {
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressIn = () => animateTo(pressedScale);
  const onPressOut = () => animateTo(1);

  return { scale, onPressIn, onPressOut };
}
