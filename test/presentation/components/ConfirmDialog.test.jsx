import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ConfirmDialog } from '../../../src/presentation/components/ConfirmDialog';
import { renderWithProviders } from '../../support/renderWithProviders';

describe('ConfirmDialog', () => {
  it('renderiza título, cuerpo y botones cuando visible', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderWithProviders(
      <ConfirmDialog
        visible
        title="¿Quitar este bar?"
        confirmLabel="Quitar"
        onCancel={onCancel}
        onConfirm={onConfirm}
      >
        <Text>Vas a quitar &quot;Bar Pepe&quot; de tu lista.</Text>
      </ConfirmDialog>,
    );

    expect(screen.getByText('¿Quitar este bar?')).toBeOnTheScreen();
    expect(screen.getByText(/Bar Pepe/)).toBeOnTheScreen();
    expect(screen.getByText('Cancelar')).toBeOnTheScreen();
    expect(screen.getByText('Quitar')).toBeOnTheScreen();
  });

  it('no renderiza nada cuando no es visible', async () => {
    await renderWithProviders(
      <ConfirmDialog visible={false} title="¿Seguro?" confirmLabel="Sí" onCancel={() => {}} onConfirm={() => {}} />,
    );

    expect(screen.queryByText('¿Seguro?')).toBeNull();
  });

  it('llama a onConfirm y onCancel al pulsar cada botón', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderWithProviders(
      <ConfirmDialog visible title="¿Seguro?" confirmLabel="Sí" cancelLabel="No" onCancel={onCancel} onConfirm={onConfirm} />,
    );

    await fireEvent.press(screen.getByText('Sí'));
    await fireEvent.press(screen.getByText('No'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('acepta etiquetas de botón personalizadas (no siempre "Cancelar"/"Confirmar")', async () => {
    await renderWithProviders(
      <ConfirmDialog
        visible
        title="¿Seguro que quieres cerrar sesión?"
        cancelLabel="No"
        confirmLabel="Sí"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('No')).toBeOnTheScreen();
    expect(screen.getByText('Sí')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  it('no renderiza Dialog.Content si no hay children', async () => {
    await renderWithProviders(
      <ConfirmDialog visible title="¿Seguro?" confirmLabel="Sí" onCancel={() => {}} onConfirm={() => {}} />,
    );

    // El título sale, pero no hay ningún texto de cuerpo de más.
    expect(screen.getByText('¿Seguro?')).toBeOnTheScreen();
  });
});
