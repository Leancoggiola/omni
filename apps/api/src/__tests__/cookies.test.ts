import { describe, expect, it, vi } from 'vitest';
import type { CookieOptions, Response } from 'express';

import { clearCookies, setAccessCookie, setRefreshCookie } from '../common/utils/cookies';

function mockRes() {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  return { res: { cookie, clearCookie } as unknown as Response, cookie, clearCookie };
}

function withoutMaxAge(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, ...rest } = options;
  return rest;
}

describe('cookies de sesión', () => {
  it('clearCookies borra con las mismas opciones y path con que se setearon', () => {
    const { res, cookie, clearCookie } = mockRes();

    setAccessCookie(res, 'access');
    setRefreshCookie(res, 'refresh');
    clearCookies(res);

    const setOptions = Object.fromEntries(cookie.mock.calls.map(([name, , options]) => [name, withoutMaxAge(options)]));
    const clearOptions = Object.fromEntries(clearCookie.mock.calls.map(([name, options]) => [name, options]));

    expect(clearOptions).toEqual(setOptions);
    expect(clearOptions.access_token).toMatchObject({ path: '/api', httpOnly: true, sameSite: 'strict' });
    expect(clearOptions.refresh_token).toMatchObject({ path: '/api/auth', httpOnly: true, sameSite: 'strict' });
  });
});
