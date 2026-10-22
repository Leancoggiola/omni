import { describe, expect, it } from 'vitest';
import * as bcrypt from 'bcrypt';

import { DUMMY_PASSWORD_HASH } from '../auth/auth.service';
import { BCRYPT_ROUNDS, hashPassword } from '../common/utils/password';

describe('hashPassword', () => {
  it('hashea con el costo común y el hash verifica la contraseña', async () => {
    const hash = await hashPassword('password123');

    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_ROUNDS);
    expect(await bcrypt.compare('password123', hash)).toBe(true);
  });

  it('el hash dummy del login usa el mismo costo que los usuarios reales', () => {
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_ROUNDS);
  });
});
