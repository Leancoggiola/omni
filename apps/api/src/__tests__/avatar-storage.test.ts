import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../common/http';
import {
  clearAvatarStorageOverride,
  createSupabaseAvatarStorage,
  getAvatarStorage,
  setAvatarStorageOverride,
} from '../common/storage';
import { createFakeAvatarStorage } from '../test/integration/fakeAvatarStorage';
import { pngBytes } from '../test/avatar-images';

const BASE_URL = 'https://abc.supabase.co/storage/v1/object/public/avatars/';

/** Imita la parte de `client.storage.from(bucket)` que usa el adaptador. */
function createStorageStub(result: { upload?: { error: Error | null }; remove?: { error: Error | null } } = {}) {
  const upload = vi.fn().mockResolvedValue(result.upload ?? { data: { path: 'x' }, error: null });
  const remove = vi.fn().mockResolvedValue(result.remove ?? { data: [], error: null });
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `${BASE_URL}${encodeURI(path)}` } }));
  const from = vi.fn(() => ({ upload, remove, getPublicUrl }));
  const client = { storage: { from } } as unknown as Pick<SupabaseClient, 'storage'>;
  return { client, from, upload, remove };
}

describe('createSupabaseAvatarStorage', () => {
  it('sube al bucket con el content type, caché largo y sin upsert, y devuelve la URL pública', async () => {
    const { client, from, upload } = createStorageStub();
    const storage = createSupabaseAvatarStorage(client, 'avatars');
    const body = pngBytes();

    const url = await storage.upload({ path: 'u1/a.png', body, contentType: 'image/png' });

    expect(from).toHaveBeenCalledWith('avatars');
    expect(upload).toHaveBeenCalledWith('u1/a.png', body, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
    expect(url).toBe(`${BASE_URL}u1/a.png`);
  });

  it('si Supabase falla al subir responde 502 sin filtrar el detalle', async () => {
    const { client } = createStorageStub({ upload: { error: new Error('bucket not found: secreto-interno') } });
    const storage = createSupabaseAvatarStorage(client, 'avatars');

    const failure = await storage
      .upload({ path: 'u1/a.png', body: pngBytes(), contentType: 'image/png' })
      .catch(e => e);

    expect(failure).toBeInstanceOf(HttpError);
    expect(failure.status).toBe(502);
    expect(failure.message).not.toContain('secreto-interno');
  });

  it('borra por path y relanza el error de Supabase', async () => {
    const ok = createStorageStub();
    await createSupabaseAvatarStorage(ok.client, 'avatars').remove('u1/a.png');
    expect(ok.remove).toHaveBeenCalledWith(['u1/a.png']);

    const boom = new Error('storage caído');
    const failing = createStorageStub({ remove: { error: boom } });
    await expect(createSupabaseAvatarStorage(failing.client, 'avatars').remove('u1/a.png')).rejects.toBe(boom);
  });

  describe('pathFromUrl', () => {
    const { client } = createStorageStub();
    const storage = createSupabaseAvatarStorage(client, 'avatars');

    it('devuelve el path relativo al bucket de una URL pública propia', () => {
      expect(storage.pathFromUrl(`${BASE_URL}u1/a.png`)).toBe('u1/a.png');
    });

    it('decodifica el path y descarta query y hash', () => {
      expect(storage.pathFromUrl(`${BASE_URL}u1/mi%20foto.png?t=1#x`)).toBe('u1/mi foto.png');
    });

    it('devuelve null para otro bucket, otro proyecto, una URL externa o un path vacío', () => {
      expect(storage.pathFromUrl('https://abc.supabase.co/storage/v1/object/public/otro/u1/a.png')).toBeNull();
      expect(storage.pathFromUrl('https://xyz.supabase.co/storage/v1/object/public/avatars/u1/a.png')).toBeNull();
      expect(storage.pathFromUrl('https://example.com/foto.png')).toBeNull();
      expect(storage.pathFromUrl(BASE_URL)).toBeNull();
      expect(storage.pathFromUrl(`${BASE_URL}%E0%A4%A`)).toBeNull();
    });
  });
});

describe('getAvatarStorage', () => {
  afterEach(() => {
    clearAvatarStorageOverride();
  });

  it('sin SUPABASE_URL ni service key responde 503', () => {
    expect(() => getAvatarStorage()).toThrow(HttpError);
    expect(() => getAvatarStorage()).toThrow(expect.objectContaining({ status: 503 }));
  });

  it('con un override devuelve ese storage hasta que se limpia', () => {
    const fake = createFakeAvatarStorage();

    setAvatarStorageOverride(fake);
    expect(getAvatarStorage()).toBe(fake);

    clearAvatarStorageOverride();
    expect(() => getAvatarStorage()).toThrow(HttpError);
  });
});
