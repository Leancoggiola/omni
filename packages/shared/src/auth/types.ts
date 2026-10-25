import type { ProfileTheme } from '../users/types';

export const ROLES = ['ADMIN', 'USER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario',
};

/** Usuario expuesto en login, refresh y GET /api/auth/profile (sin id). */
export interface SessionUser {
  username: string;
  name: string;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  theme: ProfileTheme;
}

export interface ProfileResponse {
  user: SessionUser;
}

/** Respuesta de login/refresh: cookies (web) + tokens en body (mobile). */
export interface AuthTokensResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

/** Header con el que la app mobile se identifica en login y refresh: la API le da un refresh token de vigencia larga. */
export const CLIENT_HEADER = 'X-Client';

/** Valor de `CLIENT_HEADER` que manda la app mobile. */
export const MOBILE_CLIENT = 'mobile';
