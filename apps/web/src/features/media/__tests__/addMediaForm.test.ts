import { describe, expect, it } from 'vitest';

import { addMediaFormSchema, INITIAL_ADD_MEDIA_FORM_VALUES } from '../utils/addMediaForm';

describe('addMediaForm utils', () => {
  it('exposes empty initial form values', () => {
    expect(INITIAL_ADD_MEDIA_FORM_VALUES).toEqual({
      titleQuery: '',
      tmdbId: null,
      mediaType: 'movie',
      status: 'to_watch',
    });
  });
});

describe('addMediaFormSchema', () => {
  const base = { titleQuery: 'Fight Club', tmdbId: 550, mediaType: 'movie', status: 'to_watch' };

  it('acepta un título elegido desde TMDB', () => {
    expect(addMediaFormSchema.safeParse(base).success).toBe(true);
  });

  it('exige elegir un título (tmdbId null)', () => {
    expect(addMediaFormSchema.safeParse({ ...base, tmdbId: null }).success).toBe(false);
  });

  it('rechaza un tmdbId no positivo', () => {
    expect(addMediaFormSchema.safeParse({ ...base, tmdbId: -5 }).success).toBe(false);
  });
});
