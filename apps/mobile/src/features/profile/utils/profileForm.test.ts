import { buildProfileUpdates, normalizePhone, validatePasswordForm } from './profileForm';

describe('normalizePhone', () => {
  it('recorta y trata vacío como sin teléfono', () => {
    expect(normalizePhone('  +54 11 5555  ')).toBe('+54 11 5555');
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('buildProfileUpdates', () => {
  it('sin cambios no manda nada (el botón queda deshabilitado)', () => {
    expect(buildProfileUpdates({ phone: '123' }, '123')).toEqual({});
    expect(buildProfileUpdates({ phone: '123' }, ' 123 ')).toEqual({});
    expect(buildProfileUpdates({ phone: null }, '')).toEqual({});
  });

  it('manda solo el teléfono, nunca la fecha de nacimiento', () => {
    expect(buildProfileUpdates({ phone: null }, '123')).toEqual({ phone: '123' });
    expect(buildProfileUpdates({ phone: '123' }, '')).toEqual({ phone: null });
  });
});

describe('validatePasswordForm', () => {
  it('acepta dos contraseñas iguales de 8 o más caracteres', () => {
    expect(validatePasswordForm('12345678', '12345678')).toEqual({});
  });

  it('marca la nueva contraseña corta y la confirmación vacía', () => {
    expect(validatePasswordForm('1234567', '')).toEqual({
      newPassword: 'La contraseña debe tener al menos 8 caracteres',
      confirmPassword: 'La contraseña debe tener al menos 8 caracteres',
    });
  });

  it('una confirmación de 8+ caracteres pasa por la misma regla del schema y solo se compara', () => {
    expect(validatePasswordForm('12345678', '1234567')).toEqual({
      confirmPassword: 'La contraseña debe tener al menos 8 caracteres',
    });
  });

  it('marca que las contraseñas no coinciden en la confirmación', () => {
    expect(validatePasswordForm('12345678', '87654321')).toEqual({ confirmPassword: 'Las contraseñas no coinciden' });
  });
});
