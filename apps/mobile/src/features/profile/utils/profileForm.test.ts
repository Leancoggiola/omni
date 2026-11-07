import { birthDateToDisplay, maskBirthDateInput, parseBirthDateInput, validatePasswordForm } from './profileForm';

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

describe('maskBirthDateInput', () => {
  it('pone las barras solas y deja solo dígitos hasta 8', () => {
    expect(maskBirthDateInput('1')).toBe('1');
    expect(maskBirthDateInput('150')).toBe('15/0');
    expect(maskBirthDateInput('15051990')).toBe('15/05/1990');
    expect(maskBirthDateInput('15/05/1990999')).toBe('15/05/1990');
    expect(maskBirthDateInput('ab')).toBe('');
  });
});

describe('birthDateToDisplay', () => {
  it('muestra el día de calendario de la API en dd/mm/aaaa', () => {
    expect(birthDateToDisplay('1990-05-15T00:00:00.000Z')).toBe('15/05/1990');
    expect(birthDateToDisplay(null)).toBe('');
    expect(birthDateToDisplay(undefined)).toBe('');
  });
});

describe('parseBirthDateInput', () => {
  const today = new Date(2026, 10, 4);

  it('devuelve el día en YYYY-MM-DD o null si el campo está vacío', () => {
    expect(parseBirthDateInput('15/05/1990', today)).toBe('1990-05-15');
    expect(parseBirthDateInput('', today)).toBeNull();
    expect(parseBirthDateInput('  ', today)).toBeNull();
  });

  it('rechaza fechas incompletas, inexistentes, anteriores a 1900 o futuras', () => {
    expect(parseBirthDateInput('15/05', today)).toBeUndefined();
    expect(parseBirthDateInput('31/02/1990', today)).toBeUndefined();
    expect(parseBirthDateInput('15/05/1899', today)).toBeUndefined();
    expect(parseBirthDateInput('05/11/2026', today)).toBeUndefined();
    expect(parseBirthDateInput('04/11/2026', today)).toBe('2026-11-04');
  });
});
