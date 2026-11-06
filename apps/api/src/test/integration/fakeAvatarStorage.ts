import type { AvatarStorage, AvatarUpload } from '../../common/storage';

export const FAKE_AVATAR_BASE_URL = 'https://storage.test/avatars/';

export interface FakeAvatarStorage extends AvatarStorage {
  /** Objetos guardados, por path. */
  objects: Map<string, { body: Buffer; contentType: string }>;
  uploads: AvatarUpload[];
  removed: string[];
  /** Si se define, el próximo `upload` / `remove` lanza este error. */
  uploadError: Error | null;
  removeError: Error | null;
  /** Corre justo después de guardar el objeto y antes de que la API escriba en la base. */
  afterUpload: (() => Promise<void>) | null;
}

/** Storage en memoria con la misma interfaz que el de Supabase: la suite no sale a internet. */
export function createFakeAvatarStorage(): FakeAvatarStorage {
  const fake: FakeAvatarStorage = {
    objects: new Map(),
    uploads: [],
    removed: [],
    uploadError: null,
    removeError: null,
    afterUpload: null,

    async upload(file) {
      if (fake.uploadError) throw fake.uploadError;
      fake.uploads.push(file);
      fake.objects.set(file.path, { body: file.body, contentType: file.contentType });
      await fake.afterUpload?.();
      return `${FAKE_AVATAR_BASE_URL}${file.path}`;
    },

    async remove(path) {
      if (fake.removeError) throw fake.removeError;
      fake.removed.push(path);
      fake.objects.delete(path);
    },

    pathFromUrl(url) {
      return url.startsWith(FAKE_AVATAR_BASE_URL) ? url.slice(FAKE_AVATAR_BASE_URL.length) : null;
    },
  };
  return fake;
}
