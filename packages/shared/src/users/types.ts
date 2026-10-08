import type { Role } from '../auth/types';
import type { ProfileTheme } from './schemas';

export type { ProfileTheme };

export interface UserPreferences {
  id: string;
  userId: string;
  notifications: boolean;
  theme: ProfileTheme;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'USER';
  avatarUrl: string | null;
  phone: string | null;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences | null;
}

/** Usuario en GET /api/admin/users (sin password ni preferencias). */
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface UserStats {
  id: string;
  userId: string;
  totalMovies: number;
  totalTvShows: number;
  totalWatched: number;
  totalWatching: number;
  totalToWatch: number;
  updatedAt: string;
}
