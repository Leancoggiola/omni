import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FloatingTabBar } from './FloatingTabBar';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const mockSetOffset = jest.fn();
let mockFocused = true;

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui/useTabBarClearance'),
  useSetNotificationsBottomOffset: () => mockSetOffset,
}));

const navigate = jest.fn();
const emit = jest.fn();

const route = (name: string) => ({ key: `${name}-key`, name, params: undefined });

function bar(index: number) {
  const routes = [route('index'), route('media')];
  const descriptors = Object.fromEntries(
    routes.map(r => [
      r.key,
      {
        options: {
          title: r.name === 'index' ? 'Inicio' : 'Media',
          tabBarIcon: ({ focused }: { focused: boolean }) => <Text>{focused ? 'ícono activo' : 'ícono'}</Text>,
          tabBarLabel: ({ children }: { children: string }) => <Text>{children}</Text>,
        },
      },
    ])
  );
  return { state: { index, routes }, descriptors, navigation: { navigate, emit } } as unknown as BottomTabBarProps;
}

const layout = (height: number) =>
  fireEvent(screen.getByTestId('floating-tab-bar'), 'layout', { nativeEvent: { layout: { height } } });

beforeEach(() => {
  mockSetOffset.mockClear();
  navigate.mockClear();
  emit.mockReset().mockReturnValue({ defaultPrevented: false });
  mockFocused = true;
});

describe('FloatingTabBar', () => {
  it('muestra una tab por ruta con su ícono y etiqueta, y marca la activa', () => {
    render(<FloatingTabBar {...bar(0)} />);

    expect(screen.getByRole('tab', { name: 'Inicio', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Media', selected: false })).toBeTruthy();
    expect(screen.getByText('ícono activo')).toBeTruthy();
  });

  it('tocar otra tab emite tabPress y navega; tocar la activa no navega', () => {
    render(<FloatingTabBar {...bar(0)} />);

    fireEvent.press(screen.getByRole('tab', { name: 'Media' }));
    expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'media-key', canPreventDefault: true });
    expect(navigate).toHaveBeenCalledWith('media', undefined);

    navigate.mockClear();
    fireEvent.press(screen.getByRole('tab', { name: 'Inicio' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no navega si alguien frena el tabPress', () => {
    emit.mockReturnValue({ defaultPrevented: true });
    render(<FloatingTabBar {...bar(0)} />);

    fireEvent.press(screen.getByRole('tab', { name: 'Media' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('informa a las notificaciones su alto con la distancia al borde y lo libera al desmontarse', () => {
    const { unmount } = render(<FloatingTabBar {...bar(0)} />);

    layout(72);
    expect(mockSetOffset).toHaveBeenLastCalledWith(72 + 24);

    unmount();
    expect(mockSetOffset).toHaveBeenLastCalledWith(0);
  });

  it('sin foco (Perfil encima de las tabs) informa 0', () => {
    const { rerender } = render(<FloatingTabBar {...bar(0)} />);
    layout(72);

    mockFocused = false;
    rerender(<FloatingTabBar {...bar(0)} />);
    expect(mockSetOffset).toHaveBeenLastCalledWith(0);

    mockFocused = true;
    rerender(<FloatingTabBar {...bar(0)} />);
    expect(mockSetOffset).toHaveBeenLastCalledWith(96);
  });
});
