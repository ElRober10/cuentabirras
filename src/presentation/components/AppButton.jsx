import { Animated } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

import { usePressScale } from '../hooks/usePressScale';

// El <Button> de React Native Paper ya tiene un efecto "ripple" (la onda de
// Material Design) al pulsar, pero no el efecto de "encogerse un poco" que
// pediste. Este componente ENVUELVE el Button de Paper añadiendo esa
// animación (con el hook usePressScale, compartido también con otros componentes),
// y se usa en TODA la app en vez del Button normal — así el efecto es
// consistente en todos los botones con un solo sitio que mantener.
//
// `{ style, onPressIn, onPressOut, ...rest }`: sacamos aparte los props que
// necesitamos tocar nosotros, y `...rest` recoge TODO lo demás (mode,
// loading, children, onPress, disabled...) para pasárselo tal cual al Button
// de Paper sin tener que listarlo uno a uno.
export function AppButton({ style, onPressIn, onPressOut, ...rest }) {
  const { scale, onPressIn: animatePressIn, onPressOut: animatePressOut } = usePressScale();

  const handlePressIn = (event) => {
    animatePressIn();
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    animatePressOut();
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
