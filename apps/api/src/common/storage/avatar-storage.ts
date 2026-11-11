import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvatarMime } from '@omni/shared/users';

import { HttpError } from '../http';
import { logger } from '../utils/logger';

/** Objeto a guardar: `path` es relativo al bucket y `contentType` sale del contenido, no de lo que declaró el cliente. */
export interface AvatarUpload {
  path: string;
  body: Buffer;
  contentType: AvatarMime;
}

/**
 * Lo único que la API necesita del storage de fotos. Detrás de una interfaz para que los tests usen un fake en memoria
 * en vez de salir a internet (`setAvatarStorageOverride`).
 * - `upload` guarda el objeto y devuelve su URL pública.
 * - `remove` lo borra; borrar uno que no existe no es un error.
 * - `pathFromUrl` es el inverso de la URL pública: `null` si la URL no es de este bucket (por ejemplo una foto externa).
 */
export interface AvatarStorage {
  upload(file: AvatarUpload): Promise<string>;
  remove(path: string): Promise<void>;
  pathFromUrl(url: string): string | null;
}

/** Un año: cada subida usa un path nuevo, así que el objeto de una URL nunca cambia. */
const AVATAR_CACHE_SECONDS = '31536000';

/**
 * Storage sobre un bucket público de Supabase. El cliente se inyecta (solo se usa `storage`) para poder probar el
 * adaptador sin red. Un fallo al subir se loguea con su causa y responde 502 sin filtrar el detalle al cliente; uno al
 * borrar se relanza para que quien llama decida si lo tolera.
 */
export function createSupabaseAvatarStorage(client: Pick<SupabaseClient, 'storage'>, bucket: string): AvatarStorage {
  const files = client.storage.from(bucket);
  const publicPrefix = files.getPublicUrl('').data.publicUrl;

  return {
    async upload({ path, body, contentType }) {
      const { error } = await files.upload(path, body, {
        contentType,
        cacheControl: AVATAR_CACHE_SECONDS,
        upsert: false,
      });
      if (error) {
        logger.error({ err: error, bucket, path }, 'No se pudo subir la foto de perfil a Supabase Storage');
        throw new HttpError(502, 'No se pudo guardar la foto, intentá de nuevo');
      }
      return files.getPublicUrl(path).data.publicUrl;
    },

    async remove(path) {
      const { error } = await files.remove([path]);
      if (error) throw error;
    },

    pathFromUrl(url) {
      if (!url.startsWith(publicPrefix)) return null;
      const encodedPath = url.slice(publicPrefix.length).split(/[?#]/)[0] ?? '';
      try {
        return decodeURIComponent(encodedPath) || null;
      } catch {
        return null;
      }
    },
  };
}
