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
    const clearOptions = Object.fromEntries(
      clearCookie.mock.calls
        .filter(([, options]) => options.path !== '/api/auth/refresh')
        .map(([name, options]) => [name, options])
    );

    expect(clearOptions).toEqual(setOptions);
    expect(clearOptions.access_token).toMatchObject({ path: '/api', httpOnly: true, sameSite: 'strict' });
    expect(clearOptions.refresh_token).toMatchObject({ path: '/api/auth', httpOnly: true, sameSite: 'strict' });
  });

  it('setRefreshCookie también borra la cookie de refresh con el path viejo', () => {
    const { res, cookie, clearCookie } = mockRes();

    setRefreshCookie(res, 'refresh');

    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/auth/refresh', httpOnly: true, sameSite: 'strict' })
    );
    expect(cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.objectContaining({ path: '/api/auth' }));
  });

  it('clearCookies también borra la cookie de refresh con el path viejo', () => {
    const { res, clearCookie } = mockRes();

    clearCookies(res);

    expect(clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/auth/refresh', httpOnly: true, sameSite: 'strict' })
    );
  });
});
