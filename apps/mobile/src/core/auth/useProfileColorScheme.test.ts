import { act, renderHook } from '@testing-library/react-native';

import { useProfileColorScheme } from './useProfileColorScheme';

const mockSave = jest.fn();
const mockClear = jest.fn();
jest.mock('@/shared/api', () => ({
  saveColorSchemeHint: (theme: string) => mockSave(theme),
  clearColorSchemeHint: () => mockClear(),
}));

let mockAuth: { user: { theme: 'light' | 'dark' | 'auto' } | null; isLoading: boolean; isSessionUnverified: boolean };
jest.mock('./AuthContext', () => ({ useAuth: () => mockAuth }));

describe('useProfileColorScheme', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockClear.mockReset();
    mockAuth = { user: null, isLoading: true, isSessionUnverified: false };
  });

  it('mientras la sesión carga al abrir usa la pista y no la toca', async () => {
    const { result } = await renderHook(() => useProfileColorScheme('dark'));
    expect(result.current).toBe('dark');
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('con sesión usa el tema del perfil y lo guarda como pista', async () => {
    mockAuth = { user: { theme: 'light' }, isLoading: false, isSessionUnverified: false };
    const { result } = await renderHook(() => useProfileColorScheme('dark'));
    expect(result.current).toBe('light');
    expect(mockSave).toHaveBeenCalledWith('light');
  });

  it('sin sesión borra la pista y sigue al sistema, también en un login posterior que cargue', async () => {
    const { result, rerender } = await renderHook(() => useProfileColorScheme('dark'));
    mockAuth = { user: null, isLoading: false, isSessionUnverified: false };
    await rerender({});
    expect(result.current).toBeNull();
    expect(mockClear).toHaveBeenCalled();

    mockAuth = { user: null, isLoading: true, isSessionUnverified: false };
    await act(async () => rerender({}));
    expect(result.current).toBeNull();
  });

  it('con la sesión sin verificar conserva la pista', async () => {
    mockAuth = { user: null, isLoading: false, isSessionUnverified: true };
    await renderHook(() => useProfileColorScheme('dark'));
    expect(mockClear).not.toHaveBeenCalled();
  });
});
