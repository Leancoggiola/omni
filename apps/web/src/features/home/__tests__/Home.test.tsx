import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, createMockSessionUser, renderWithProviders } from '@/__tests__/helpers';

import { HomePage } from '../home.page';

import { screen } from '@testing-library/react';

vi.mock('@/core/auth', () => ({
  useAuth: () =>
    createMockAuthValue({
      user: createMockSessionUser({ name: 'María', username: 'maria', email: null, role: 'USER', avatarUrl: null }),
    }),
}));

vi.mock('../hooks/useTodayHolidays', () => ({
  useTodayHolidays: () => ({
    holidays: { date: '2026-10-07', month: '10', day: '07', count: 0, sourceUrl: 'https://wikipedia.org', items: [] },
    isLoading: false,
    error: undefined,
  }),
}));

vi.mock('../hooks/useWatchingMedia', () => ({
  WATCHING_LIMIT: 3,
  useWatchingMedia: () => ({ items: [], isLoading: false, error: undefined, mutate: vi.fn() }),
}));

const renderHome = () =>
  renderWithProviders(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );

describe('HomePage', () => {
  it('muestra el nombre del usuario autenticado', () => {
    renderHome();
    expect(screen.getByText('María')).toBeInTheDocument();
  });

  it('el saludo y el nombre forman el h1 de la página', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/María/);
  });

  it('incluye la tarjeta fija "Seguís viendo"', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Seguís viendo' })).toBeInTheDocument();
  });

  it('muestra un saludo según la hora', () => {
    renderHome();
    expect(screen.getByText(/Buenos días|Buenas tardes|Buenas noches/)).toBeInTheDocument();
  });
});
