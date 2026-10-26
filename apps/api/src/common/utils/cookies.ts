import type { CookieOptions, Response } from 'express';

import { config } from '../../config';

const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/**
 * `clearCookie` solo borra una cookie si `path` y opciones coinciden con las del `set`, por eso las opciones
 * viven en un solo lugar y tanto el login como el borrado las toman de acá.
 */
function accessCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'strict', path: '/api' };
}

/**
 * El refresh token viaja solo a `/api/auth` (no en cada request a la API) para que lo reciban `refresh` y
 * `logout`: sin cookie, el logout no sabe qué sesión cerrar.
 */
function refreshCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'strict', path: '/api/auth' };
}

/** Cookie del access token (web): dura lo que el JWT (`JWT_ACCESS_EXPIRES_IN`), `httpOnly`, `sameSite: strict`, en `/api`. Mobile no la usa: manda Bearer. */
export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, { ...accessCookieOptions(), maxAge: config.jwt.accessTtlMs });
}

/**
 * Cookie del refresh token (web): dura lo que el JWT (`JWT_REFRESH_EXPIRES_IN`) y viaja solo a `/api/auth`. Mobile recibe el
 * token en el body.
 */
export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(), maxAge: config.jwt.refreshTtlMs });
}

/** Todo cierre de sesión (logout, refresh revocado, cuenta eliminada) pasa por acá. */
export function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}
