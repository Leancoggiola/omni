import { describe, expect, it } from 'vitest';

import { toSessionUser } from '..';

const user = {
  username: 'usuario01',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  role: 'USER' as const,
  avatarUrl: null,
  preferences: { theme: 'dark' },
};

describe('toSessionUser', () => {
  it('copia los campos de sesión y toma el tema de las preferencias', () => {
    expect(toSessionUser(user)).toEqual({
      username: 'usuario01',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'USER',
      avatarUrl: null,
      theme: 'dark',
    });
  });

  it('no filtra campos de más del usuario de la base', () => {
    const result = toSessionUser({ ...user, id: 'u1', password: 'hash' } as typeof user);

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('preferences');
  });

  it.each([
    ['sin preferencias', null],
    ['con un tema desconocido', { theme: 'sepia' }],
    ['con un tema vacío', { theme: '' }],
  ])('usa light %s', (_label, preferences) => {
    expect(toSessionUser({ ...user, preferences }).theme).toBe('light');
  });

  it.each(['light', 'dark', 'auto'])('conserva el tema %s', theme => {
    expect(toSessionUser({ ...user, preferences: { theme } }).theme).toBe(theme);
  });

  it('conserva el rol ADMIN y el email nulo', () => {
    const result = toSessionUser({ ...user, role: 'ADMIN', email: null });

    expect(result.role).toBe('ADMIN');
    expect(result.email).toBeNull();
  });
});
