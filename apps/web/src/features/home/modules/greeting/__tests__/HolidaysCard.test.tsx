import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { HolidaysCard } from '../components/HolidaysCard';

import { fireEvent, screen } from '@testing-library/react';

const useTodayHolidays = vi.fn();

vi.mock('../hooks', () => ({
  useTodayHolidays: () => useTodayHolidays(),
}));

const holidays = (items: { title: string; isArgentina?: boolean }[]) => ({
  date: '2026-10-07',
  month: '10',
  day: '07',
  count: items.length,
  sourceUrl: 'https://wikipedia.org',
  items,
});

describe('HolidaysCard', () => {
  beforeEach(() => {
    useTodayHolidays.mockReset();
  });

  it('muestra el error y no un estado vacío', () => {
    useTodayHolidays.mockReturnValue({ holidays: holidays([]), isLoading: false, error: new Error('x') });
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toBeInTheDocument();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).not.toBeInTheDocument();
  });

  it('no muestra contenido mientras carga', () => {
    useTodayHolidays.mockReturnValue({ holidays: holidays([]), isLoading: true, error: undefined });
    renderWithProviders(<HolidaysCard />);
    expect(screen.queryByText('Efemérides de hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío', () => {
    useTodayHolidays.mockReturnValue({ holidays: holidays([]), isLoading: false, error: undefined });
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText('Hoy no hay efemérides registradas')).toBeInTheDocument();
  });

  it('muestra una efeméride con marca de Argentina', () => {
    useTodayHolidays.mockReturnValue({
      holidays: holidays([{ title: 'Día del Respeto', isArgentina: true }]),
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText(/Día del Respeto · en Argentina/)).toBeInTheDocument();
  });

  it('con varias avanza al hacer click', () => {
    useTodayHolidays.mockReturnValue({
      holidays: holidays([{ title: 'Primera' }, { title: 'Segunda' }]),
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText('Primera')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Efemérides de hoy'));
    expect(screen.getByText('Segunda')).toBeInTheDocument();
  });
});
