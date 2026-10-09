import { DEFAULT_MEDIA_FILTERS, filterMediaItems, hasActiveFilters } from './filterMedia';

import type { MediaItem } from '@omni/shared/media';

const item = (
  id: string,
  title: string,
  mediaType: MediaItem['mediaType'],
  status: MediaItem['status']
): MediaItem => ({
  id,
  userId: 'u1',
  tmdbId: Number(id),
  mediaType,
  title,
  posterPath: null,
  status,
  createdAt: '',
  updatedAt: '',
});

const ITEMS = [
  item('1', 'Breaking Bad', 'tv', 'watched'),
  item('2', 'Dune: Part Two', 'movie', 'to_watch'),
  item('3', 'The Bear', 'tv', 'watching'),
];

describe('filterMediaItems', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterMediaItems(ITEMS, DEFAULT_MEDIA_FILTERS)).toHaveLength(3);
  });

  it('combina estado, tipo y búsqueda (sin distinguir mayúsculas)', () => {
    expect(filterMediaItems(ITEMS, { ...DEFAULT_MEDIA_FILTERS, mediaType: 'tv' }).map(i => i.id)).toEqual(['1', '3']);
    expect(filterMediaItems(ITEMS, { status: 'watching', mediaType: 'tv', query: '' }).map(i => i.id)).toEqual(['3']);
    expect(filterMediaItems(ITEMS, { ...DEFAULT_MEDIA_FILTERS, query: '  dune ' }).map(i => i.id)).toEqual(['2']);
    expect(filterMediaItems(ITEMS, { status: 'watched', mediaType: 'movie', query: '' })).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('ignora una búsqueda solo con espacios', () => {
    expect(hasActiveFilters(DEFAULT_MEDIA_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, status: 'watched' })).toBe(true);
  });
});
