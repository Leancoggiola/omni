import {
  FUTURE_DATE_MESSAGE,
  INVALID_DATE_MESSAGE,
  maskDateInput,
  parseOtherDate,
  relativeDateKey,
} from './gatheringDate';

const NOW = new Date('2026-10-18T15:00:00.000Z');

describe('relativeDateKey', () => {
  it('Hoy y Ayer salen en la zona horaria de la app', () => {
    expect(relativeDateKey('today', NOW)).toBe('2026-10-18');
    expect(relativeDateKey('yesterday', NOW)).toBe('2026-10-17');
  });

  it('de madrugada en UTC todavía es el día anterior en Argentina', () => {
    expect(relativeDateKey('today', new Date('2026-10-18T01:00:00.000Z'))).toBe('2026-10-17');
  });
});

describe('maskDateInput', () => {
  it('pone las barras y deja hasta 8 dígitos', () => {
    expect(maskDateInput('18')).toBe('18');
    expect(maskDateInput('1810')).toBe('18/10');
    expect(maskDateInput('18102026999')).toBe('18/10/2026');
  });
});

describe('parseOtherDate', () => {
  it('acepta un día real que no sea futuro', () => {
    expect(parseOtherDate('18/10/2026', NOW)).toEqual({ date: '2026-10-18' });
  });

  it.each(['', '18/10', '31/02/2026', '10/10/1899'])('"%s" no es una fecha válida', display => {
    expect(parseOtherDate(display, NOW)).toEqual({ error: INVALID_DATE_MESSAGE });
  });

  it('rechaza una fecha futura', () => {
    expect(parseOtherDate('19/10/2026', NOW)).toEqual({ error: FUTURE_DATE_MESSAGE });
  });
});
