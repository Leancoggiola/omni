import { describe, expect, it } from 'vitest';

import { resolveOriginSecret, resolveRateLimitGlobalMax } from '../config';

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
