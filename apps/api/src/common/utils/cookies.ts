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

/**
 * Path con el que se emitía la cookie de refresh antes de moverla a `/api/auth`. Con ese path el navegador no
 * la mandaba a `/api/auth/logout` y el logout de la web cerraba todas las sesiones del usuario.
 * `setRefreshCookie` la borra cada vez que emite la nueva (login o refresh) y `clearCookies` también: si
 * quedara en el navegador, mandaría un token ya rotado antes que el nuevo (el path más largo va primero) y
 * el refresh revocaría todas las sesiones. Se puede quitar, junto con los dos borrados, cuando hayan expirado
 * las cookies viejas, 7 días después del deploy.
 */
const LEGACY_REFRESH_COOKIE_PATH = '/api/auth/refresh';

/**
 * El refresh token viaja solo a `/api/auth` (no en cada request a la API) para que lo reciban `refresh` y
 * `logout`: sin cookie, el logout no sabe qué sesión cerrar.
 */
function refreshCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'strict', path: '/api/auth' };
}

/** Cookie del access token (web): 15 min, `httpOnly`, `sameSite: strict`, en `/api`. Mobile no la usa: manda Bearer. */
export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, { ...accessCookieOptions(), maxAge: ACCESS_COOKIE_MAX_AGE });
}

/**
 * Cookie del refresh token (web): dura `COOKIE_REFRESH_MAX_AGE` y viaja solo a `/api/auth`. Mobile recibe el
 * token en el body. Además borra la cookie con el path legacy, para que el primer login o refresh posterior al
 * deploy la limpie.
 */
export function setRefreshCookie(res: Response, token: string) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), path: LEGACY_REFRESH_COOKIE_PATH });
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(), maxAge: config.cookie.refreshMaxAge });
}

/** Todo cierre de sesión (logout, refresh revocado, cuenta eliminada) pasa por acá. */
export function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), path: LEGACY_REFRESH_COOKIE_PATH });
}
