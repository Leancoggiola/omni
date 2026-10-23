import { describe, expect, it } from 'vitest';
import type { Request } from 'express';

import { validatedQuery } from '../common/http';

describe('validatedQuery', () => {
  it('devuelve el query ya parseado por validate, con los tipos del schema', () => {
    const req = { query: { page: 2, type: 'tv' } } as unknown as Request;

    expect(validatedQuery<{ page: number; type: string }>(req)).toEqual({ page: 2, type: 'tv' });
  });
});
