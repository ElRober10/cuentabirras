jest.mock('../../../src/di/container', () => ({
  container: {
    catalogRepository: {
      listByBar: jest.fn(),
      getPopularity: jest.fn(),
      getIconPopularity: jest.fn(),
      updatePrice: jest.fn(),
      createItem: jest.fn(),
    },
    tabItemRepository: { listByTab: jest.fn(), removeOneUnit: jest.fn() },
    accountLinkRepository: { getMyLink: jest.fn(), unlink: jest.fn() },
    tabRepository: { closeTab: jest.fn() },
  },
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { container } from '../../../src/di/container';
import { useTabScreen } from '../../../src/presentation/hooks/useTabScreen';

// Este hook es la extracción de TODA la lógica de la pantalla de una cuenta
// abierta (antes vivía dentro de bars/[barId]/tab/[tabId].jsx, más de 480
// líneas mezclando datos y JSX). Estos tests se centran en lo que más
// puede romperse en silencio: cómo se combinan las 4 fuentes de datos en
// las filas del recibo — el resto (cada mutación por separado) ya se
// prueba indirectamente al usarse en la pantalla.

function catalogItem(overrides) {
  return { id: 'item-1', name: 'Caña', icon: 'cana', category: 'bebida', priceCents: 200, ...overrides };
}

function tabItem(overrides) {
  return { catalogItemId: 'item-1', quantity: 1, priceCentsAtAdd: 200, createdAt: '2026-01-01T10:00:00Z', ...overrides };
}

function renderUseTabScreen(props = { barId: 'bar-1', tabId: 'tab-1' }) {
  // retry:false para no esperar reintentos, gcTime:0 para que react-query no
  // deje temporizadores de "recolección de caché" colgando tras el test
  // (por defecto 5 minutos — hacía que Jest no terminara de salir).
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useTabScreen(props), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  container.catalogRepository.getPopularity.mockResolvedValue([]);
  container.catalogRepository.getIconPopularity.mockResolvedValue([]);
  container.accountLinkRepository.getMyLink.mockResolvedValue(null);
});

describe('useTabScreen', () => {
  it('arma una fila del recibo por cada bebida con unidades, con su cantidad total', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([catalogItem()]);
    container.tabItemRepository.listByTab.mockResolvedValue([
      tabItem({ quantity: 2 }),
      tabItem({ quantity: 1 }),
    ]);

    const { result } = await renderUseTabScreen();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tabRows).toEqual([{ catalogItem: catalogItem(), quantity: 3 }]);
  });

  it('no incluye bebidas del catálogo que todavía no tienen ninguna unidad en la cuenta', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([
      catalogItem({ id: 'item-1' }),
      catalogItem({ id: 'item-2', name: 'Tercio' }),
    ]);
    container.tabItemRepository.listByTab.mockResolvedValue([tabItem({ catalogItemId: 'item-1' })]);

    const { result } = await renderUseTabScreen();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tabRows.map((row) => row.catalogItem.id)).toEqual(['item-1']);
  });

  it('calcula el total y si faltan precios a partir de las unidades de la cuenta', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([catalogItem()]);
    container.tabItemRepository.listByTab.mockResolvedValue([
      tabItem({ priceCentsAtAdd: 200, quantity: 2 }),
      tabItem({ priceCentsAtAdd: null, quantity: 1 }),
    ]);

    const { result } = await renderUseTabScreen();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalCents).toBe(400);
    expect(result.current.missingPrices).toBe(true);
  });

  it('aplana las marcas de tiempo por unidad, en el mismo orden en que se añadieron', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([catalogItem()]);
    container.tabItemRepository.listByTab.mockResolvedValue([
      tabItem({ quantity: 2, createdAt: 'T1' }),
      tabItem({ quantity: 1, createdAt: 'T2' }),
    ]);

    const { result } = await renderUseTabScreen();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.timestampsByItem['item-1']).toEqual(['T1', 'T1', 'T2']);
  });

  it('expone si hay una cuenta vinculada, para el aviso de "Vinculada con..."', async () => {
    container.catalogRepository.listByBar.mockResolvedValue([]);
    container.tabItemRepository.listByTab.mockResolvedValue([]);
    container.accountLinkRepository.getMyLink.mockResolvedValue({ linkId: 'l1', partnerFirstName: 'Miriam' });

    const { result } = await renderUseTabScreen();

    await waitFor(() => expect(result.current.linkPartnerFirstName).toBe('Miriam'));
  });
});
