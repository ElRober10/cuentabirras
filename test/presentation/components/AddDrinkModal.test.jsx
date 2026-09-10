import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AddDrinkModal } from '../../../src/presentation/components/AddDrinkModal';
import { renderWithProviders } from '../../support/renderWithProviders';

const noop = () => {};

function renderModal(props) {
  return renderWithProviders(
    <AddDrinkModal
      visible
      onDismiss={noop}
      onSubmit={noop}
      onSetPriceOnly={noop}
      existingCatalogItems={[]}
      iconPopularity={[]}
      {...props}
    />,
  );
}

describe('AddDrinkModal', () => {
  it('renderiza el selector de bebidas cuando visible', async () => {
    await renderModal();

    expect(screen.getByText('Bebida nueva')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Buscar bebida...')).toBeOnTheScreen();
    expect(screen.getByText('Otro')).toBeOnTheScreen();
  });

  it('no renderiza el contenido cuando no es visible', async () => {
    await renderModal({ visible: false });

    expect(screen.queryByText('Bebida nueva')).toBeNull();
  });

  it('aguanta iconPopularity / existingCatalogItems sin definir', async () => {
    await expect(
      renderWithProviders(
        <AddDrinkModal visible onDismiss={noop} onSubmit={noop} onSetPriceOnly={noop} />,
      ),
    ).resolves.toBeTruthy();
  });

  // Misma regresión que en SetPriceDialog: el KeyboardAvoidingView dentro del
  // Portal tiene que ocupar toda la pantalla o el modal se colapsa arriba en
  // RN 0.86 (SDK 57).
  it('el KeyboardAvoidingView ocupa toda la pantalla (no se colapsa dentro del Portal)', async () => {
    await renderModal();

    const style = StyleSheet.flatten(screen.getByTestId('add-drink-kav').props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.bottom).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
  });
});
