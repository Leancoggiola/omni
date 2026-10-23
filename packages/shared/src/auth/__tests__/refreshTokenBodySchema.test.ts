import { describe, expect, it } from 'vitest';

import { refreshTokenBodySchema } from '..';

describe('refreshTokenBodySchema', () => {
  it('accepts empty body for cookie-based clients', () => {
    expect(refreshTokenBodySchema.parse({})).toEqual({});
  });

  it('accepts undefined body (no JSON) for cookie-based clients', () => {
    expect(refreshTokenBodySchema.parse(undefined)).toEqual({});
  });

  it('accepts refreshToken for mobile clients', () => {
    expect(refreshTokenBodySchema.parse({ refreshToken: 'jwt.token.here' })).toEqual({
      refreshToken: 'jwt.token.here',
    });
  });

  it('rejects empty refreshToken string', () => {
    expect(() => refreshTokenBodySchema.parse({ refreshToken: '' })).toThrow();
  });
});
