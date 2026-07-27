import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Paleta "cerveza": ámbar/dorado cálido como color de marca.
const amber = {
  amber10: '#FFF8E9',
  amber30: '#FFE0A3',
  amber50: '#F2A900',
  amber60: '#D98E00',
  amber80: '#7A4B00',
  amber90: '#4A2E00',
  foam: '#FFF6E5',
  stout: '#231609',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: amber.amber60,
    onPrimary: '#FFFFFF',
    primaryContainer: amber.amber30,
    onPrimaryContainer: amber.amber90,
    secondary: amber.amber80,
    background: amber.foam,
    surface: '#FFFFFF',
    surfaceVariant: amber.amber10,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: amber.amber30,
    onPrimary: amber.stout,
    primaryContainer: amber.amber80,
    onPrimaryContainer: amber.amber10,
    secondary: amber.amber50,
    background: amber.stout,
    surface: '#2E1F10',
    surfaceVariant: amber.amber90,
  },
};
