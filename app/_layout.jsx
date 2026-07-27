import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { darkTheme, lightTheme } from '../src/presentation/theme/tokens';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
