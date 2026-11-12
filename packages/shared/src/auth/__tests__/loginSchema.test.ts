import { describe, expect, it } from 'vitest';

import { loginSchema } from '..';

describe('loginSchema', () => {
  it.each([' usuario01', 'usuario01 ', '  usuario01  '])('recorta los espacios del usuario: "%s"', username => {
    const parsed = loginSchema.safeParse({ username, password: 'x' });

    expect(parsed.success && parsed.data.username).toBe('usuario01');
  });

  it('rechaza espacios en el medio', () => {
    expect(loginSchema.safeParse({ username: 'usuar io01', password: 'x' }).success).toBe(false);
  });
});
