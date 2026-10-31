import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MEDIA_FILTERS,
  filterMediaItems,
  hasActiveFilters,
  MEDIA_STATUS_FILTER_OPTIONS,
  MEDIA_STATUS_LABELS,
  MEDIA_STATUS_OPTIONS,
  MEDIA_STATUSES,
  MEDIA_TYPE_FILTER_OPTIONS,
  MEDIA_TYPE_OPTIONS,
} from '..';

import type { MediaItem } from '..';

const item = (
  id: string,
  title: string,
  mediaType: MediaItem['mediaType'],
  status: MediaItem['status']
): MediaItem => ({
  id,
  createdById: 'u1',
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

describe('opciones de media', () => {
  it('una opción por estado y por tipo, en el orden de las constantes y con su label', () => {
    expect(MEDIA_STATUS_OPTIONS.map(o => o.value)).toEqual([...MEDIA_STATUSES]);
    expect(MEDIA_STATUS_OPTIONS[0]).toEqual({ value: 'to_watch', label: MEDIA_STATUS_LABELS.to_watch });
    expect(MEDIA_TYPE_OPTIONS).toEqual([
      { value: 'movie', label: 'Película' },
      { value: 'tv', label: 'Serie' },
    ]);
  });

  it('las de filtro suman "Todos" adelante', () => {
    expect(MEDIA_STATUS_FILTER_OPTIONS[0]).toEqual({ value: 'all', label: 'Todos' });
    expect(MEDIA_STATUS_FILTER_OPTIONS.slice(1)).toEqual([...MEDIA_STATUS_OPTIONS]);
    expect(MEDIA_TYPE_FILTER_OPTIONS.map(o => o.value)).toEqual(['all', 'movie', 'tv']);
  });
});

describe('filterMediaItems', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterMediaItems(ITEMS, DEFAULT_MEDIA_FILTERS)).toHaveLength(3);
  });

  it('combina estado, tipo y búsqueda (sin distinguir mayúsculas)', () => {
    expect(filterMediaItems(ITEMS, { ...DEFAULT_MEDIA_FILTERS, mediaType: 'tv' }).map(i => i.id)).toEqual(['1', '3']);
    expect(filterMediaItems(ITEMS, { status: 'watching', mediaType: 'tv', query: '' }).map(i => i.id)).toEqual(['3']);
    expect(filterMediaItems(ITEMS, { ...DEFAULT_MEDIA_FILTERS, query: '  DUNE ' }).map(i => i.id)).toEqual(['2']);
    expect(filterMediaItems(ITEMS, { status: 'watched', mediaType: 'movie', query: '' })).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('ignora una búsqueda solo con espacios', () => {
    expect(hasActiveFilters(DEFAULT_MEDIA_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, status: 'watched' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, mediaType: 'movie' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_MEDIA_FILTERS, query: 'bear' })).toBe(true);
  });
});
