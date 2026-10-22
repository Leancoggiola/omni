import { describe, expect, it } from 'vitest';

import { clampCarouselIndex, emptyTodayHolidays, isStaleHolidayDay, nextCarouselIndex } from '..';

describe('índices del carrusel', () => {
  it('avanza de a uno y vuelve al primero después del último', () => {
    expect(nextCarouselIndex(0, 3)).toBe(1);
    expect(nextCarouselIndex(2, 3)).toBe(0);
  });

  it('con la lista vacía queda en 0', () => {
    expect(nextCarouselIndex(4, 0)).toBe(0);
    expect(clampCarouselIndex(4, 0)).toBe(0);
  });

  it('si la lista se achicó, recorta el índice antes de avanzar', () => {
    expect(clampCarouselIndex(4, 3)).toBe(1);
    expect(nextCarouselIndex(4, 3)).toBe(2);
  });
});

describe('isStaleHolidayDay', () => {
  it('solo es viejo si el servidor contestó con un día anterior al del cliente', () => {
    expect(isStaleHolidayDay({ date: '2026-10-21' }, '2026-10-22')).toBe(true);
    expect(isStaleHolidayDay({ date: '2026-10-22' }, '2026-10-22')).toBe(false);
    expect(isStaleHolidayDay({ date: '2026-10-23' }, '2026-10-22')).toBe(false);
  });
});

describe('emptyTodayHolidays', () => {
  it('arma el día sin efemérides a partir de la clave', () => {
    expect(emptyTodayHolidays('2026-10-22')).toEqual({
      date: '2026-10-22',
      month: '10',
      day: '22',
      count: 0,
      sourceUrl: 'https://wikipedia.org',
      items: [],
    });
  });
});
