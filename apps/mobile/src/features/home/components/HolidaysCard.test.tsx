import { fireEvent, render, screen } from '@testing-library/react-native';

import { HolidaysCard } from './HolidaysCard';

const mockUseTodayHolidays = jest.fn();
const mockRetry = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => ({
  ...jest.requireActual('@/test/themeMock'),
  useColorSchemeControl: () => ({ colorScheme: 'light' }),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('../hooks', () => ({
  useTodayHolidays: () => mockUseTodayHolidays(),
  useHolidayCarousel: () => ({ currentIndex: 0, currentItem: null, next: jest.fn() }),
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
});

describe('HolidaysCard', () => {
  it('un error de carga se muestra como ErrorState con Reintentar', () => {
    mockUseTodayHolidays.mockReturnValue({
      holidays: HOLIDAYS,
      isLoading: false,
      error: new Error('boom'),
      retry: mockRetry,
    });
    render(<HolidaysCard />);

    expect(screen.getByText('No se pudieron cargar las efemérides de hoy')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('mientras carga muestra un placeholder accesible, no el estado vacío', () => {
    mockUseTodayHolidays.mockReturnValue({ holidays: HOLIDAYS, isLoading: true, error: undefined, retry: mockRetry });
    render(<HolidaysCard />);

    expect(screen.getByLabelText('Cargando efemérides')).toBeTruthy();
    expect(screen.queryByText('Hoy no hay efemérides registradas')).toBeNull();
  });
});
