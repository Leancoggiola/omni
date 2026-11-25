import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COLOR_SCHEME_HINT_KEY, colorSchemeBootScript, SESSION_COLOR_SCHEME_KEY } from '../colorSchemeBoot';

/** Corre el script de `index.html` con el sistema en `system`. */
function runBootScript(system: 'light' | 'dark') {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: system === 'dark' && query.includes('dark') }));
  new Function(colorSchemeBootScript())();
  return document.documentElement.getAttribute('data-mantine-color-scheme');
}

describe('colorSchemeBootScript', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.removeAttribute('data-mantine-color-scheme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('el override de la sesión pisa a la pista y al sistema', () => {
    sessionStorage.setItem(SESSION_COLOR_SCHEME_KEY, 'dark');
    localStorage.setItem(COLOR_SCHEME_HINT_KEY, 'light');
    expect(runBootScript('light')).toBe('dark');
  });

  it('sin override usa la pista del tema del perfil', () => {
    localStorage.setItem(COLOR_SCHEME_HINT_KEY, 'dark');
    expect(runBootScript('light')).toBe('dark');
  });

  it('con la pista en auto o sin pista sigue al sistema', () => {
    localStorage.setItem(COLOR_SCHEME_HINT_KEY, 'auto');
    expect(runBootScript('dark')).toBe('dark');

    localStorage.clear();
    expect(runBootScript('light')).toBe('light');
  });

  it('con el storage bloqueado sigue al sistema', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(runBootScript('dark')).toBe('dark');
  });
});
