import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from './Screen';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 30, bottom: 20, left: 0, right: 0 }),
}));

describe('Screen', () => {
  it('siempre deja lugar a la status bar: ninguna ruta tiene header nativo', () => {
    render(
      <Screen>
        <Text>contenido</Text>
      </Screen>
    );

    expect(screen.getByText('contenido')).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ paddingTop: 46 })).toBeTruthy();
  });

  it('en una pantalla de tab reserva el lugar de la tab bar flotante y con `insetBottom` (stack) solo el inset', () => {
    const { rerender } = render(
      <Screen>
        <Text>contenido</Text>
      </Screen>
    );
    expect(screen.UNSAFE_getByProps({ paddingBottom: 72 + 24 + 16 })).toBeTruthy();

    rerender(
      <Screen insetBottom>
        <Text>contenido</Text>
      </Screen>
    );
    expect(screen.UNSAFE_getByProps({ paddingBottom: 20 })).toBeTruthy();
  });

  it('pinta las manchas del fondo, decorativas y fuera de TalkBack', () => {
    render(
      <Screen>
        <Text>contenido</Text>
      </Screen>
    );

    expect(screen.UNSAFE_getByProps({ importantForAccessibility: 'no-hide-descendants' })).toBeTruthy();
  });
});
