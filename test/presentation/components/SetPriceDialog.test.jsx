import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SetPriceDialog } from '../../../src/presentation/components/SetPriceDialog';
import { renderWithProviders } from '../../support/renderWithProviders';

const noop = () => {};

describe('SetPriceDialog', () => {
  it('renderiza su contenido cuando visible', async () => {
    await renderWithProviders(
      <SetPriceDialog visible drinkName="Caña" onDismiss={noop} onSubmit={noop} />,
    );

    expect(screen.getByText('¿Sabes el precio?')).toBeOnTheScreen();
    expect(screen.getByText(/Caña/)).toBeOnTheScreen();
    expect(screen.getByText('Guardar')).toBeOnTheScreen();
  });

  it('muestra "Corregir precio" y el precio inicial si ya lo tenía', async () => {
    await renderWithProviders(
      <SetPriceDialog
        visible
        drinkName="Caña"
        initialPriceCents={250}
        onDismiss={noop}
        onSubmit={noop}
      />,
    );

    expect(screen.getByText('Corregir precio')).toBeOnTheScreen();
    // centsToEuros usa coma decimal (es-ES).
    expect(screen.getByDisplayValue('2,50')).toBeOnTheScreen();
  });

  it('no renderiza el contenido cuando no es visible', async () => {
    await renderWithProviders(
      <SetPriceDialog visible={false} drinkName="Caña" onDismiss={noop} onSubmit={noop} />,
    );

    expect(screen.queryByText('¿Sabes el precio?')).toBeNull();
  });

  // Regresión del bug de SDK 57: el KeyboardAvoidingView que envuelve el
  // Dialog vive dentro de un <Portal>. Sin un estilo que lo haga ocupar toda
  // la pantalla, en RN 0.86 se colapsa arriba y el diálogo sale como una
  // tira pegada a la cabecera. Tiene que llevar posición absoluta a pantalla
  // completa (StyleSheet.absoluteFill).
  it('el KeyboardAvoidingView ocupa toda la pantalla (no se colapsa dentro del Portal)', async () => {
    await renderWithProviders(
      <SetPriceDialog visible drinkName="Caña" onDismiss={noop} onSubmit={noop} />,
    );

    const style = StyleSheet.flatten(screen.getByTestId('price-dialog-kav').props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.bottom).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
  });
});
