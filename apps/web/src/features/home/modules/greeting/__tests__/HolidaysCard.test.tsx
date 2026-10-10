import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { HolidaysCard } from '../components/HolidaysCard';

import { act, fireEvent, screen } from '@testing-library/react';

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

const withItems = (titles: string[]) =>
  useTodayHolidays.mockReturnValue({
    holidays: holidays(titles.map(title => ({ title }))),
    isLoading: false,
    error: undefined,
  });

describe('HolidaysCard', () => {
  beforeEach(() => {
    useTodayHolidays.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el error y no un estado vacío', () => {
    useTodayHolidays.mockReturnValue({ holidays: holidays([]), isLoading: false, error: new Error('x') });
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toBeInTheDocument();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).not.toBeInTheDocument();
  });

  it('mientras carga muestra un skeleton accesible y no el contenido', () => {
    useTodayHolidays.mockReturnValue({ holidays: holidays([]), isLoading: true, error: undefined });
    renderWithProviders(<HolidaysCard />);
    const skeleton = screen.getByRole('status', { name: 'Cargando efemérides' });
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Efemérides de hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío', () => {
    withItems([]);
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

  it('con una sola efeméride la card no es un botón', () => {
    withItems(['Única']);
    renderWithProviders(<HolidaysCard />);
    expect(screen.queryByRole('button', { name: 'Siguiente efeméride' })).not.toBeInTheDocument();
  });

  it('con varias avanza al hacer click', () => {
    withItems(['Primera', 'Segunda']);
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByText('Primera')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Efemérides de hoy'));
    expect(screen.getByText('Segunda')).toBeInTheDocument();
  });

  it('con varias es un botón operable con Enter y Espacio', () => {
    withItems(['Primera', 'Segunda', 'Tercera']);
    renderWithProviders(<HolidaysCard />);
    const card = screen.getByRole('button', { name: 'Siguiente efeméride' });
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAccessibleDescription('Primera');

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByText('Segunda')).toBeInTheDocument();

    fireEvent.keyDown(card, { key: ' ' });
    expect(screen.getByText('Tercera')).toBeInTheDocument();

    fireEvent.keyDown(card, { key: 'a' });
    expect(screen.getByText('Tercera')).toBeInTheDocument();
  });

  it('el botón es el bloque de texto: el heading sigue accesible y el link no queda anidado', () => {
    withItems(['Primera', 'Segunda']);
    renderWithProviders(<HolidaysCard />);
    const button = screen.getByRole('button', { name: 'Siguiente efeméride' });
    const heading = screen.getByRole('heading', { name: 'Efemérides de hoy' });
    const link = screen.getByRole('link', { name: 'Ver efemérides de hoy en Wikipedia' });

    expect(button).toContainElement(heading);
    expect(button).not.toContainElement(link);
    expect(button.querySelector('a, button, [tabindex]')).toBeNull();
  });

  it('con una sola efeméride el heading tampoco está dentro de un botón', () => {
    withItems(['Única']);
    renderWithProviders(<HolidaysCard />);
    expect(screen.getByRole('heading', { name: 'Efemérides de hoy' })).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('el link a Wikipedia no avanza el carrusel con click ni con teclado', () => {
    withItems(['Primera', 'Segunda']);
    renderWithProviders(<HolidaysCard />);
    const link = screen.getByRole('link', { name: 'Ver efemérides de hoy en Wikipedia' });

    fireEvent.click(link);
    fireEvent.keyDown(link, { key: 'Enter' });
    fireEvent.keyDown(link, { key: ' ' });

    expect(screen.getByText('Primera')).toBeInTheDocument();
  });

  it('pausa el auto-avance con hover y con foco dentro de la card', () => {
    vi.useFakeTimers();
    withItems(['Primera', 'Segunda', 'Tercera']);
    renderWithProviders(<HolidaysCard />);
    const card = screen.getByRole('button', { name: 'Siguiente efeméride' });

    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Primera')).toBeInTheDocument();

    fireEvent.mouseLeave(card);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Segunda')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Ver efemérides de hoy en Wikipedia' });
    fireEvent.focusIn(link);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Segunda')).toBeInTheDocument();

    fireEvent.focusOut(link, { relatedTarget: card });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Segunda')).toBeInTheDocument();

    fireEvent.focusOut(card, { relatedTarget: null });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Tercera')).toBeInTheDocument();
  });
});
