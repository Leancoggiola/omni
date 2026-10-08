import type { ProfileTheme } from '../users/types';

export type Role = 'ADMIN' | 'USER';

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
