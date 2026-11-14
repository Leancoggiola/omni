import { fireEvent, render, screen } from '@testing-library/react-native';
import { XIcon } from 'phosphor-react-native';

import { IconButton } from './IconButton';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('IconButton', () => {
  it('es un botón circular que anuncia su label y llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={XIcon} accessibilityLabel="Cerrar" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Cerrar' });
    expect(button).toHaveProp('borderRadius', 9999);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('la variante glass usa la superficie y el borde glass', async () => {
    await render(<IconButton icon={XIcon} variant="glass" accessibilityLabel="Volver" />);

    const button = screen.getByRole('button', { name: 'Volver' });
    expect(button).toHaveProp('backgroundColor', 'surfaceGlass');
    expect(button).toHaveProp('borderColor', 'glassBorder');
  });

  it('deshabilitado no llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={XIcon} accessibilityLabel="Cerrar" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
