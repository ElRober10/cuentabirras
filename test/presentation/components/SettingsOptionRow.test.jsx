import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText } from 'react-native';

import { SettingsOptionRow } from '../../../src/presentation/components/SettingsOptionRow';
import { lightTheme } from '../../../src/presentation/theme/tokens';
import { renderWithProviders } from '../../support/renderWithProviders';

describe('SettingsOptionRow', () => {
  it('renderiza título y descripción', async () => {
    await renderWithProviders(
      <SettingsOptionRow icon="account-edit-outline" title="Editar datos personales" description="Nombre, email..." />,
    );

    expect(screen.getByText('Editar datos personales')).toBeOnTheScreen();
    expect(screen.getByText('Nombre, email...')).toBeOnTheScreen();
  });

  it('llama a onPress al tocar la fila cuando se le pasa', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SettingsOptionRow icon="history" title="Histórico de cuentas" description="..." onPress={onPress} />,
    );

    await fireEvent.press(screen.getByText('Histórico de cuentas'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('muestra la flecha por defecto cuando es pulsable', async () => {
    await renderWithProviders(
      <SettingsOptionRow icon="history" title="Histórico" description="..." onPress={() => {}} />,
    );

    expect(screen.getByTestId('settings-option-chevron')).toBeOnTheScreen();
  });

  it('no muestra flecha ni permite tocar si no hay onPress ni right', async () => {
    await renderWithProviders(<SettingsOptionRow icon="cog" title="Solo texto" description="..." />);

    expect(screen.queryByTestId('settings-option-chevron')).toBeNull();
  });

  it('renderiza el contenido de `right` en vez de la flecha', async () => {
    await renderWithProviders(
      <SettingsOptionRow
        icon="map-marker-radius-outline"
        title="Radio de bares cercanos"
        description="..."
        right={<RNText>2 km</RNText>}
      />,
    );

    expect(screen.getByText('2 km')).toBeOnTheScreen();
    expect(screen.queryByTestId('settings-option-chevron')).toBeNull();
  });

  it('con destructive pinta el título del color de error del tema', async () => {
    await renderWithProviders(
      <SettingsOptionRow
        icon="account-remove-outline"
        title="Borrar mi cuenta"
        description="..."
        destructive
        onPress={() => {}}
      />,
    );

    const style = StyleSheet.flatten(screen.getByText('Borrar mi cuenta').props.style);
    expect(style.color).toBe(lightTheme.colors.error);
  });
});
