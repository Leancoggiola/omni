import { describe, expect, it } from 'vitest';

import { createUserSchema } from '@omni/shared/auth';
import { changePasswordSchema, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@omni/shared/users';

const valid = { currentPassword: 'actual-123', newPassword: 'x'.repeat(PASSWORD_MIN_LENGTH) };

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('changePasswordSchema', () => {
  it('acepta la contraseña actual y una nueva de 8 a 72 caracteres', () => {
    expect(changePasswordSchema.parse(valid)).toEqual(valid);
    const longest = { ...valid, newPassword: 'x'.repeat(PASSWORD_MAX_LENGTH) };
    expect(changePasswordSchema.parse(longest)).toEqual(longest);
  });

  it('exige la contraseña actual', () => {
    expect(changePasswordSchema.safeParse({ newPassword: valid.newPassword }).success).toBe(false);
    expect(firstMessage(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }))).toBe(
      'La contraseña actual es requerida'
    );
  });

  it('rechaza una contraseña nueva corta con el mensaje en español', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'x'.repeat(PASSWORD_MIN_LENGTH - 1) });
    expect(firstMessage(result)).toBe('La contraseña debe tener al menos 8 caracteres');
  });

  it('rechaza una contraseña nueva de más de 72 caracteres con el mensaje en español', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'x'.repeat(PASSWORD_MAX_LENGTH + 1) });
    expect(firstMessage(result)).toBe('La contraseña no puede tener más de 72 caracteres');
  });
});

describe('createUserSchema · contraseña', () => {
  const user = { username: 'usuario1', name: 'Usuario', password: 'x'.repeat(PASSWORD_MIN_LENGTH) };

  it('acepta hasta 72 caracteres', () => {
    expect(createUserSchema.safeParse({ ...user, password: 'x'.repeat(PASSWORD_MAX_LENGTH) }).success).toBe(true);
  });

  it('rechaza más de 72 caracteres', () => {
    const result = createUserSchema.safeParse({ ...user, password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1) });
    expect(firstMessage(result)).toBe('La contraseña no puede tener más de 72 caracteres');
  });

  it('rechaza menos de 8 caracteres', () => {
    const result = createUserSchema.safeParse({ ...user, password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1) });
    expect(firstMessage(result)).toBe('La contraseña debe tener al menos 8 caracteres');
  });
});
