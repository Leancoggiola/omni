import { describe, expect, it } from 'vitest';

import { AVATAR_ALLOWED_MIME, AVATAR_FIELD, AVATAR_MAX_BYTES, avatarResponseSchema, isAvatarMime } from '..';

describe('constantes del avatar', () => {
  it('el tope es de 2 MB y el campo multipart se llama avatar', () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(AVATAR_FIELD).toBe('avatar');
  });

  it('admite jpeg, png y webp, y no gif', () => {
    expect([...AVATAR_ALLOWED_MIME]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect(AVATAR_ALLOWED_MIME).not.toContain('image/gif');
  });
});

describe('isAvatarMime', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('acepta %s', mime => {
    expect(isAvatarMime(mime)).toBe(true);
  });

  it.each(['image/gif', 'image/svg+xml', 'image/JPEG', 'text/plain', '', null, undefined])('rechaza %s', mime => {
    expect(isAvatarMime(mime)).toBe(false);
  });
});

describe('avatarResponseSchema', () => {
  it('acepta el perfil con la URL de la foto y conserva el resto de los campos', () => {
    const body = { user: { id: 'u1', username: 'ana', avatarUrl: 'https://cdn.test/avatars/u1/a.png' } };

    expect(avatarResponseSchema.parse(body)).toEqual(body);
  });

  it('acepta avatarUrl null (foto borrada)', () => {
    expect(avatarResponseSchema.parse({ user: { avatarUrl: null } })).toEqual({ user: { avatarUrl: null } });
  });

  it('rechaza una avatarUrl que no es una URL o que falta', () => {
    expect(() => avatarResponseSchema.parse({ user: { avatarUrl: 'no-es-una-url' } })).toThrow();
    expect(() => avatarResponseSchema.parse({ user: {} })).toThrow();
    expect(() => avatarResponseSchema.parse({})).toThrow();
  });
});
