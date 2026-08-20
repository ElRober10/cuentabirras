jest.mock('../../../src/di/container', () => ({
  container: {
    tabRepository: {
      closeTab: jest.fn(),
      openOrJoinTab: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { startNewTab } from '../../../src/application/tabs/startNewTab';

beforeEach(() => {
  jest.clearAllMocks();
  container.tabRepository.openOrJoinTab.mockResolvedValue({ id: 'tab-nuevo' });
});

describe('startNewTab', () => {
  it('cierra la cuenta anterior antes de abrir la nueva, si había una', async () => {
    const result = await startNewTab({ barId: 'bar-1', currentOpenTabId: 'tab-vieja' });

    expect(container.tabRepository.closeTab).toHaveBeenCalledWith('tab-vieja');
    expect(container.tabRepository.openOrJoinTab).toHaveBeenCalledWith('bar-1');
    expect(result).toEqual({ id: 'tab-nuevo' });
  });

  it('no intenta cerrar nada si no había cuenta abierta', async () => {
    await startNewTab({ barId: 'bar-1', currentOpenTabId: null });

    expect(container.tabRepository.closeTab).not.toHaveBeenCalled();
    expect(container.tabRepository.openOrJoinTab).toHaveBeenCalledWith('bar-1');
  });
});
