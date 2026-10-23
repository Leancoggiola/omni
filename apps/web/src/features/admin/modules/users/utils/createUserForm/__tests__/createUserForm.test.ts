import { describe, expect, it } from 'vitest';

import { createUserFormSchema, INITIAL_CREATE_USER_FORM_VALUES, toCreateUserPayload } from '../createUserForm';

const valid = {
  username: 'usuario01',
  name: 'Ana Pérez',
  email: '',
  password: 'password123',
  confirmPassword: 'password123',
};

function errorFor(values: Partial<typeof valid>, field: string) {
  const result = createUserFormSchema.safeParse({ ...valid, ...values });
  if (result.success) return null;
  return result.error.issues.find(issue => issue.path[0] === field)?.message ?? null;
}

describe('createUserFormSchema', () => {
  it('acepta valores válidos, con el email vacío', () => {
    expect(createUserFormSchema.safeParse(valid).success).toBe(true);
  });

  it('valida el username con las reglas de shared', () => {
    expect(errorFor({ username: 'abc' }, 'username')).toBe('Debe tener al menos 6 caracteres');
    expect(errorFor({ username: 'con espacio' }, 'username')).toBe('Solo se permiten letras y números');
    expect(errorFor({ username: '  usuario01  ' }, 'username')).toBeNull();
  });

  it('exige nombre de al menos 2 caracteres', () => {
    expect(errorFor({ name: ' a ' }, 'name')).toBe('Debe tener al menos 2 caracteres');
  });

  it('el email es opcional pero debe ser válido si se completa', () => {
    expect(errorFor({ email: '   ' }, 'email')).toBeNull();
    expect(errorFor({ email: 'no-es-email' }, 'email')).toBe('Email inválido');
    expect(errorFor({ email: 'ana@example.com' }, 'email')).toBeNull();
  });

  it('exige contraseña de al menos 8 caracteres', () => {
    expect(errorFor({ password: 'corta', confirmPassword: 'corta' }, 'password')).toBe(
      'La contraseña debe tener al menos 8 caracteres'
    );
  });

  it('exige que la confirmación coincida', () => {
    expect(errorFor({ confirmPassword: 'otra-cosa' }, 'confirmPassword')).toBe('Las contraseñas no coinciden');
  });

  it('el estado inicial falla por los campos requeridos', () => {
    expect(createUserFormSchema.safeParse(INITIAL_CREATE_USER_FORM_VALUES).success).toBe(false);
  });
});

describe('toCreateUserPayload', () => {
  const values = { ...valid, username: ' usuario01 ', name: ' Ana Pérez ' };

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
