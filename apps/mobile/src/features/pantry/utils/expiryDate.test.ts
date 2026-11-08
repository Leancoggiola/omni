import { expiryToDisplay, maskExpiryInput, parseExpiryInput } from './expiryDate';

describe('expiryDate', () => {
  it('enmascara mientras se escribe', () => {
    expect(maskExpiryInput('2')).toBe('2');
    expect(maskExpiryInput('2011')).toBe('20/11');
    expect(maskExpiryInput('20112026999')).toBe('20/11/2026');
    expect(maskExpiryInput('ab')).toBe('');
  });

  it('muestra el día guardado sin corrimiento de zona', () => {
    expect(expiryToDisplay('2026-11-20')).toBe('20/11/2026');
    expect(expiryToDisplay(null)).toBe('');
  });

  it('parsea: vacío es null, inválido es undefined', () => {
    expect(parseExpiryInput('')).toBeNull();
    expect(parseExpiryInput('20/11/2026')).toBe('2026-11-20');
    expect(parseExpiryInput('31/02/2026')).toBeUndefined();
    expect(parseExpiryInput('20/11')).toBeUndefined();
  });
});
