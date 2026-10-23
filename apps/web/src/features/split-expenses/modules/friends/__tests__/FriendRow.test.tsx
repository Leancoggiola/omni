import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { FriendRow } from '../components/FriendsModal/FriendRow';

import type { SplitFriend } from '@omni/shared/split-expenses';

import { screen } from '@testing-library/react';

const friend: SplitFriend = {
  id: 'f1',
  name: 'Ana',
  alias: 'anita',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('FriendRow', () => {
  it('los botones de la fila incluyen el nombre del amigo', () => {
    renderWithProviders(<FriendRow friend={friend} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Editar a Ana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar a Ana' })).toBeInTheDocument();
  });
});
