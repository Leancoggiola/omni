import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { HOLIDAY_CAROUSEL_DURATION_MS } from '@omni/shared/holidays';

import { HolidaysCard } from './HolidaysCard';

const mockUseTodayHolidays = jest.fn();
const mockUseHolidayCarousel = jest.fn();
const mockRetry = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light' }),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('../hooks/useTodayHolidays', () => ({ useTodayHolidays: () => mockUseTodayHolidays() }));
jest.mock('../hooks/useHolidayCarousel', () => ({
  useHolidayCarousel: (...args: unknown[]) => mockUseHolidayCarousel(...args),
}));

const HOLIDAYS = {
  date: '2026-10-09',
  month: '10',
  day: '09',
  count: 0,
  sourceUrl: 'https://wikipedia.org',
  items: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseHolidayCarousel.mockReturnValue({
    currentIndex: 0,
    currentItem: null,
    isAutoPlaying: false,
    next: jest.fn(),
  });
});

describe('HolidaysCard', () => {
  it('el avance y la barra de progreso usan la duración compartida', async () => {
    const items = [{ title: 'Primera' }, { title: 'Segunda' }];
    mockUseTodayHolidays.mockReturnValue({
      holidays: { ...HOLIDAYS, count: items.length, items },
      isLoading: false,
      error: undefined,
      retry: mockRetry,
    });
    mockUseHolidayCarousel.mockReturnValue({
      currentIndex: 0,
      currentItem: items[0],
      isAutoPlaying: true,
      next: jest.fn(),
    });
    const timing = jest.spyOn(Animated, 'timing');
    const view = await render(<HolidaysCard />);

    expect(mockUseHolidayCarousel).toHaveBeenCalledWith(items, HOLIDAY_CAROUSEL_DURATION_MS);
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: HOLIDAY_CAROUSEL_DURATION_MS })
    );

    await view.unmount();
    timing.mockRestore();
  });

  it('un error de carga se muestra como ErrorState con Reintentar', async () => {
    mockUseTodayHolidays.mockReturnValue({
      holidays: HOLIDAYS,
      isLoading: false,
      error: new Error('boom'),
      retry: mockRetry,
    });
    await render(<HolidaysCard />);

    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('mientras carga muestra un placeholder accesible, no el estado vacío', async () => {
    mockUseTodayHolidays.mockReturnValue({ holidays: HOLIDAYS, isLoading: true, error: undefined, retry: mockRetry });
    await render(<HolidaysCard />);

    expect(screen.getByLabelText('Cargando efemérides')).toBeTruthy();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).toBeNull();
  });
});
