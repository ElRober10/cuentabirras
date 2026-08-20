jest.mock('../../../src/di/container', () => ({
  container: {
    tabRepository: {
      findOpenTabForBar: jest.fn(),
      openOrJoinTab: jest.fn(),
    },
    tabItemRepository: {
      listByTab: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { openOrResumeTab } from '../../../src/application/tabs/openOrResumeTab';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('openOrResumeTab', () => {
  it('crea una cuenta nueva si no había ninguna abierta', async () => {
    container.tabRepository.findOpenTabForBar.mockResolvedValue(null);
    container.tabRepository.openOrJoinTab.mockResolvedValue({ id: 'tab-nuevo' });

    const result = await openOrResumeTab('bar-1');

    expect(container.tabRepository.openOrJoinTab).toHaveBeenCalledWith('bar-1');
    expect(result).toEqual({ tab: { id: 'tab-nuevo' }, alreadyOpen: false });
  });

  it('reutiliza la cuenta abierta si tiene contenido, marcando alreadyOpen', async () => {
    const openTab = { id: 'tab-1' };
    container.tabRepository.findOpenTabForBar.mockResolvedValue(openTab);
    container.tabItemRepository.listByTab.mockResolvedValue([{ id: 'item-1' }]);

    const result = await openOrResumeTab('bar-1');

    expect(container.tabRepository.openOrJoinTab).not.toHaveBeenCalled();
    expect(result).toEqual({ tab: openTab, alreadyOpen: true });
  });

  it('no cuenta como "abierta de verdad" una cuenta abierta pero vacía: delega en openOrJoinTab', async () => {
    const emptyOpenTab = { id: 'tab-vacia' };
    container.tabRepository.findOpenTabForBar.mockResolvedValue(emptyOpenTab);
    container.tabItemRepository.listByTab.mockResolvedValue([]);
    container.tabRepository.openOrJoinTab.mockResolvedValue({ id: 'tab-resultado' });

    const result = await openOrResumeTab('bar-1');

    expect(container.tabRepository.openOrJoinTab).toHaveBeenCalledWith('bar-1');
    expect(result).toEqual({ tab: { id: 'tab-resultado' }, alreadyOpen: false });
  });
});
