import { prependBarToCache, removeBarFromCache } from '../../../src/application/bars/barsCache';

// La caché de ['bars'] guarda { bars, hiddenCount, radiusKm }, NO un array.
// Estos tests fijan que los helpers de actualización optimista respetan esa
// forma — el bug de "crear bar / borrar bar reventaba" fue justo esto: código
// que esparcía/filtraba un array sobre ese objeto.

const CACHE = {
  bars: [{ id: 'a', name: 'Bar A' }, { id: 'b', name: 'Bar B' }],
  hiddenCount: 3,
  radiusKm: 2,
};

describe('prependBarToCache', () => {
  it('mete el bar nuevo el primero y conserva el resto del objeto', () => {
    const result = prependBarToCache(CACHE, { id: 'c', name: 'Bar C' });

    expect(result.bars.map((b) => b.id)).toEqual(['c', 'a', 'b']);
    expect(result.hiddenCount).toBe(3);
    expect(result.radiusKm).toBe(2);
  });

  it('devuelve un objeto con forma válida aunque no hubiera caché todavía', () => {
    const result = prependBarToCache(undefined, { id: 'c', name: 'Bar C' });

    expect(result.bars.map((b) => b.id)).toEqual(['c']);
    expect(result.hiddenCount).toBe(0);
    expect(result).toHaveProperty('radiusKm');
  });

  it('no muta la caché original', () => {
    prependBarToCache(CACHE, { id: 'c', name: 'Bar C' });
    expect(CACHE.bars.map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('removeBarFromCache', () => {
  it('quita el bar por id y conserva el resto del objeto', () => {
    const result = removeBarFromCache(CACHE, 'a');

    expect(result.bars.map((b) => b.id)).toEqual(['b']);
    expect(result.hiddenCount).toBe(3);
    expect(result.radiusKm).toBe(2);
  });

  it('deja la caché intacta (undefined) si aún no se ha cargado', () => {
    expect(removeBarFromCache(undefined, 'a')).toBeUndefined();
  });

  it('no muta la caché original', () => {
    removeBarFromCache(CACHE, 'a');
    expect(CACHE.bars.map((b) => b.id)).toEqual(['a', 'b']);
  });
});
