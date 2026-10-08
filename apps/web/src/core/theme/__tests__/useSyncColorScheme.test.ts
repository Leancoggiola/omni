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

  it('al cerrar sesión vuelve al tema por defecto y el próximo login aplica el del perfil', () => {
    mockUser = { theme: 'dark' };
    const { rerender } = renderHook(() => useSyncColorScheme());

    mockUser = null;
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');

    mockUser = { theme: 'light' };
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('sin sesión previa no toca el tema', () => {
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).not.toHaveBeenCalled();
  });
});
