import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { MediaCard } from '../components/MediaCard';

import type { MediaItem } from '../../_shared/types';

import { TMDB_POSTER_W500 } from '@omni/shared/media';
import { fireEvent, screen } from '@testing-library/react';

const item: MediaItem = {
  id: 'm1',
  userId: 'u1',
  tmdbId: 603,
  mediaType: 'movie',
  title: 'The Matrix',
  posterPath: '/matrix.jpg',
  status: 'to_watch',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderCard = (value: MediaItem = item, onDelete = vi.fn()) =>
  renderWithProviders(<MediaCard item={value} onStatusChange={vi.fn()} onDelete={onDelete} />);

describe('MediaCard', () => {
  it('muestra eliminar sin necesidad de hover y lo dispara con el ítem', () => {
    const onDelete = vi.fn();
    renderCard(item, onDelete);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar The Matrix' }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  it('el póster usa la w500 con el título como alt', () => {
    renderCard();

    expect(screen.getByRole('img', { name: 'The Matrix' })).toHaveAttribute('src', `${TMDB_POSTER_W500}/matrix.jpg`);
  });

  it('si el póster falla muestra el ícono y al cambiar el posterPath lo vuelve a intentar', () => {
    const { rerender, container } = renderCard();

    fireEvent.error(screen.getByRole('img', { name: 'The Matrix' }));
    expect(container.querySelector('img')).toBeNull();

    rerender(<MediaCard item={{ ...item, posterPath: '/otro.jpg' }} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    expect(container.querySelector('img')).toHaveAttribute('src', `${TMDB_POSTER_W500}/otro.jpg`);
  });
});
