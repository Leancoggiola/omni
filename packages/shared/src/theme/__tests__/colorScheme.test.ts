import { describe, expect, it } from 'vitest';

import { parseColorSchemeHint, resolveColorScheme } from '..';

describe('resolveColorScheme', () => {
  it('el override pisa al tema del perfil', () => {
    expect(resolveColorScheme({ override: 'dark', profileTheme: 'light', system: 'light' })).toBe('dark');
  });

  it('sin override usa el tema del perfil', () => {
    expect(resolveColorScheme({ override: null, profileTheme: 'dark', system: 'light' })).toBe('dark');
  });

  it('con tema auto o sin sesión sigue al sistema', () => {
    expect(resolveColorScheme({ override: null, profileTheme: 'auto', system: 'dark' })).toBe('dark');
    expect(resolveColorScheme({ override: null, profileTheme: null, system: 'light' })).toBe('light');
  });

  it('el sistema puede ser "auto" para que lo resuelva quien aplica el tema', () => {
    expect(resolveColorScheme({ override: null, profileTheme: 'auto', system: 'auto' })).toBe('auto');
  });
});

describe('parseColorSchemeHint', () => {
  it('devuelve el tema guardado si es válido', () => {
    expect(parseColorSchemeHint('dark')).toBe('dark');
    expect(parseColorSchemeHint('auto')).toBe('auto');
  });

  it('sin valor o con uno desconocido devuelve null', () => {
    expect(parseColorSchemeHint(null)).toBeNull();
    expect(parseColorSchemeHint(undefined)).toBeNull();
    expect(parseColorSchemeHint('sepia')).toBeNull();
  });
});
