import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { LoginPage } from '../login.page';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockLogin = vi.fn();
const mockEnsureServerAwake = vi.fn();

vi.mock('@/core/auth', () => ({
  useAuth: () => createMockAuthValue({ login: mockLogin }),
}));

vi.mock('@/shared/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ensureServerAwake: () => mockEnsureServerAwake(),
}));

const renderPage = () =>
  renderWithProviders(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockEnsureServerAwake.mockReset().mockResolvedValue(true);
  });

  it('resalta Omni en el título de bienvenida', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2 }).querySelector('span')).toHaveTextContent(/^Omni$/);
  });

  it('al montar sondea el health para despertar la API', () => {
    renderPage();
    expect(mockEnsureServerAwake).toHaveBeenCalledTimes(1);
  });

  it('mientras envía deshabilita usuario, contraseña y el botón de mostrarla', async () => {
    let finish!: () => void;
    mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderPage();

    await userEvent.type(screen.getByLabelText('Usuario'), 'admin01');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin01', 'secreto'));
    expect(screen.getByLabelText('Usuario')).toBeDisabled();
    expect(screen.getByLabelText('Contraseña')).toBeDisabled();
    expect(screen.getByRole('button', { name: /mostrar|ocultar|toggle/i, hidden: true })).toBeDisabled();

    await act(async () => finish());
    expect(screen.getByLabelText('Usuario')).toBeEnabled();
    expect(screen.getByLabelText('Contraseña')).toBeEnabled();
  });

  it('si el login falla, el foco vuelve a la contraseña', async () => {
    mockLogin.mockRejectedValue(new ApiError('Usuario o contraseña incorrectos', 401));
    renderPage();

    await userEvent.type(screen.getByLabelText('Usuario'), 'admin01');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala-clave');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Usuario o contraseña incorrectos')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Contraseña')).toHaveFocus());
  });
});
