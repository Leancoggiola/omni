import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '@/shared/api';

import { useAccountActions } from '../hooks/useAccountActions';

import { act, renderHook } from '@testing-library/react';

const patch = vi.fn();

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  api: { patch: (...args: unknown[]) => patch(...args), delete: vi.fn() },
}));

describe('useAccountActions · changePassword', () => {
  beforeEach(() => {
    patch.mockReset().mockResolvedValue({ message: 'ok' });
  });

  it('envía la contraseña actual y la nueva en el PATCH', async () => {
    const { result } = renderHook(() => useAccountActions());

    await act(async () => {
      await result.current.changePassword({ currentPassword: 'actual-123', newPassword: 'nueva-clave-1' });
    });

    expect(patch).toHaveBeenCalledWith(SWR_KEYS.users.password, {
      currentPassword: 'actual-123',
      newPassword: 'nueva-clave-1',
    });
  });

  it('propaga el error de la API y deja de marcar la mutación en curso', async () => {
    patch.mockRejectedValue(new Error('La contraseña actual es incorrecta'));
    const { result } = renderHook(() => useAccountActions());

    await act(async () => {
      await expect(
        result.current.changePassword({ currentPassword: 'mal', newPassword: 'nueva-clave-1' })
      ).rejects.toThrow('La contraseña actual es incorrecta');
    });

    expect(result.current.isMutating).toBe(false);
  });
});
