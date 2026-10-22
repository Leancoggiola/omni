import { describe, expect, it } from 'vitest';

import { resolveColorScheme } from '..';

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
