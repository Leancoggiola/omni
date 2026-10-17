import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { FriendsModal } from '../components/FriendsModal';

import { fireEvent, screen } from '@testing-library/react';

const mutate = vi.hoisted(() => vi.fn());

vi.mock('../../_shared', () => ({
  useSplitExpensesMutations: () => ({ createFriend: vi.fn(), updateFriend: vi.fn(), deleteFriend: vi.fn() }),
}));

vi.mock('../hooks', () => ({
  useSplitFriends: () => ({ items: [], isLoading: false, error: new Error('x'), mutate }),
  useSplitFriendsSuggest: () => ({ items: [] }),
}));

describe('FriendsModal', () => {
  it('si falla la carga ofrece reintentar', () => {
    renderWithProviders(<FriendsModal opened onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mutate).toHaveBeenCalledOnce();
  });
});
