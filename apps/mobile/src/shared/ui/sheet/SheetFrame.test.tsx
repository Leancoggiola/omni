import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { getByHostProps } from '@/test/hostQueries';

import { SheetFrame } from './SheetFrame';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 16, left: 0, right: 0 }),
}));

describe('SheetFrame', () => {
  it('es una superficie sólida de radio 32 arriba con la sombra sheet y el inset abajo', async () => {
    await render(
      <SheetFrame>
        <Text>contenido</Text>
      </SheetFrame>
    );

    const background = getByHostProps({ backgroundColor: 'backgroundStrong' });
    expect(background.props).toMatchObject({ borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowRadius: 32 });
    const container = getByHostProps({ paddingTop: 12 });
    expect(container.props).toMatchObject({ paddingHorizontal: 20, paddingBottom: 24 + 16 });
    expect(screen.getByText('contenido')).toBeTruthy();
  });

  it('lleva un grabber de 40 x 4 en track, oculto para TalkBack', async () => {
    await render(
      <SheetFrame>
        <Text>contenido</Text>
      </SheetFrame>
    );

    const grabber = getByHostProps({ backgroundColor: 'track' });
    expect(grabber.props).toMatchObject({ width: 40, height: 4, importantForAccessibility: 'no-hide-descendants' });
  });

  it('con el teclado abierto el padding inferior es su alto más 16, en vez del inset', async () => {
    await render(
      <SheetFrame keyboardInset={300}>
        <Text>contenido</Text>
      </SheetFrame>
    );

    expect(getByHostProps({ paddingTop: 12 }).props.paddingBottom).toBe(300 + 16);
  });
});
