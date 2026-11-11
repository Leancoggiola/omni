import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SheetFrame } from './SheetFrame';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 16, left: 0, right: 0 }),
}));

describe('SheetFrame', () => {
  it('es una superficie sólida de radio 32 arriba con la sombra sheet y el inset abajo', () => {
    render(
      <SheetFrame>
        <Text>contenido</Text>
      </SheetFrame>
    );

    const frame = screen.UNSAFE_getByProps({ backgroundColor: '$backgroundStrong' });
    expect(frame.props).toMatchObject({
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 24 + 16,
      shadowRadius: 32,
    });
    expect(screen.getByText('contenido')).toBeTruthy();
  });

  it('lleva un grabber de 40 x 4 en track, oculto para TalkBack', () => {
    render(
      <SheetFrame>
        <Text>contenido</Text>
      </SheetFrame>
    );

    const grabber = screen.UNSAFE_getByProps({ backgroundColor: '$track' });
    expect(grabber.props).toMatchObject({ width: 40, height: 4, importantForAccessibility: 'no-hide-descendants' });
  });
});
