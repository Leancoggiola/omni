import { describe, expect, it } from 'vitest';

import { buildMediaTmdbKey, getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '..';

import type { TmdbMediaResult } from '..';

const result = (overrides: Partial<TmdbMediaResult> = {}): TmdbMediaResult => ({
  id: 42,
  media_type: 'movie',
  title: 'Dune',
  poster_path: null,
  ...overrides,
});

describe('utils de TMDB', () => {
  it('resuelve el tipo por media_type, y si no viene, por title o name', () => {
    expect(resolveMediaType(result({ media_type: 'tv', name: 'Show' }))).toBe('tv');
    expect(resolveMediaType(result({ media_type: 'movie' }))).toBe('movie');
    expect(resolveMediaType(result({ media_type: undefined, title: 'Film', name: undefined }))).toBe('movie');
    expect(resolveMediaType(result({ media_type: undefined, title: undefined, name: 'Series' }))).toBe('tv');
  });

  it('arma claves estables por tipo e id', () => {
    expect(buildMediaTmdbKey('movie', 42)).toBe('movie-42');
    expect(getTmdbResultKey(result({ id: 7, media_type: 'tv', name: 'Show' }))).toBe('tv-7');
  });

  it('prefiere title, después name y si no un label por defecto', () => {
    expect(getTmdbResultTitle(result({ title: 'Dune', name: 'Ignorado' }))).toBe('Dune');
    expect(getTmdbResultTitle(result({ title: undefined, name: 'Andor' }))).toBe('Andor');
    expect(getTmdbResultTitle(result({ title: undefined, name: undefined }))).toBe('Sin título');
  });
});
