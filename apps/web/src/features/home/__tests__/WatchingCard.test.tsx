import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { WatchingCard } from '../components/WatchingCard';

import type { MediaItem } from '@omni/shared/media';

import { fireEvent, screen } from '@testing-library/react';

const useWatchingMedia = vi.fn();

vi.mock('../hooks/useWatchingMedia', () => ({
  WATCHING_LIMIT: 3,
  useWatchingMedia: () => useWatchingMedia(),
}));

const media = (id: string, title: string, mediaType: MediaItem['mediaType'], posterPath: string | null): MediaItem => ({
  id,
  createdById: 'u1',
  tmdbId: Number(id),
  mediaType,
  title,
  posterPath,
  status: 'watching',
  createdAt: '',
  updatedAt: '',
});

const state = (value: Record<string, unknown>) =>
  useWatchingMedia.mockReturnValue({ items: [], isLoading: false, error: undefined, mutate: vi.fn(), ...value });

const renderCard = () =>
  renderWithProviders(
    <MemoryRouter>
      <WatchingCard />
    </MemoryRouter>
  );

describe('WatchingCard', () => {
  beforeEach(() => {
    useWatchingMedia.mockReset();
  });

  it('muestra el encabezado y "Ver todo" enlaza a Películas', () => {
    state({});
    renderCard();
    expect(screen.getByRole('heading', { name: 'Seguís viendo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todo' })).toHaveAttribute('href', '/media');
  });

  it('cada ítem muestra título, tipo, pill "Viendo" y navega a Películas', () => {
    state({ items: [media('1', 'The Bear', 'tv', '/bear.jpg'), media('2', 'Dune', 'movie', null)] });
    renderCard();
    expect(screen.getByText('The Bear')).toBeInTheDocument();
    expect(screen.getByText('Serie')).toBeInTheDocument();
    expect(screen.getByText('Película')).toBeInTheDocument();
    expect(screen.getAllByText('Viendo')).toHaveLength(2);
    const row = screen.getByRole('link', { name: /The Bear/ });
    expect(row).toHaveAttribute('href', '/media');
  });

  it('mientras carga muestra un skeleton accesible y no el vacío', () => {
    state({ isLoading: true });
    renderCard();
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    expect(screen.queryByText('No tenés nada en curso')).not.toBeInTheDocument();
  });

  it('sin nada en "Viendo" muestra el estado vacío', () => {
    state({});
    renderCard();
    expect(screen.getByText('No tenés nada en curso')).toBeInTheDocument();
  });

  it('el error se muestra, ofrece reintentar y no se confunde con el vacío', () => {
    const mutate = vi.fn();
    state({ error: new Error('x'), mutate });
    renderCard();
    expect(screen.getByText('No se pudo cargar tu lista')).toBeInTheDocument();
    expect(screen.queryByText('No tenés nada en curso')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mutate).toHaveBeenCalledOnce();
  });

  it('si el póster falla al cargar, lo reemplaza por el ícono', () => {
    state({ items: [media('1', 'The Bear', 'tv', '/bear.jpg')] });
    const { container } = renderCard();
    const poster = container.querySelector('img');
    expect(poster).toHaveAttribute('src', expect.stringContaining('/bear.jpg'));
    fireEvent.error(poster as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
  });
});
