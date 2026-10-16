import { describe, expect, it } from 'vitest';

import {
  parseDurationMs,
  resolveJwtConfig,
  resolveOriginSecret,
  resolveRateLimitGlobalMax,
  resolveTmdbApiKey,
} from '../config';

describe('resolveOriginSecret', () => {
  it('en producción sin secreto falla al arrancar con un error claro', () => {
    expect(() => resolveOriginSecret(undefined, true)).toThrow(/ORIGIN_SECRET es obligatorio en producción/);
    expect(() => resolveOriginSecret('   ', true)).toThrow(/ORIGIN_SECRET/);
  });

  it('en producción con secreto lo devuelve', () => {
    expect(resolveOriginSecret('secreto', true)).toBe('secreto');
  });

  it('fuera de producción es opcional', () => {
    expect(resolveOriginSecret(undefined, false)).toBeUndefined();
    expect(resolveOriginSecret('', false)).toBeUndefined();
    expect(resolveOriginSecret('secreto', false)).toBe('secreto');
  });
});

describe('resolveRateLimitGlobalMax', () => {
  it('usa 300 si no está definido', () => {
    expect(resolveRateLimitGlobalMax(undefined)).toBe(300);
  });

  it.each(['', 'abc', '0', '-5', '1.5', 'NaN'])('usa 300 con el valor inválido %j', raw => {
    expect(resolveRateLimitGlobalMax(raw)).toBe(300);
  });

  it('respeta un entero positivo', () => {
    expect(resolveRateLimitGlobalMax('500')).toBe(500);
  });
});

describe('parseDurationMs', () => {
  it.each([
    ['15m', 15 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
    ['2h', 2 * 60 * 60 * 1000],
    ['90s', 90 * 1000],
    ['900', 900 * 1000],
    [' 15m ', 15 * 60 * 1000],
  ])('convierte %j a milisegundos', (raw, expected) => {
    expect(parseDurationMs(raw, 'JWT_ACCESS_EXPIRES_IN')).toBe(expected);
  });

  it.each(['time_m', 'time_d', '', '0', '0m', '-5m', '1.5h', '15 minutes', 'm', '15w', '9'.repeat(30) + 'd'])(
    'rechaza el valor inválido %j nombrando la variable',
    raw => {
      expect(() => parseDurationMs(raw, 'JWT_ACCESS_EXPIRES_IN')).toThrow(/JWT_ACCESS_EXPIRES_IN inválido/);
    }
  );
});

describe('parseDurationMs: tope', () => {
  it('acepta hasta 3650 días', () => {
    expect(parseDurationMs('3650d', 'JWT_REFRESH_EXPIRES_IN')).toBe(3650 * 24 * 60 * 60 * 1000);
  });

  it.each(['3651d', '99999999d', '999999999h'])('rechaza %j por salirse del rango de fechas', raw => {
    expect(() => parseDurationMs(raw, 'JWT_REFRESH_EXPIRES_IN')).toThrow(/JWT_REFRESH_EXPIRES_IN inválido/);
  });
});

describe('resolveTmdbApiKey', () => {
  const v3Key = '0123456789abcdef0123456789ABCDEF';
  const readAccessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYmMifQ.firma';

  it('en producción rechaza una API key v3', () => {
    expect(() => resolveTmdbApiKey(v3Key, true)).toThrow(/API Read Access Token/);
  });

  it('en producción acepta el Read Access Token', () => {
    expect(resolveTmdbApiKey(readAccessToken, true)).toBe(readAccessToken);
  });

  it('fuera de producción acepta cualquier valor', () => {
    expect(resolveTmdbApiKey(v3Key, false)).toBe(v3Key);
    expect(resolveTmdbApiKey('test-tmdb-api-key', false)).toBe('test-tmdb-api-key');
  });
});

describe('resolveJwtConfig', () => {
  const secrets = {
    accessSecret: 'a'.repeat(32),
    refreshSecret: 'b'.repeat(32),
    accessExpiresIn: undefined,
    refreshExpiresIn: undefined,
  };

  it('usa 15m y 7d por defecto y expone las vigencias en milisegundos', () => {
    expect(resolveJwtConfig(secrets, true)).toMatchObject({
      accessTtlMs: 15 * 60 * 1000,
      refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('toma las vigencias configuradas', () => {
    expect(resolveJwtConfig({ ...secrets, accessExpiresIn: '20s', refreshExpiresIn: '2d' }, true)).toMatchObject({
      accessTtlMs: 20 * 1000,
      refreshTtlMs: 2 * 24 * 60 * 60 * 1000,
    });
  });

  it('en producción rechaza secretos de menos de 32 caracteres', () => {
    expect(() => resolveJwtConfig({ ...secrets, accessSecret: 'access' }, true)).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => resolveJwtConfig({ ...secrets, refreshSecret: 'b'.repeat(31) }, true)).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('en producción rechaza secretos iguales', () => {
    expect(() => resolveJwtConfig({ ...secrets, refreshSecret: secrets.accessSecret }, true)).toThrow(/distintos/);
  });

  it('fuera de producción acepta secretos cortos o iguales', () => {
    expect(() =>
      resolveJwtConfig({ ...secrets, accessSecret: 'access', refreshSecret: 'access' }, false)
    ).not.toThrow();
  });

  it.each([true, false])('rechaza una vigencia inválida (producción: %s)', isProduction => {
    expect(() => resolveJwtConfig({ ...secrets, accessExpiresIn: 'time_m' }, isProduction)).toThrow(
      /JWT_ACCESS_EXPIRES_IN inválido/
    );
    expect(() => resolveJwtConfig({ ...secrets, refreshExpiresIn: 'time_d' }, isProduction)).toThrow(
      /JWT_REFRESH_EXPIRES_IN inválido/
    );
  });
});
