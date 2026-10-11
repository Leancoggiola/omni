import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { MyMediaList } from '../components/MyMediaList';

import type { MediaItem } from '../../_shared/types';

import { screen } from '@testing-library/react';

const item: MediaItem = {
  id: 'm1',
  userId: 'u1',
  tmdbId: 603,
  mediaType: 'movie',
  title: 'The Matrix',
  posterPath: null,
  status: 'to_watch',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Solo `(min-width: 48em)` (el `sm` de Mantine) responde según el ancho simulado. */
const stubViewport = (wide: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width') ? wide : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
};

const renderList = (displayMode: string) =>
  renderWithProviders(
    <MyMediaList
      items={[item]}
      isLoading={false}
      searchText=""
      displayMode={displayMode}
      onAdd={vi.fn()}
      onStatusChange={vi.fn()}
      onDelete={vi.fn()}
    />
  );

describe('MyMediaList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('por debajo de sm muestra la lista aunque el modo sea grilla', () => {
    stubViewport(false);
    renderList('grid');

    expect(screen.getByRole('button', { name: 'Eliminar The Matrix' })).toBeInTheDocument();
  });

  it('desde sm con modo grilla muestra la grilla, sin el tacho a la vista', () => {
    stubViewport(true);
    renderList('grid');

    expect(screen.queryByRole('button', { name: 'Eliminar The Matrix' })).not.toBeInTheDocument();
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('desde sm con modo lista muestra la lista', () => {
    stubViewport(true);
    renderList('list');

    expect(screen.getByRole('button', { name: 'Eliminar The Matrix' })).toBeInTheDocument();
  });
});
