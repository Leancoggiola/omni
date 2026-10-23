import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { MediaListItem } from '../components/MediaListItem';

import type { MediaItem } from '../../_shared/types';

import { TMDB_POSTER_W185 } from '@omni/shared/media';
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

describe('MediaListItem', () => {
  it('muestra título, tipo y el estado actual', () => {
    renderWithProviders(<MediaListItem item={item} onStatusChange={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('Película')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Estado de The Matrix' })).toHaveValue('Pendiente');
  });

  it('el póster es decorativo y usa la miniatura w185', () => {
    const { container } = renderWithProviders(
      <MediaListItem item={item} onStatusChange={vi.fn()} onDelete={vi.fn()} />
    );

    const poster = container.querySelector('img');
    expect(poster).toHaveAttribute('src', `${TMDB_POSTER_W185}/matrix.jpg`);
    expect(poster).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img', { name: 'The Matrix' })).not.toBeInTheDocument();
  });

  it('sin póster muestra el ícono en lugar de la imagen', () => {
    const { container } = renderWithProviders(
      <MediaListItem item={{ ...item, posterPath: null }} onStatusChange={vi.fn()} onDelete={vi.fn()} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('si el póster falla al cargar cae al ícono', () => {
    const { container } = renderWithProviders(
      <MediaListItem item={item} onStatusChange={vi.fn()} onDelete={vi.fn()} />
    );

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
  });

  it('el tacho llama a onDelete con el item', () => {
    const onDelete = vi.fn();
    renderWithProviders(<MediaListItem item={item} onStatusChange={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar The Matrix' }));

    expect(onDelete).toHaveBeenCalledWith(item);
  });
});
