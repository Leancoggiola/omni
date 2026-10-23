import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSessionColorScheme, setSessionColorScheme } from '../sessionColorScheme';
import { createSessionColorSchemeManager, LEGACY_COLOR_SCHEME_KEY } from '../sessionColorSchemeManager';

describe('createSessionColorSchemeManager', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin override de sesión devuelve el default del provider', () => {
    const manager = createSessionColorSchemeManager();
    expect(manager.get('auto')).toBe('auto');
  });

  it('prioriza el override de la sesión', () => {
    setSessionColorScheme('dark');
    const manager = createSessionColorSchemeManager();
    expect(manager.get('auto')).toBe('dark');

    clearSessionColorScheme();
    expect(manager.get('auto')).toBe('auto');
  });

  it('borra el valor que dejaba el manager de localStorage de Mantine', () => {
    localStorage.setItem(LEGACY_COLOR_SCHEME_KEY, 'dark');
    const manager = createSessionColorSchemeManager();
    expect(localStorage.getItem(LEGACY_COLOR_SCHEME_KEY)).toBeNull();
    expect(manager.get('auto')).toBe('auto');
  });

  it('set no persiste nada (el tema del perfil no es un override)', () => {
    const manager = createSessionColorSchemeManager();
    manager.set('dark');
    expect(manager.get('auto')).toBe('auto');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('no se suscribe a cambios de otras pestañas', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const manager = createSessionColorSchemeManager();
    const onUpdate = vi.fn();

    manager.subscribe(onUpdate);
    window.dispatchEvent(new StorageEvent('storage', { key: LEGACY_COLOR_SCHEME_KEY, newValue: 'dark' }));
    manager.unsubscribe();

    expect(addEventListener).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('clear no toca el override de sesión', () => {
    setSessionColorScheme('light');
    const manager = createSessionColorSchemeManager();
    manager.clear();
    expect(manager.get('auto')).toBe('light');
  });

  it('tolera un storage inaccesible', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const manager = createSessionColorSchemeManager();
    expect(manager.get('auto')).toBe('auto');
  });
});
