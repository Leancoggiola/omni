import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, createMockSessionUser, renderWithProviders } from '@/__tests__/helpers';

import { AdminRoute } from '../AdminRoute';

import { screen } from '@testing-library/react';

const mockAuth = vi.hoisted(() => ({ role: 'USER' as 'USER' | 'ADMIN' }));

vi.mock('../../auth', () => ({
  useAuth: () => createMockAuthValue({ user: createMockSessionUser({ role: mockAuth.role }) }),
}));

function renderAdminRoute() {
  renderWithProviders(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>Panel admin</p>} />
        </Route>
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('redirige a inicio a un usuario sin rol ADMIN', () => {
    mockAuth.role = 'USER';
    renderAdminRoute();

    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Panel admin')).not.toBeInTheDocument();
  });

  it('deja pasar a un ADMIN', () => {
    mockAuth.role = 'ADMIN';
    renderAdminRoute();

    expect(screen.getByText('Panel admin')).toBeInTheDocument();
  });
});
