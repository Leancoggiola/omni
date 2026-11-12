import { describe, expect, it } from 'vitest';

import { ignoreError } from '..';

describe('ignoreError', () => {
  it('como catch de una promesa rechazada la deja resuelta sin valor', async () => {
    await expect(Promise.reject(new Error('falló')).catch(ignoreError)).resolves.toBeUndefined();
  });

  it('dentro de un catch sincrónico no relanza', () => {
    expect(() => {
      try {
        throw new Error('falló');
      } catch {
        ignoreError();
      }
    }).not.toThrow();
  });
});
