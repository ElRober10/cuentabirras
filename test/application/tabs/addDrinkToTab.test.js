jest.mock('../../../src/di/container', () => ({
  container: {
    catalogRepository: {
      createItem: jest.fn(),
      updatePrice: jest.fn(),
    },
    tabItemRepository: {
      addItem: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { addDrinkToTab } from '../../../src/application/tabs/addDrinkToTab';

beforeEach(() => {
  jest.clearAllMocks();
  container.tabItemRepository.addItem.mockResolvedValue({ id: 'tab-item-1' });
});

describe('addDrinkToTab', () => {
  it('usa el precio actual del catálogo cuando la bebida ya existía', async () => {
    const existingItem = { id: 'item-1', priceCents: 250 };

    await addDrinkToTab({ tabId: 't1', barId: 'b1', existingItem, quantity: 2 });

    expect(container.catalogRepository.createItem).not.toHaveBeenCalled();
    expect(container.catalogRepository.updatePrice).not.toHaveBeenCalled();
    expect(container.tabItemRepository.addItem).toHaveBeenCalledWith({
      tabId: 't1',
      catalogItemId: 'item-1',
      priceCentsAtAdd: 250,
      quantity: 2,
    });
  });

  it('crea la bebida en el catálogo cuando es nueva en este bar', async () => {
    container.catalogRepository.createItem.mockResolvedValue({ id: 'item-nuevo', priceCents: 300 });

    await addDrinkToTab({
      tabId: 't1',
      barId: 'b1',
      newItem: { name: 'Mahou', category: 'beer', color: '#FFA500', priceCents: 300 },
    });

    expect(container.catalogRepository.createItem).toHaveBeenCalledWith({
      barId: 'b1',
      name: 'Mahou',
      category: 'beer',
      color: '#FFA500',
      icon: null,
      priceCents: 300,
    });
    expect(container.tabItemRepository.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ catalogItemId: 'item-nuevo', priceCentsAtAdd: 300 }),
    );
  });

  it('usa el precio corregido (override) y lo guarda de paso en el catálogo', async () => {
    const existingItem = { id: 'item-1', priceCents: 200 };

    await addDrinkToTab({ tabId: 't1', barId: 'b1', existingItem, priceCentsOverride: 250 });

    expect(container.catalogRepository.updatePrice).toHaveBeenCalledWith({
      catalogItemId: 'item-1',
      priceCents: 250,
    });
    expect(container.tabItemRepository.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ priceCentsAtAdd: 250 }),
    );
  });

  it('no actualiza el catálogo si el override coincide con el precio ya guardado', async () => {
    const existingItem = { id: 'item-1', priceCents: 250 };

    await addDrinkToTab({ tabId: 't1', barId: 'b1', existingItem, priceCentsOverride: 250 });

    expect(container.catalogRepository.updatePrice).not.toHaveBeenCalled();
  });

  it('lanza error si no hay precio disponible y no se permite precio ausente', async () => {
    const existingItem = { id: 'item-1', priceCents: null };

    await expect(addDrinkToTab({ tabId: 't1', barId: 'b1', existingItem })).rejects.toThrow(
      'Esta bebida todavía no tiene precio.',
    );
    expect(container.tabItemRepository.addItem).not.toHaveBeenCalled();
  });

  it('permite añadir sin precio si allowMissingPrice es true', async () => {
    const existingItem = { id: 'item-1', priceCents: null };

    await addDrinkToTab({ tabId: 't1', barId: 'b1', existingItem, allowMissingPrice: true });

    expect(container.tabItemRepository.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ priceCentsAtAdd: null }),
    );
  });
});
