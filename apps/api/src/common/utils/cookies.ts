import type { CookieOptions, Response } from 'express';

import { config } from '../../config';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

/**
 * `clearCookie` solo borra una cookie si `path` y opciones coinciden con las del `set`, por eso las opciones
 * viven en un solo lugar y tanto el login como el borrado las toman de acá.
 */
function accessCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'strict', path: '/api' };
}

/** El refresh token solo viaja al endpoint de refresh: no se manda en cada request a la API. */
function refreshCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'strict', path: '/api/auth/refresh' };
}

export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, { ...accessCookieOptions(), maxAge: ACCESS_COOKIE_MAX_AGE });
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(), maxAge: config.cookie.refreshMaxAge });
}

/** Todo cierre de sesión (logout, refresh revocado, cuenta eliminada) pasa por acá. */
export function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}
