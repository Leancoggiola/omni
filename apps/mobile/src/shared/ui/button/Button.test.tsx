import { SEMANTIC } from '@omni/shared/theme';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlusIcon } from 'phosphor-react-native';

import { Button } from './Button';
import { buttonPalette } from './buttonStyles';
import { IconButton } from './IconButton';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

const s = SEMANTIC.light;

describe('Button', () => {
  it('es un botón con su texto y llama a onPress', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Guardar</Button>);

    fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no llama a onPress y lo anuncia', () => {
    const onPress = jest.fn();
    render(
      <Button disabled onPress={onPress}>
        Guardar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Guardar', disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading muestra el Spinner, marca busy e ignora los toques', () => {
    const onPress = jest.fn();
    render(
      <Button loading onPress={onPress} leftSection={PlusIcon}>
        Ingresar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Ingresar', busy: true, disabled: true });
    expect(screen.getByTestId('spinner')).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('el texto va en peso 600 y con el tamaño de la variante', () => {
    render(<Button size="lg">Ingresar</Button>);
    expect(screen.getByText('Ingresar')).toHaveProp('fontWeight', '600');
    expect(screen.getByText('Ingresar')).toHaveProp('fontSize', 16);
  });

  it('usa accessibilityLabel si se pasa', () => {
    render(<Button accessibilityLabel="Agregar a la lista">Agregar</Button>);
    expect(screen.getByRole('button', { name: 'Agregar a la lista' })).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('se anuncia con su label y llama a onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={PlusIcon} accessibilityLabel="Agregar" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no llama a onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={PlusIcon} accessibilityLabel="Agregar" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Agregar', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('buttonPalette', () => {
  it('filled usa los themes de marca de #75', () => {
    expect(buttonPalette('filled', 'default', false, s)).toMatchObject({ theme: 'active', icon: s.onPrimary });
    expect(buttonPalette('filled', 'destructive', false, s)).toMatchObject({ theme: 'red', icon: s.onDestructive });
  });

  it.each([
    ['outline', { background: 'transparent', borderColor: '$destructive', color: '$destructive' }],
    ['light', { background: '$errorSurface', borderColor: 'transparent', color: '$destructive' }],
    ['subtle', { background: 'transparent', backgroundPress: '$errorSurface', color: '$destructive' }],
  ] as const)('%s destructive', (variant, expected) => {
    expect(buttonPalette(variant, 'destructive', false, s)).toMatchObject({ ...expected, icon: s.destructive });
  });

  it('deshabilitado ignora la variante, como Mantine', () => {
    for (const variant of ['filled', 'outline', 'light', 'subtle'] as const) {
      expect(buttonPalette(variant, 'default', true, s)).toMatchObject({
        background: '$disabledSurface',
        color: '$disabledText',
        icon: s.disabledText,
      });
      expect(buttonPalette(variant, 'default', true, s).theme).toBeUndefined();
    }
  });
});
