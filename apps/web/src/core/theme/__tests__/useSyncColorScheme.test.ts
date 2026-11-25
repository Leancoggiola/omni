import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getColorSchemeHint, setColorSchemeHint } from '../colorSchemeHint';
import { setSessionColorScheme } from '../sessionColorScheme';
import { useSyncColorScheme } from '../useSyncColorScheme';

import { renderHook } from '@testing-library/react';

const setColorScheme = vi.fn();
let mockUser: { theme: 'light' | 'dark' | 'auto' } | null = null;
let mockLoading = false;
let mockError: Error | undefined;
let mockScheme: 'light' | 'dark' | 'auto' = 'auto';

vi.mock('@mantine/core', () => ({
  useMantineColorScheme: () => ({ colorScheme: mockScheme, setColorScheme }),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: mockLoading, error: mockError }),
}));

describe('useSyncColorScheme', () => {
  beforeEach(() => {
    setColorScheme.mockClear();
    sessionStorage.clear();
    localStorage.clear();
    mockUser = null;
    mockLoading = false;
    mockError = undefined;
    mockScheme = 'auto';
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
    mockScheme = 'dark';
    setColorScheme.mockClear();

    mockUser = null;
    rerender();
    expect(setColorScheme).not.toHaveBeenCalled();

    sessionStorage.clear();
    mockUser = { theme: 'light' };
    rerender();
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('al cerrar sesión sin override vuelve al tema por defecto', () => {
    mockUser = { theme: 'dark' };
    const { rerender } = renderHook(() => useSyncColorScheme());
    mockScheme = 'dark';

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

  it('sin sesión y con el tema por defecto no toca el tema', () => {
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).not.toHaveBeenCalled();
  });

  it('guarda el tema del perfil como pista del primer pintado y la actualiza si cambia', () => {
    mockUser = { theme: 'dark' };
    const { rerender } = renderHook(() => useSyncColorScheme());
    expect(getColorSchemeHint()).toBe('dark');

    mockUser = { theme: 'auto' };
    rerender();
    expect(getColorSchemeHint()).toBe('auto');
  });

  it('mientras la sesión carga respeta la pista y no toca el tema', () => {
    setColorSchemeHint('dark');
    mockScheme = 'dark';
    mockLoading = true;
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).not.toHaveBeenCalled();
    expect(getColorSchemeHint()).toBe('dark');
  });

  it('con la sesión sin verificar conserva la pista y el tema', () => {
    setColorSchemeHint('dark');
    mockScheme = 'dark';
    mockError = new Error('sin red');
    renderHook(() => useSyncColorScheme());
    expect(setColorScheme).not.toHaveBeenCalled();
    expect(getColorSchemeHint()).toBe('dark');
  });

  it('sin sesión al cargar borra la pista de la persona anterior y vuelve al tema por defecto', () => {
    setColorSchemeHint('dark');
    mockScheme = 'dark';
    renderHook(() => useSyncColorScheme());
    expect(getColorSchemeHint()).toBeNull();
    expect(setColorScheme).toHaveBeenCalledWith('auto');
  });

  it('al cerrar sesión borra la pista', () => {
    mockUser = { theme: 'dark' };
    const { rerender } = renderHook(() => useSyncColorScheme());
    mockScheme = 'dark';

    mockUser = null;
    rerender();
    expect(getColorSchemeHint()).toBeNull();
  });
});
