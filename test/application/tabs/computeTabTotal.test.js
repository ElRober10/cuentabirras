import { computeTabTotalCents, hasMissingPrices } from '../../../src/application/tabs/computeTabTotal';

describe('computeTabTotalCents', () => {
  it('suma precio × cantidad de cada bebida', () => {
    const items = [
      { priceCentsAtAdd: 250, quantity: 2 },
      { priceCentsAtAdd: 100, quantity: 1 },
    ];
    expect(computeTabTotalCents(items)).toBe(600);
  });

  it('devuelve 0 para una cuenta vacía', () => {
    expect(computeTabTotalCents([])).toBe(0);
  });

  it('ignora (no suma) las bebidas sin precio', () => {
    const items = [
      { priceCentsAtAdd: null, quantity: 3 },
      { priceCentsAtAdd: 200, quantity: 1 },
    ];
    expect(computeTabTotalCents(items)).toBe(200);
  });
});

describe('hasMissingPrices', () => {
  it('es true si alguna bebida no tiene precio', () => {
    const items = [
      { priceCentsAtAdd: 250, quantity: 1 },
      { priceCentsAtAdd: null, quantity: 1 },
    ];
    expect(hasMissingPrices(items)).toBe(true);
  });

  it('es false si todas las bebidas tienen precio', () => {
    const items = [
      { priceCentsAtAdd: 250, quantity: 1 },
      { priceCentsAtAdd: 100, quantity: 2 },
    ];
    expect(hasMissingPrices(items)).toBe(false);
  });

  it('es false para una cuenta vacía', () => {
    expect(hasMissingPrices([])).toBe(false);
  });
});
