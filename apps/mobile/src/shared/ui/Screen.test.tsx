import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from './Screen';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
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
    // 30 de inset + 16 de margen (SPACING.md).
    expect(screen.UNSAFE_getByProps({ paddingTop: 46 })).toBeTruthy();
  });

  it('suma el inset inferior solo con `insetBottom` (rutas de stack sin tab bar)', () => {
    const { rerender } = render(
      <Screen>
        <Text>contenido</Text>
      </Screen>
    );
    expect(screen.UNSAFE_getByProps({ paddingBottom: 0 })).toBeTruthy();

    rerender(
      <Screen insetBottom>
        <Text>contenido</Text>
      </Screen>
    );
    expect(screen.UNSAFE_getByProps({ paddingBottom: 20 })).toBeTruthy();
  });
});
