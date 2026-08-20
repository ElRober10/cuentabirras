jest.mock('../../../src/di/container', () => ({
  container: {
    catalogRepository: {
      listByBar: jest.fn(),
      getPopularity: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { listCatalogSortedByPopularity } from '../../../src/application/catalog/listCatalogSortedByPopularity';

function item(id, name) {
  return { id, name };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listCatalogSortedByPopularity', () => {
  it('ordena primero por lo que más pide el propio usuario', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([
      item('a', 'Caña'),
      item('b', 'Tinto'),
    ]);
    container.catalogRepository.getPopularity.mockResolvedValue([
      { catalog_item_id: 'a', my_quantity: 1, total_quantity: 5 },
      { catalog_item_id: 'b', my_quantity: 3, total_quantity: 3 },
    ]);

    const result = await listCatalogSortedByPopularity('bar-1');

    expect(result.map((i) => i.id)).toEqual(['b', 'a']);
    expect(container.catalogRepository.listByBar).toHaveBeenCalledWith('bar-1');
    expect(container.catalogRepository.getPopularity).toHaveBeenCalledWith('bar-1');
  });

  it('a igualdad de pedidos propios, desempata por popularidad total del grupo', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([
      item('a', 'Caña'),
      item('b', 'Tinto'),
    ]);
    container.catalogRepository.getPopularity.mockResolvedValue([
      { catalog_item_id: 'a', my_quantity: 0, total_quantity: 2 },
      { catalog_item_id: 'b', my_quantity: 0, total_quantity: 9 },
    ]);

    const result = await listCatalogSortedByPopularity('bar-1');

    expect(result.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('trata como 0 pedidos las bebidas sin fila de popularidad, y desempata alfabético', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([item('a', 'Zeta'), item('b', 'Alfa')]);
    container.catalogRepository.getPopularity.mockResolvedValue([]);

    const result = await listCatalogSortedByPopularity('bar-1');

    expect(result.map((i) => i.name)).toEqual(['Alfa', 'Zeta']);
  });
});
