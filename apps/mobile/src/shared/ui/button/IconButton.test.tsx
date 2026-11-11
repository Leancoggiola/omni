import { fireEvent, render, screen } from '@testing-library/react-native';
import { XIcon } from 'phosphor-react-native';

import { IconButton } from './IconButton';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('IconButton', () => {
  it('es un botón circular que anuncia su label y llama a onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={XIcon} accessibilityLabel="Cerrar" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Cerrar' });
    expect(button).toHaveProp('borderRadius', 9999);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('la variante glass usa la superficie y el borde glass', () => {
    render(<IconButton icon={XIcon} variant="glass" accessibilityLabel="Volver" />);

    const button = screen.getByRole('button', { name: 'Volver' });
    expect(button).toHaveProp('backgroundColor', '$surfaceGlass');
    expect(button).toHaveProp('borderColor', '$glassBorder');
  });

  it('deshabilitado no llama a onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={XIcon} accessibilityLabel="Cerrar" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
