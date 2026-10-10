import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setSessionColorScheme } from '../sessionColorScheme';
import { useSyncColorScheme } from '../useSyncColorScheme';

import { renderHook } from '@testing-library/react';

const setColorScheme = vi.fn();
let mockUser: { theme: 'light' | 'dark' } | null = null;

vi.mock('@mantine/core', () => ({
  useMantineColorScheme: () => ({ setColorScheme }),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('useSyncColorScheme', () => {
  beforeEach(() => {
    setColorScheme.mockClear();
    sessionStorage.clear();
    mockUser = null;
  });

  it('aplica el tema del perfil al iniciar sesión', () => {
    mockUser = { theme: 'dark' };
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('prioriza el tema elegido con el toggle durante la sesión', () => {
    setSessionColorScheme('light');
    mockUser = { theme: 'dark' };
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).toHaveBeenCalledWith('light');
  });

  it('al cerrar sesión con override no toca el tema y el próximo login aplica el del perfil', () => {
    setSessionColorScheme('dark');
    mockUser = { theme: 'light' };
    const { rerender } = renderHook(() => useSyncColorScheme());
    setColorScheme.mockClear();

    mockUser = null;
    rerender();

    sessionStorage.clear(); // lo que hace login() antes de que se aplique el tema del perfil
    mockUser = { theme: 'light' };
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('al cerrar sesión sin override vuelve al tema por defecto', () => {
    mockUser = { theme: 'dark' };
    const { rerender } = renderHook(() => useSyncColorScheme());

    mockUser = null;
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');
  });

  it('contrato: si el override sigue presente al reloguear, el hook lo aplica (por eso login() lo descarta antes)', () => {
    setSessionColorScheme('dark');
    mockUser = { theme: 'light' };
    const { rerender } = renderHook(() => useSyncColorScheme());
    mockUser = null;
    rerender();
    setColorScheme.mockClear();

    mockUser = { theme: 'light' };
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
  });

  it('sin sesión previa no toca el tema', () => {
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).not.toHaveBeenCalled();
  });
});
