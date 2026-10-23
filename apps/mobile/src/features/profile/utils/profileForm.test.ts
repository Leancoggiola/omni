import { validatePasswordForm } from './profileForm';

describe('validatePasswordForm', () => {
  it('acepta la contraseña actual y dos contraseñas nuevas iguales de 8 a 72 caracteres', () => {
    expect(validatePasswordForm('actual', '12345678', '12345678')).toEqual({});
    expect(validatePasswordForm('actual', 'x'.repeat(72), 'x'.repeat(72))).toEqual({});
  });

  it('exige la contraseña actual con el mensaje del schema', () => {
    expect(validatePasswordForm('', '12345678', '12345678')).toEqual({
      currentPassword: 'La contraseña actual es requerida',
    });
  });

  it('marca la nueva contraseña corta con el mensaje del schema', () => {
    expect(validatePasswordForm('actual', '1234567', '1234567')).toEqual({
      newPassword: 'La contraseña debe tener al menos 8 caracteres',
    });
  });

  it('marca la nueva contraseña de más de 72 caracteres con el mensaje del schema', () => {
    expect(validatePasswordForm('actual', 'x'.repeat(73), 'x'.repeat(73))).toEqual({
      newPassword: 'La contraseña no puede tener más de 72 caracteres',
    });
  });

  it('marca que las contraseñas no coinciden en la confirmación, también si está vacía', () => {
    expect(validatePasswordForm('actual', '12345678', '87654321')).toEqual({
      confirmPassword: 'Las contraseñas no coinciden',
    });
    expect(validatePasswordForm('actual', '12345678', '')).toEqual({ confirmPassword: 'Las contraseñas no coinciden' });
  });
});
