import { beforeEach, describe, expect, it, vi } from 'vitest';

const { compare, hash, findByUsernameForLogin } = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
  findByUsernameForLogin: vi.fn(),
}));

vi.mock('bcrypt', () => ({ compare, hash }));
vi.mock('../users/users.service', () => ({ findByUsernameForLogin }));

import { validateUser } from '../auth/auth.service';

describe('validateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hash.mockResolvedValue('$2b$12$dummyhash');
    compare.mockResolvedValue(false);
  });

  it('compara contra un hash de relleno cuando el usuario no existe, para no revelar qué cuentas hay', async () => {
    findByUsernameForLogin.mockResolvedValue(null);

    await expect(validateUser('inexistente', 'clave-cualquiera')).resolves.toBeNull();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith('clave-cualquiera', '$2b$12$dummyhash');
  });

  it('reutiliza el hash de relleno entre logins fallidos', async () => {
    findByUsernameForLogin.mockResolvedValue(null);

    await validateUser('uno', 'a');
    await validateUser('dos', 'b');

    expect(compare).toHaveBeenCalledTimes(2);
    expect(hash.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('con un usuario existente compara contra su hash y rechaza una contraseña incorrecta', async () => {
    findByUsernameForLogin.mockResolvedValue({ id: 'u1', username: 'existente', password: '$2b$12$real' });

    await expect(validateUser('existente', 'mala')).resolves.toBeNull();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith('mala', '$2b$12$real');
  });

  it('devuelve el usuario sin la contraseña cuando coincide', async () => {
    findByUsernameForLogin.mockResolvedValue({ id: 'u1', username: 'existente', password: '$2b$12$real' });
    compare.mockResolvedValue(true);

    const user = await validateUser('existente', 'buena');

    expect(user).toEqual({ id: 'u1', username: 'existente' });
  });
});
