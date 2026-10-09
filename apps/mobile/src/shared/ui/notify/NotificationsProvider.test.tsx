import { SPACING } from '@omni/shared/theme';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { notifySuccess } from './notify';
import { NotificationsProvider, useNotificationsBottomOffset } from './NotificationsProvider';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

/** Doble de la tab bar: informa su alto como lo hace `MeasuredTabBar`. */
function TabBar({ height }: { height: number }) {
  const setBottomOffset = useNotificationsBottomOffset();
  useEffect(() => {
    setBottomOffset(height);
    return () => setBottomOffset(0);
  }, [height, setBottomOffset]);
  return null;
}

/** La pila es el View absoluto que lleva `bottom`. */
const stackBottom = () =>
  screen.UNSAFE_getAllByType(View).find(node => typeof node.props.bottom === 'number')?.props.bottom;

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

  it('muestra el toast y la X lo cierra', () => {
    jest.useFakeTimers();
    render(<NotificationsProvider>{null}</NotificationsProvider>);

    act(() => notifySuccess('Agregado a tu lista'));
    expect(screen.getByText('Agregado a tu lista')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(screen.queryByText('Agregado a tu lista')).toBeNull();
  });
});
