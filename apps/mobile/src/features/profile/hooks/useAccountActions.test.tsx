import { act, renderHook } from '@testing-library/react-native';

import { api } from '@/shared/api';
import { API_KEYS } from '@/shared/api/keys';

import { useAccountActions } from './useAccountActions';

jest.mock('@/shared/api', () => ({
  api: { patch: jest.fn(), delete: jest.fn() },
  API_KEYS: jest.requireActual('@/shared/api/keys').API_KEYS,
}));

const mockPatch = jest.mocked(api.patch);
const mockDelete = jest.mocked(api.delete);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAccountActions · changePassword', () => {
  it('envía la contraseña actual y la nueva en el PATCH', async () => {
    mockPatch.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useAccountActions());

    await act(async () => {
      await result.current.changePassword({ currentPassword: 'actual-123', newPassword: 'nueva-clave-1' });
    });

    expect(mockPatch).toHaveBeenCalledWith(API_KEYS.users.password, {
      currentPassword: 'actual-123',
      newPassword: 'nueva-clave-1',
    });
  });
});

describe('useAccountActions · deleteAccount', () => {
  it('borra la cuenta con un DELETE', async () => {
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountActions());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockDelete).toHaveBeenCalledWith(API_KEYS.users.account);
  });
});
