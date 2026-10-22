import { describe, expect, it } from 'vitest';

import { ApiError, getErrorMessage, isClientError, SWR_RETRY_OPTIONS, toApiError } from '..';

describe('toApiError', () => {
  it('toma el message del body y guarda el body en info', async () => {
    const err = await toApiError({
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ message: 'Ya existe', field: 'username' }),
    });

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: 'Ya existe', status: 409, info: { message: 'Ya existe', field: 'username' } });
  });

  it('sin message, o con un body que no es JSON, usa el statusText', async () => {
    const empty = await toApiError({ status: 502, statusText: 'Bad Gateway', json: async () => null });
    const html = await toApiError({
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    expect(empty.message).toBe('Bad Gateway');
    expect(html).toMatchObject({ message: 'Bad Gateway', info: {} });
  });
});

describe('getErrorMessage', () => {
  it('usa el mensaje de un ApiError', () => {
    expect(getErrorMessage(new ApiError('Usuario o contraseña incorrectos', 401), 'Error')).toBe(
      'Usuario o contraseña incorrectos'
    );
  });

  it('usa el fallback para un ApiError sin mensaje, un error de red o cualquier otro valor', () => {
    expect(getErrorMessage(new ApiError('', 500), 'No se pudo guardar')).toBe('No se pudo guardar');
    expect(getErrorMessage(new TypeError('Failed to fetch'), 'No se pudo guardar')).toBe('No se pudo guardar');
    expect(getErrorMessage('boom', 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});

describe('isClientError', () => {
  it.each([400, 401, 403, 404, 422])('un %i es error del cliente', status => {
    expect(isClientError(new ApiError('x', status))).toBe(true);
  });

  it.each([0, 408, 429, 500, 503])('un %i no lo es', status => {
    expect(isClientError(new ApiError('x', status))).toBe(false);
  });

  it('un error que no es ApiError no lo es', () => {
    expect(isClientError(new TypeError('Network request failed'))).toBe(false);
  });
});

describe('SWR_RETRY_OPTIONS', () => {
  it('reintenta 3 veces, salvo los errores del cliente', () => {
    expect(SWR_RETRY_OPTIONS.errorRetryCount).toBe(3);
    expect(SWR_RETRY_OPTIONS.shouldRetryOnError(new ApiError('x', 500))).toBe(true);
    expect(SWR_RETRY_OPTIONS.shouldRetryOnError(new ApiError('x', 429))).toBe(true);
    expect(SWR_RETRY_OPTIONS.shouldRetryOnError(new ApiError('x', 404))).toBe(false);
  });
});
