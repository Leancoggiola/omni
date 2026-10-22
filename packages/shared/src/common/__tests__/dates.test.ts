import { describe, expect, it } from 'vitest';

import { appDateKey, isoDateStringSchema, monthRange, parseIsoDateString } from '..';

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('appDateKey', () => {
  it('usa el día de calendario de Buenos Aires, no el UTC', () => {
    expect(appDateKey(new Date('2026-03-15T02:30:00Z'))).toBe('2026-03-14');
    expect(appDateKey(new Date('2026-03-15T03:00:00Z'))).toBe('2026-03-15');
  });

  it('rellena mes y día con cero', () => {
    expect(appDateKey(new Date('2026-01-05T15:00:00Z'))).toBe('2026-01-05');
  });

  it('cruza el fin de año según la zona horaria', () => {
    expect(appDateKey(new Date('2027-01-01T02:59:59Z'))).toBe('2026-12-31');
    expect(appDateKey(new Date('2027-01-01T03:00:00Z'))).toBe('2027-01-01');
  });
});

describe('parseIsoDateString', () => {
  it('devuelve la medianoche UTC del día', () => {
    expect(parseIsoDateString('2026-08-15').toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(iso(parseIsoDateString('2028-02-29'))).toBe('2028-02-29');
  });

  it('no valida: un día inexistente se corre en silencio (lo frena isoDateStringSchema)', () => {
    expect(iso(parseIsoDateString('2026-02-31'))).toBe('2026-03-03');
    expect(isoDateStringSchema.safeParse('2026-02-31').success).toBe(false);
  });
});

describe('monthRange', () => {
  it('va del primero al último día del mes', () => {
    const { start, end } = monthRange('2026-08');

    expect(iso(start)).toBe('2026-08-01');
    expect(iso(end)).toBe('2026-08-31');
  });

  it('respeta febrero común y bisiesto', () => {
    expect(iso(monthRange('2025-02').end)).toBe('2025-02-28');
    expect(iso(monthRange('2028-02').end)).toBe('2028-02-29');
  });

  it('cierra diciembre dentro del mismo año', () => {
    const { start, end } = monthRange('2026-12');

    expect(iso(start)).toBe('2026-12-01');
    expect(iso(end)).toBe('2026-12-31');
  });
});
