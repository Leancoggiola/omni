import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, createMockSessionUser, renderWithProviders } from '@/__tests__/helpers';

import { Navbar } from '../Navbar';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAuth = vi.hoisted(() => ({ role: 'USER' as 'USER' | 'ADMIN' }));

vi.mock('@/core/auth', () => ({
  useAuth: () => createMockAuthValue({ user: createMockSessionUser({ role: mockAuth.role }) }),
}));

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

function renderNavbar({ path = '/', onClose = vi.fn() } = {}) {
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <AppShell navbar={{ width: 300, breakpoint: 'md' }}>
        <Navbar onClose={onClose} toggle={vi.fn()} />
      </AppShell>
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );
  return { onClose };
}

describe('Navbar', () => {
  it('renderiza los ítems habilitados como links con href', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/profile');
  });

  it('marca el ítem de la ruta actual con aria-current', () => {
    renderNavbar({ path: '/profile' });
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it.each(['Gimnasio', 'Gastos', 'PC Control', 'Alacena'])('deja %s deshabilitado y sin destino', label => {
    renderNavbar();
    const item = screen.getByRole('link', { name: label });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).not.toHaveAttribute('href');
  });

  it('navega y cierra el navbar al elegir un ítem', async () => {
    const { onClose } = renderNavbar();
    await userEvent.click(screen.getByRole('link', { name: 'Perfil' }));
    expect(screen.getByRole('status', { name: 'Ruta actual' })).toHaveTextContent('/profile');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('muestra la sección de administración solo a admins', () => {
    renderNavbar();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();

    mockAuth.role = 'ADMIN';
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin');
    mockAuth.role = 'USER';
  });
});
