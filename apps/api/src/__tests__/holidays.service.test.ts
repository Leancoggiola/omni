import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WikipediaHolidaysResponse } from '@omni/shared/holidays';

// Lo único que sale a internet.
vi.mock('../holidays/wikipedia.service');

import { getTodayHolidays, resetHolidaysCache } from '../holidays/holidays.service';
import * as wikipediaService from '../holidays/wikipedia.service';

const mockedWikipedia = vi.mocked(wikipediaService);

function rawResponse(...texts: string[]): WikipediaHolidaysResponse {
  return { holidays: texts.map(text => ({ text })) };
}

describe('holidays.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetHolidaysCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formato de fecha', () => {
    it('pide MM/DD con ceros a la izquierda', async () => {
      vi.setSystemTime(new Date('2026-01-05T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día de Reyes'));

      const result = await getTodayHolidays();

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledWith('01', '05');
      expect(result).toMatchObject({ date: '2026-01-05', month: '01', day: '05' });
    });

    it('usa el día de APP_TIMEZONE, no el UTC', async () => {
      // 02:00 UTC del 6 de enero es todavía el 5 de enero 23:00 en Buenos Aires.
      vi.setSystemTime(new Date('2026-01-06T02:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día de Reyes'));

      await getTodayHolidays();

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledWith('01', '05');
    });
  });

  describe('sourceUrl', () => {
    it('apunta al día anclado en Celebraciones, sin cero a la izquierda', async () => {
      vi.setSystemTime(new Date('2026-01-05T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día de Reyes'));

      const { sourceUrl } = await getTodayHolidays();

      expect(sourceUrl).toBe('https://es.wikipedia.org/wiki/5_de_enero#Celebraciones');
    });

    it('usa el nombre del mes en español', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Bibliotecario'));

      const { sourceUrl } = await getTodayHolidays();

      expect(sourceUrl).toBe('https://es.wikipedia.org/wiki/13_de_septiembre#Celebraciones');
    });
  });

  describe('mapeo', () => {
    it('devuelve id, title e isArgentina', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(
        rawResponse('Día Internacional del Chocolate.Celebración instaurada en 1995.')
      );

      const { items } = await getTodayHolidays();

      expect(items).toEqual([{ id: '2026-09-13-0', title: 'Día Internacional del Chocolate', isArgentina: false }]);
    });

    it('descarta lo que el parser rechaza', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(
        rawResponse(
          'san Antero, papa (f. 236)',
          'Día Mundial de la Sepsis',
          'Australia Australia: Día de la Independencia',
          'Argentina Argentina: Día del Bibliotecario'
        )
      );

      const { count, items } = await getTodayHolidays();

      expect(count).toBe(2);
      expect(items.map(i => i.title)).toEqual(['Día Mundial de la Sepsis', 'Día del Bibliotecario']);
      expect(items[1]?.isArgentina).toBe(true);
    });

    it('deduplica títulos repetidos del mismo día', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(
        rawResponse('Día del Bibliotecario', 'Día del bibliotecario', 'Día del Cartero')
      );

      const { count, items } = await getTodayHolidays();

      expect(count).toBe(2);
      expect(items.map(i => i.title)).toEqual(['Día del Bibliotecario', 'Día del Cartero']);
      expect(new Set(items.map(i => i.id)).size).toBe(2);
    });

    it('recorta en MAX_HOLIDAY_ITEMS', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(
        rawResponse(...Array.from({ length: 25 }, (_, i) => `Día de la Efeméride ${i}`))
      );

      const { count, items } = await getTodayHolidays();

      expect(count).toBe(20);
      expect(items).toHaveLength(20);
    });

    it('tolera una respuesta sin holidays', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue({});

      const result = await getTodayHolidays();

      expect(result).toMatchObject({ count: 0, items: [] });
      expect(result.sourceUrl).toContain('13_de_septiembre');
    });

    it.each([
      ['un objeto', { holidays: { text: 'Día del Bibliotecario' } }],
      ['un string', { holidays: 'Día del Bibliotecario' }],
      ['null', { holidays: null }],
    ])('trata un holidays que es %s como lista vacía', async (_label, raw) => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(raw as unknown as WikipediaHolidaysResponse);

      await expect(getTodayHolidays()).resolves.toMatchObject({ count: 0, items: [] });
    });

    it('tolera un body null', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(null as unknown as WikipediaHolidaysResponse);

      await expect(getTodayHolidays()).resolves.toMatchObject({ count: 0, items: [] });
    });

    it('saltea entradas nulas o sin texto', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue({
        holidays: [null, { text: 42 }, {}, { text: 'Día del Bibliotecario' }],
      } as unknown as WikipediaHolidaysResponse);

      const { items } = await getTodayHolidays();

      expect(items).toEqual([{ id: '2026-09-13-3', title: 'Día del Bibliotecario', isArgentina: false }]);
    });
  });

  describe('caché', () => {
    it('no vuelve a llamar a Wikipedia dentro del mismo día', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Bibliotecario'));

      const first = await getTodayHolidays();
      const second = await getTodayHolidays();

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('refetchea cuando cambia el día', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Bibliotecario'));
      await getTodayHolidays();

      vi.setSystemTime(new Date('2026-09-14T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Programador'));
      const next = await getTodayHolidays();

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(2);
      expect(mockedWikipedia.fetchHolidays).toHaveBeenLastCalledWith('09', '14');
      expect(next.date).toBe('2026-09-14');
      expect(next.sourceUrl).toBe('https://es.wikipedia.org/wiki/14_de_septiembre#Celebraciones');
    });

    it('deduplica llamadas concurrentes en un solo fetch', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Bibliotecario'));

      const [a, b, c] = await Promise.all([getTodayHolidays(), getTodayHolidays(), getTodayHolidays()]);

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(1);
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('una respuesta tardía del día anterior no pisa el caché del día vigente', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      let resolveYesterday!: (raw: WikipediaHolidaysResponse) => void;
      mockedWikipedia.fetchHolidays.mockReturnValueOnce(
        new Promise(resolve => {
          resolveYesterday = resolve;
        })
      );
      const yesterdayRequest = getTodayHolidays();

      vi.setSystemTime(new Date('2026-09-14T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockResolvedValueOnce(rawResponse('Día del Programador'));
      const today = await getTodayHolidays();

      resolveYesterday(rawResponse('Día del Bibliotecario'));
      const yesterday = await yesterdayRequest;
      const cached = await getTodayHolidays();

      expect(yesterday.date).toBe('2026-09-13');
      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(2);
      expect(cached).toBe(today);
      expect(cached.items.map(i => i.title)).toEqual(['Día del Programador']);
    });

    it('no cachea el error: el siguiente pedido reintenta', async () => {
      vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
      mockedWikipedia.fetchHolidays.mockRejectedValueOnce({ status: 502, message: 'Error de Wikipedia' });

      await expect(getTodayHolidays()).rejects.toMatchObject({ status: 502 });

      mockedWikipedia.fetchHolidays.mockResolvedValue(rawResponse('Día del Bibliotecario'));
      const retry = await getTodayHolidays();

      expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(2);
      expect(retry.count).toBe(1);
    });
  });
});
