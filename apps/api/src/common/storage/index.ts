import { createClient } from '@supabase/supabase-js';

import { config } from '../../config';
import { HttpError } from '../http';
import { createSupabaseAvatarStorage } from './avatar-storage';
import type { AvatarStorage } from './avatar-storage';

export { createSupabaseAvatarStorage } from './avatar-storage';
export type { AvatarStorage, AvatarUpload } from './avatar-storage';

let override: AvatarStorage | null = null;
let supabaseStorage: AvatarStorage | null = null;

/** Reemplaza el storage real por un fake. Solo con `NODE_ENV=test`, igual que `setPrismaOverride`. */
export function setAvatarStorageOverride(storage: AvatarStorage): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setAvatarStorageOverride is only available when NODE_ENV is "test"');
  }
  override = storage;
}

export function clearAvatarStorageOverride(): void {
  override = null;
}

/**
 * Storage de fotos de perfil: el override de test si hay uno y, si no, el cliente de Supabase con la service key, que
 * se crea una sola vez. Sin `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` responde 503 en vez de romper el arranque.
 */
export function getAvatarStorage(): AvatarStorage {
  if (override) return override;

  const { supabaseUrl, serviceRoleKey, avatarsBucket } = config.storage;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(503, 'La subida de fotos no está disponible por ahora');
  }

  supabaseStorage ??= createSupabaseAvatarStorage(
    createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    avatarsBucket
  );
  return supabaseStorage;
}
