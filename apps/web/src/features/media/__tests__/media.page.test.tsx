import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { MediaPage } from '../media.page';

import type { MediaItem } from '../modules';

import { act, fireEvent, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  removeFromList: vi.fn(),
  retry: vi.fn(),
  error: undefined as Error | undefined,
}));

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

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
}));

vi.mock('../modules', () => ({
  AddMediaModal: () => null,
  MediaListToolbar: () => null,
  MediaPageHeader: () => null,
  buildMediaTmdbKey: (type: string, id: number) => `${type}:${id}`,
  useMediaMutations: () => ({ addToList: vi.fn(), updateStatus: vi.fn(), removeFromList: mocks.removeFromList }),
  useMyMediaList: () => ({
    data: mocks.error ? undefined : [item],
    allItems: mocks.error ? undefined : [item],
    isLoading: false,
    error: mocks.error,
    mutate: mocks.retry,
  }),
  MyMediaList: ({
    error,
    onDelete,
    onRetry,
  }: {
    error?: unknown;
    onDelete: (value: MediaItem) => void;
    onRetry: () => void;
  }) =>
    error ? (
      <button onClick={onRetry}>Reintentar</button>
    ) : (
      <button onClick={() => onDelete(item)}>Eliminar The Matrix</button>
    ),
}));

describe('MediaPage', () => {
  beforeEach(() => {
    mocks.error = undefined;
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.removeFromList.mockReset().mockResolvedValue(undefined);
    mocks.retry.mockReset();
  });

  it('un doble clic en eliminar mientras se borra no duplica el pedido', async () => {
    let finish!: () => void;
    mocks.removeFromList.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderWithProviders(<MediaPage />);

    const button = screen.getByRole('button', { name: 'Eliminar The Matrix' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.removeFromList).toHaveBeenCalledOnce());
    fireEvent.click(button);
    await act(async () => finish());

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.removeFromList).toHaveBeenCalledOnce();
  });

  it('terminado el borrado se puede volver a eliminar', async () => {
    renderWithProviders(<MediaPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar The Matrix' }));
    await waitFor(() => expect(mocks.removeFromList).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar The Matrix' }));

    await waitFor(() => expect(mocks.removeFromList).toHaveBeenCalledTimes(2));
  });

  it('el reintento de la lista vuelve a pedirla', () => {
    mocks.error = new Error('x');
    renderWithProviders(<MediaPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.retry).toHaveBeenCalledOnce();
  });
});
