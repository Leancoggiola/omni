import { toCreateUserPayload, validateCreateUserForm } from './createUserForm';

const valid = {
  username: 'usuario01',
  name: 'Ana Pérez',
  email: '',
  password: 'password123',
  confirmPassword: 'password123',
};

describe('validateCreateUserForm', () => {
  it('acepta valores válidos con el email vacío', () => {
    expect(validateCreateUserForm(valid)).toEqual({});
  });

  it('valida el usuario con las reglas de shared', () => {
    expect(validateCreateUserForm({ ...valid, username: 'abc' }).username).toBe('Debe tener al menos 6 caracteres');
    expect(validateCreateUserForm({ ...valid, username: 'con espacio' }).username).toBe(
      'Solo se permiten letras y números'
    );
    expect(validateCreateUserForm({ ...valid, username: '  usuario01  ' }).username).toBeUndefined();
  });

  it('exige nombre de al menos 2 caracteres', () => {
    expect(validateCreateUserForm({ ...valid, name: ' a ' }).name).toBe('Debe tener al menos 2 caracteres');
  });

  it('el email es opcional pero debe ser válido si se escribe', () => {
    expect(validateCreateUserForm({ ...valid, email: 'no-es-email' }).email).toBe('Email inválido');
    expect(validateCreateUserForm({ ...valid, email: 'ana@omni.dev' }).email).toBeUndefined();
  });

  it('valida la contraseña con el schema compartido', () => {
    const errors = validateCreateUserForm({ ...valid, password: 'corta', confirmPassword: 'corta' });
    expect(errors.password).toBeTruthy();
  });

  it('exige que la confirmación coincida', () => {
    expect(validateCreateUserForm({ ...valid, confirmPassword: 'otra' }).confirmPassword).toBe(
      'Las contraseñas no coinciden'
    );
  });
});

describe('toCreateUserPayload', () => {
  it('recorta, omite el email vacío y nunca manda role', () => {
    expect(toCreateUserPayload({ ...valid, username: ' usuario01 ', name: ' Ana ' })).toEqual({
      username: 'usuario01',
      name: 'Ana',
      password: 'password123',
    });
  });

  it('incluye el email si se escribió', () => {
    expect(toCreateUserPayload({ ...valid, email: ' ana@omni.dev ' }).email).toBe('ana@omni.dev');
  });
});
