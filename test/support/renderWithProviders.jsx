import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { lightTheme } from '../../src/presentation/theme/tokens';

// Monta un componente con los providers mínimos que espera cualquier
// pantalla/componente de la app: el tema de Paper (colores "cerveza" + su
// Portal.Host, que necesitan los modales) y el SafeAreaProvider (los
// insets). Mismo par que envuelve la app de verdad en app/_layout.jsx.
//
// OJO: en @testing-library/react-native 14 `render` es ASÍNCRONO — hay que
// hacer `await renderWithProviders(...)` en cada test.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderWithProviders(ui, options) {
  return render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PaperProvider theme={lightTheme}>{children}</PaperProvider>
      </SafeAreaProvider>
    ),
    ...options,
  });
}
