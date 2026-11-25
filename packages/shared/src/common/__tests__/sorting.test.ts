import { describe, expect, it } from 'vitest';

import { compareNames } from '..';

const sorted = (names: string[]) => [...names].sort(compareNames);

describe('compareNames', () => {
  it('ordena alfabéticamente sin distinguir mayúsculas', () => {
    expect(sorted(['yerba', 'Arroz', 'leche', 'Fideos'])).toEqual(['Arroz', 'Fideos', 'leche', 'yerba']);
  });

  it('trata las vocales con tilde como la vocal sin tilde', () => {
    expect(sorted(['Azúcar', 'Árbol', 'Anana'])).toEqual(['Anana', 'Árbol', 'Azúcar']);
    expect(compareNames('Té', 'te')).toBe(0);
  });

  it('ubica la ñ después de la n y antes de la o', () => {
    expect(sorted(['Orégano', 'Ñoquis', 'Nuez'])).toEqual(['Nuez', 'Ñoquis', 'Orégano']);
  });

  it('ordena los números de forma natural', () => {
    expect(sorted(['Rocky 10', 'Rocky 2', '1917', '300'])).toEqual(['300', '1917', 'Rocky 2', 'Rocky 10']);
  });

  it('cuenta los artículos', () => {
    expect(sorted(['The Dark Knight', 'Fight Club', 'El Padrino'])).toEqual([
      'El Padrino',
      'Fight Club',
      'The Dark Knight',
    ]);
  });

  it('conserva el orden de entrada entre nombres equivalentes', () => {
    expect(sorted(['café', 'Cafe', 'Arroz'])).toEqual(['Arroz', 'café', 'Cafe']);
  });
});
