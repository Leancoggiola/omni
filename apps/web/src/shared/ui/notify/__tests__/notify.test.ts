import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api';

import { getErrorMessage } from '../notify';

describe('getErrorMessage', () => {
  it('muestra el mensaje de un ApiError', () => {
    expect(getErrorMessage(new ApiError('Usuario o contraseña incorrectos', 401), 'fallback')).toBe(
      'Usuario o contraseña incorrectos'
    );
  });

  it.each([
    ['un error de red', new TypeError('Failed to fetch')],
    ['un error de parseo', new SyntaxError('Unexpected token <')],
    ['un Error cualquiera', new Error('boom')],
    ['un valor que no es Error', 'boom'],
    ['un ApiError sin mensaje', new ApiError('', 500)],
  ])('usa el fallback ante %s', (_label, err) => {
    expect(getErrorMessage(err, 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
