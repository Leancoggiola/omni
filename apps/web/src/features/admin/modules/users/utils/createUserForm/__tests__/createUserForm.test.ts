import { describe, expect, it } from 'vitest';

import { createUserFormValidators, INITIAL_CREATE_USER_FORM_VALUES, toCreateUserPayload } from '../createUserForm';

describe('createUserFormValidators', () => {
  it('valida el username con las reglas de shared', () => {
    expect(createUserFormValidators.username('abc')).toBe('Debe tener al menos 6 caracteres');
    expect(createUserFormValidators.username('con espacio')).toBe('Solo se permiten letras y números');
    expect(createUserFormValidators.username('  usuario01  ')).toBeNull();
  });

  it('exige nombre de al menos 2 caracteres', () => {
    expect(createUserFormValidators.name(' a ')).toBe('Debe tener al menos 2 caracteres');
    expect(createUserFormValidators.name('Ana')).toBeNull();
  });

  it('el email es opcional pero debe ser válido si se completa', () => {
    expect(createUserFormValidators.email('   ')).toBeNull();
    expect(createUserFormValidators.email('no-es-email')).toBe('Email inválido');
    expect(createUserFormValidators.email('ana@example.com')).toBeNull();
  });

  it('exige contraseña de al menos 8 caracteres', () => {
    expect(createUserFormValidators.password('corta')).toBe('La contraseña debe tener al menos 8 caracteres');
    expect(createUserFormValidators.password('password123')).toBeNull();
  });

  it('exige que la confirmación coincida', () => {
    const values = { ...INITIAL_CREATE_USER_FORM_VALUES, password: 'password123' };

    expect(createUserFormValidators.confirmPassword('otra-cosa', values)).toBe('Las contraseñas no coinciden');
    expect(createUserFormValidators.confirmPassword('password123', values)).toBeNull();
  });
});

describe('toCreateUserPayload', () => {
  const values = {
    username: ' usuario01 ',
    name: ' Ana Pérez ',
    email: '',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('recorta campos, omite el email vacío y no envía rol ni confirmación', () => {
    expect(toCreateUserPayload(values)).toEqual({
      username: 'usuario01',
      name: 'Ana Pérez',
      password: 'password123',
    });
  });

  it('incluye el email cuando se completó', () => {
    expect(toCreateUserPayload({ ...values, email: ' ana@example.com ' })).toMatchObject({ email: 'ana@example.com' });
  });
});
