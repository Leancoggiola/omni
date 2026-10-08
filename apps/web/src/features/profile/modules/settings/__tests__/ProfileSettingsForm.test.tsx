import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';
import { getSessionColorScheme, setSessionColorScheme } from '@/core/theme/sessionColorScheme';

import { ProfileSettingsForm } from '../components/ProfileSettingsForm';

import type { UserProfile } from '@omni/shared/users';

import { fireEvent, screen, waitFor } from '@testing-library/react';

const profile: UserProfile = {
  id: 'u1',
  username: 'maria',
  name: 'María',
  email: null,
  role: 'USER',
  avatarUrl: null,
  phone: null,
  birthDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  preferences: {
    id: 'p1',
    userId: 'u1',
    notifications: false,
    theme: 'light',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

const saveButton = () => screen.getByRole('button', { name: 'Guardar Cambios' });

describe('ProfileSettingsForm', () => {
  const onSave = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    onSave.mockReset().mockResolvedValue(undefined);
  });

  it('guardar otro campo no descarta el tema elegido con el toggle', async () => {
    setSessionColorScheme('dark');
    renderWithProviders(<ProfileSettingsForm profile={profile} isSaving={false} onSave={onSave} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Notificaciones' }));
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0].preferences).toEqual({ notifications: true });
    expect(getSessionColorScheme()).toBe('dark');
  });

  it('guardar el tema reemplaza al override de la sesión', async () => {
    setSessionColorScheme('light');
    renderWithProviders(<ProfileSettingsForm profile={profile} isSaving={false} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText('Tema', { selector: 'input' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Oscuro' }));
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0].preferences).toEqual({ theme: 'dark' });
    await waitFor(() => expect(getSessionColorScheme()).toBeNull());
  });

  it('tras guardar, el botón vuelve a quedar deshabilitado aunque no cambie la key del form', async () => {
    renderWithProviders(<ProfileSettingsForm profile={profile} isSaving={false} onSave={onSave} />);
    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('switch', { name: 'Notificaciones' }));
    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());

    await waitFor(() => expect(saveButton()).toBeDisabled());
  });
});
