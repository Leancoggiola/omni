import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, createMockSessionUser, renderWithProviders } from '@/__tests__/helpers';

import { HomePage } from '../../../home.page';

import { screen } from '@testing-library/react';

vi.mock('@/core/auth', () => ({
  useAuth: () =>
    createMockAuthValue({
      user: createMockSessionUser({ name: 'María', username: 'maria', email: null, role: 'USER', avatarUrl: null }),
    }),
}));

vi.mock('../hooks', () => ({
  useTodayHolidays: () => ({
    holidays: { date: '2026-10-07', month: '10', day: '07', count: 0, sourceUrl: 'https://wikipedia.org', items: [] },
    isLoading: false,
    error: undefined,
  }),
}));

describe('HomePage', () => {
  it('muestra el nombre del usuario autenticado', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('María')).toBeInTheDocument();
  });

  it('muestra un saludo según la hora', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Buenos días|Buenas tardes|Buenas noches/)).toBeInTheDocument();
  });
});
