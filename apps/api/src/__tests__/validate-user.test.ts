import { beforeEach, describe, expect, it, vi } from 'vitest';

const { compare, findByUsernameForLogin } = vi.hoisted(() => ({
  compare: vi.fn(),
  findByUsernameForLogin: vi.fn(),
}));

vi.mock('bcrypt', () => ({ compare, hash: vi.fn() }));
vi.mock('../users/users.service', () => ({ findByUsernameForLogin }));

import { validateUser } from '../auth/auth.service';

const BCRYPT_COST_12_HASH = /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/;

describe('validateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compare.mockResolvedValue(false);
  });

  it('compara contra un hash de relleno de costo 12 cuando el usuario no existe, para no revelar qué cuentas hay', async () => {
    findByUsernameForLogin.mockResolvedValue(null);

    await expect(validateUser('inexistente', 'clave-cualquiera')).resolves.toBeNull();

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith('clave-cualquiera', expect.stringMatching(BCRYPT_COST_12_HASH));
  });

  it('usa el mismo hash de relleno en cada login fallido', async () => {
    findByUsernameForLogin.mockResolvedValue(null);

    await validateUser('uno', 'a');
    await validateUser('dos', 'b');

    expect(compare).toHaveBeenCalledTimes(2);
    expect(compare.mock.calls[0]![1]).toBe(compare.mock.calls[1]![1]);
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
