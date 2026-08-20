jest.mock('../../../src/di/container', () => ({
  container: {
    tabRepository: {
      findOpenTabForBar: jest.fn(),
      closeTab: jest.fn(),
      reopenTab: jest.fn(),
    },
    tabItemRepository: {
      listByTab: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { reopenClosedTab } from '../../../src/application/tabs/reopenClosedTab';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reopenClosedTab', () => {
  it('reabre directamente si no hay ninguna cuenta abierta en el bar', async () => {
    container.tabRepository.findOpenTabForBar.mockResolvedValue(null);

    await reopenClosedTab({ tabId: 'tab-cerrada', barId: 'bar-1' });

    expect(container.tabRepository.closeTab).not.toHaveBeenCalled();
    expect(container.tabRepository.reopenTab).toHaveBeenCalledWith('tab-cerrada');
  });

  it('lanza error si ya hay una cuenta abierta de verdad (con contenido)', async () => {
    container.tabRepository.findOpenTabForBar.mockResolvedValue({ id: 'tab-abierta' });
    container.tabItemRepository.listByTab.mockResolvedValue([{ id: 'item-1' }]);

    await expect(reopenClosedTab({ tabId: 'tab-cerrada', barId: 'bar-1' })).rejects.toThrow(
      'Ya tienes una cuenta abierta en este bar. Ciérrala antes de reabrir esta.',
    );
    expect(container.tabRepository.reopenTab).not.toHaveBeenCalled();
  });

  it('cierra sola la cuenta abierta vacía y reabre la cerrada', async () => {
    container.tabRepository.findOpenTabForBar.mockResolvedValue({ id: 'tab-vacia' });
    container.tabItemRepository.listByTab.mockResolvedValue([]);

    await reopenClosedTab({ tabId: 'tab-cerrada', barId: 'bar-1' });

    expect(container.tabRepository.closeTab).toHaveBeenCalledWith('tab-vacia');
    expect(container.tabRepository.reopenTab).toHaveBeenCalledWith('tab-cerrada');
  });
});
