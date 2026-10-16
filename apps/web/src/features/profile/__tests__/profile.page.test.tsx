import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, renderWithProviders } from '@/__tests__/helpers';

import { ProfilePage } from '../profile.page';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  auth: {} as ReturnType<typeof createMockAuthValue>,
  deleteAccount: vi.fn(),
}));

vi.mock('@/core/auth', () => ({ useAuth: () => mocks.auth }));

vi.mock('../modules', () => ({
  DeleteAccountButton: ({ onDelete }: { onDelete: () => Promise<void> }) => (
    <button onClick={() => void onDelete().catch(() => undefined)}>Eliminar cuenta</button>
  ),
  PasswordForm: () => null,
  ProfilePhotoSection: () => null,
  ProfileSectionCard: () => null,
  ProfileSettingsForm: () => null,
  useAccountActions: () => ({ changePassword: vi.fn(), deleteAccount: mocks.deleteAccount }),
  useProfile: () => ({
    profile: { name: 'Ana', avatarUrl: null, updatedAt: 'x' },
    isLoading: false,
    isMutating: false,
    error: undefined,
    updateProfile: vi.fn(),
    updatePreferences: vi.fn(),
  }),
}));

function renderProfile() {
  renderWithProviders(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage: eliminar cuenta', () => {
  const clearSession = vi.fn();
  const logout = vi.fn();

  beforeEach(() => {
    clearSession.mockReset().mockResolvedValue(undefined);
    logout.mockReset().mockResolvedValue(undefined);
    mocks.deleteAccount.mockReset().mockResolvedValue(undefined);
    mocks.auth = createMockAuthValue({ clearSession, logout });
  });

  it('limpia la sesión local y va al login, sin llamar a /logout', async () => {
    renderProfile();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }));

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(mocks.deleteAccount).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
  });

  it('si el DELETE falla, conserva la sesión local y se queda en el perfil', async () => {
    mocks.deleteAccount.mockRejectedValue(new Error('Servicio no disponible'));
    renderProfile();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }));

    await waitFor(() => expect(mocks.deleteAccount).toHaveBeenCalledOnce());
    expect(clearSession).not.toHaveBeenCalled();
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
  });
});
