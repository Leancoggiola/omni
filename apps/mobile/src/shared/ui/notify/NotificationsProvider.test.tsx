import { SPACING } from '@omni/shared/theme';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Dimensions, Keyboard } from 'react-native';

import { autoCloseMs, notifyError, notifySuccess } from './notify';
import { NotificationsProvider, useSetNotificationsBottomOffset } from './NotificationsProvider';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

/** Doble de la tab bar: informa su alto como lo hace `MeasuredTabBar`. */
function TabBar({ height }: { height: number }) {
  const setBottomOffset = useSetNotificationsBottomOffset();
  useEffect(() => {
    setBottomOffset(height);
    return () => setBottomOffset(0);
  }, [height, setBottomOffset]);
  return null;
}

const stackBottom = () => screen.getByTestId('notifications-stack').props.bottom;

describe('NotificationsProvider', () => {
  afterEach(() => jest.useRealTimers());

  it('apila los toasts abajo, encima de la tab bar; sin tab bar, sobre el inset inferior', () => {
    const { rerender } = render(
      <NotificationsProvider>
        <TabBar height={80} />
      </NotificationsProvider>
    );
    expect(stackBottom()).toBe(80 + SPACING.sm);

    rerender(<NotificationsProvider>{null}</NotificationsProvider>);
    expect(stackBottom()).toBe(16 + SPACING.sm);
  });

  it('con el teclado abierto se apoya encima de lo que tapa el teclado', () => {
    const listeners: Record<string, (event: unknown) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((name, cb) => {
      listeners[name] = cb as (event: unknown) => void;
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 411, height: 900, scale: 1, fontScale: 1 });
    render(
      <NotificationsProvider>
        <TabBar height={80} />
      </NotificationsProvider>
    );

    act(() => listeners.keyboardDidShow?.({ endCoordinates: { screenY: 600, height: 300 } }));
    expect(stackBottom()).toBe(300 + SPACING.sm);

    act(() => listeners.keyboardDidHide?.({}));
    expect(stackBottom()).toBe(80 + SPACING.sm);
    jest.restoreAllMocks();
  });

  it('se cierra solo: el éxito a los 4 s y el error a los 8 s', () => {
    jest.useFakeTimers();
    render(<NotificationsProvider>{null}</NotificationsProvider>);
    act(() => {
      notifySuccess('Listo el cambio');
      notifyError('Falló el cambio');
    });

    act(() => jest.advanceTimersByTime(autoCloseMs('success')));
    expect(screen.queryByText('Listo el cambio')).toBeNull();
    expect(screen.getByText('Falló el cambio')).toBeTruthy();

    act(() => jest.advanceTimersByTime(autoCloseMs('error') - autoCloseMs('success')));
    expect(screen.queryByText('Falló el cambio')).toBeNull();
  });

  it('muestra el toast y la X lo cierra', () => {
    jest.useFakeTimers();
    render(<NotificationsProvider>{null}</NotificationsProvider>);

    act(() => notifySuccess('Agregado a tu lista'));
    expect(screen.getByText('Agregado a tu lista')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(screen.queryByText('Agregado a tu lista')).toBeNull();
  });
});
