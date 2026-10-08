import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { UserRow } from '../UserRow';

import type { AdminUser } from '@omni/shared/users';

import { screen } from '@testing-library/react';

const baseUser: AdminUser = {
  id: 'u1',
  username: 'usuario01',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  role: 'USER',
  avatarUrl: null,
  createdAt: '2026-02-23T10:00:00.000Z',
};

function renderRow(user: Partial<AdminUser> = {}) {
  return renderWithProviders(
    <ul>
      <UserRow user={{ ...baseUser, ...user }} onDelete={vi.fn()} />
    </ul>
  );
}

describe('UserRow', () => {
  it('muestra nombre, usuario, email, rol y fecha de alta', () => {
    renderRow();

    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('@usuario01 · ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('Alta 23/02/2026')).toBeInTheDocument();
  });

  it('ofrece eliminar a un USER', () => {
    renderRow();

    expect(screen.getByRole('button', { name: 'Eliminar usuario01' })).toBeInTheDocument();
  });

  it('no ofrece eliminar a un ADMIN', () => {
    renderRow({ role: 'ADMIN' });

    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });
});
