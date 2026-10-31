import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { TmdbSearchField } from '../components/AddMediaModal/TmdbSearchField';

import { fireEvent, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  search: { data: undefined, isLoading: false, error: undefined, mutate: vi.fn() } as {
    data: { results: { id: number; media_type: string; title: string; poster_path: null }[] } | undefined;
    isLoading: boolean;
    error: Error | undefined;
    mutate: () => unknown;
  },
}));

vi.mock('../hooks/useMediaSearch', () => ({ useMediaSearch: () => mocks.search }));

vi.mock('@mantine/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@mantine/hooks')>()),
  useDebouncedValue: (value: string) => [value],
}));

const renderField = (value = 'Dune') =>
  renderWithProviders(
    <TmdbSearchField value={value} existingTmdbIds={new Set()} onQueryChange={vi.fn()} onSelect={vi.fn()} />
  );

describe('TmdbSearchField', () => {
  beforeEach(() => {
    mocks.search.error = undefined;
    mocks.search.data = undefined;
    mocks.search.mutate = vi.fn();
  });

  it('muestra "No se encontraron resultados" cuando la búsqueda no trae nada', () => {
    renderField();
    fireEvent.focus(screen.getByRole('textbox', { name: /Título/ }));

    expect(screen.getByText('No se encontraron resultados')).toBeInTheDocument();
  });

  it('muestra el error de TMDB con "Reintentar" y no el estado vacío', () => {
    mocks.search.error = new Error('boom');
    renderField();
    fireEvent.focus(screen.getByRole('textbox', { name: /Título/ }));

    expect(screen.getByText('No se pudo buscar en TMDB')).toBeInTheDocument();
    expect(screen.queryByText('No se encontraron resultados')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.search.mutate).toHaveBeenCalledTimes(1);
  });

  it('prioriza el error sobre los resultados previos que conserva SWR', () => {
    mocks.search.data = { results: [{ id: 1, media_type: 'movie', title: 'Dune', poster_path: null }] };
    mocks.search.error = new Error('boom');
    renderField();
    fireEvent.focus(screen.getByRole('textbox', { name: /Título/ }));

    expect(screen.getByText('No se pudo buscar en TMDB')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Dune/ })).not.toBeInTheDocument();
  });

  it('con menos de 2 caracteres pide más texto aunque haya un error previo', () => {
    mocks.search.error = new Error('boom');
    renderField('D');
    fireEvent.focus(screen.getByRole('textbox', { name: /Título/ }));

    expect(screen.getByText('Escribí al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo buscar en TMDB')).not.toBeInTheDocument();
  });
});
