import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { ProtectedRoute } from '../ProtectedRoute';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAuth = vi.hoisted(() => ({ value: {} as ReturnType<typeof createMockAuthValue> }));

vi.mock('../../auth', () => ({
  useAuth: () => mockAuth.value,
}));

function LoginProbe() {
  const from = (useLocation().state as { from?: string } | null)?.from;
  return <p>Login desde {from}</p>;
}

function renderRoute() {
  renderWithProviders(
    <MemoryRouter initialEntries={['/media']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/media" element={<p>Mi lista</p>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuth.value = createMockAuthValue();
  });

  it('deja pasar a un usuario con sesión', () => {
    renderRoute();

    expect(screen.getByText('Mi lista')).toBeInTheDocument();
  });

  it('no muestra nada protegido mientras verifica la sesión', () => {
    mockAuth.value = createMockAuthValue({ user: null, isLoading: true });
    renderRoute();

    expect(screen.queryByText('Mi lista')).not.toBeInTheDocument();
    expect(screen.queryByText('Login desde /media')).not.toBeInTheDocument();
  });

  it('redirige al login, recordando la ruta, si no hay sesión ni error', () => {
    mockAuth.value = createMockAuthValue({ user: null });
    renderRoute();

    expect(screen.getByText('Login desde /media')).toBeInTheDocument();
  });

  it.each([401, 403])('redirige al login si la API rechazó la sesión con un %i', status => {
    mockAuth.value = createMockAuthValue({
      user: null,
      error: new ApiError('La sesión ya no es válida', status),
    });
    renderRoute();

    expect(screen.getByText('Login desde /media')).toBeInTheDocument();
  });

  it.each([
    ['un 503', new ApiError('Servicio no disponible', 503)],
    ['un 429', new ApiError('Demasiados intentos', 429)],
    ['un error de red', new TypeError('Failed to fetch')],
  ])('muestra un error con reintento, sin redirigir, ante %s', async (_label, error) => {
    const retry = vi.fn().mockResolvedValue(undefined);
    mockAuth.value = createMockAuthValue({
      user: null,
      error,
      retry,
    });
    renderRoute();

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos verificar tu sesión');
    expect(screen.queryByText('Login desde /media')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
