import { centsToEuros, eurosToCents } from '../../../src/shared/utils/money';

describe('eurosToCents', () => {
  it('convierte con coma decimal', () => {
    expect(eurosToCents('2,50')).toBe(250);
  });

  it('convierte con punto decimal', () => {
    expect(eurosToCents('2.50')).toBe(250);
  });

  it('acepta números enteros', () => {
    expect(eurosToCents('3')).toBe(300);
  });

  it('redondea hacia abajo al céntimo más cercano', () => {
    expect(eurosToCents('2,004')).toBe(200);
  });

  it('redondea hacia arriba al céntimo más cercano', () => {
    expect(eurosToCents('2,006')).toBe(201);
  });

  it('quita espacios sueltos', () => {
    expect(eurosToCents(' 2,50 ')).toBe(250);
  });

  it('devuelve null si no es un número', () => {
    expect(eurosToCents('abc')).toBeNull();
  });

  // Number('') es 0 en JS (no NaN), así que un campo vacío se trata como
  // "0 €" válido en vez de "sin rellenar" — documentamos el comportamiento
  // real, aunque como UX pueda sorprender.
  it('trata el campo vacío como 0, no como valor inválido', () => {
    expect(eurosToCents('')).toBe(0);
  });

  it('devuelve null para valores negativos', () => {
    expect(eurosToCents('-1')).toBeNull();
  });

  it('acepta 0 como precio válido', () => {
    expect(eurosToCents('0')).toBe(0);
  });
});

describe('centsToEuros', () => {
  it('formatea con coma y dos decimales', () => {
    expect(centsToEuros(250)).toBe('2,50');
  });

  it('rellena con ceros los céntimos exactos', () => {
    expect(centsToEuros(300)).toBe('3,00');
  });

  it('formatea cero', () => {
    expect(centsToEuros(0)).toBe('0,00');
  });

  it('es el inverso de eurosToCents para valores típicos', () => {
    expect(centsToEuros(eurosToCents('4,25'))).toBe('4,25');
  });
});
