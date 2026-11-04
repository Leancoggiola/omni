import { formatCreatedAt } from './formatCreatedAt';

describe('formatCreatedAt', () => {
  it('formatea dd/mm/aaaa', () => {
    expect(formatCreatedAt('2026-03-07T10:20:30.000Z')).toBe('07/03/2026');
  });

  it('devuelve vacío si no se puede leer', () => {
    expect(formatCreatedAt('nada')).toBe('');
  });
});
