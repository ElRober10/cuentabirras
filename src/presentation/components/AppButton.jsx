import { useState } from 'react';
import { Animated } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

export function AppButton({ style, onPressIn, onPressOut, ...rest }) {
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressIn = (event) => {
    animateTo(0.96);
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    animateTo(1);
    onPressOut?.(event);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <PaperButton {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut} />
    </Animated.View>
  );
}
