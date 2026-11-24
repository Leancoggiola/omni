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
  it('es un botón con su texto y llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Guardar</Button>);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no llama a onPress y lo anuncia', async () => {
    const onPress = jest.fn();
    await render(
      <Button disabled onPress={onPress}>
        Guardar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Guardar', disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('el overlay del Spinner queda montado sin loading, transparente: pasar a loading solo cambia su opacidad', async () => {
    const { rerender } = await render(<Button>Ingresar</Button>);

    const overlay = () => screen.getByTestId('spinner', { includeHiddenElements: true }).parent;
    expect(overlay()).toHaveProp('opacity', 0);
    expect(overlay()).toHaveProp('pointerEvents', 'none');

    await rerender(<Button loading>Ingresar</Button>);

    expect(overlay()).toHaveProp('opacity', 1);
  });

  it('loading muestra el Spinner, marca busy e ignora los toques', async () => {
    const onPress = jest.fn();
    await render(
      <Button loading onPress={onPress} leftSection={PlusIcon}>
        Ingresar
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Ingresar', busy: true, disabled: true });
    expect(screen.getByTestId('spinner', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.opacity).toBeUndefined();
    expect(button.props.backgroundColor).not.toContain('press:');
  });

  it('el texto va en peso 600 y con el tamaño de la variante', async () => {
    await render(<Button size="lg">Ingresar</Button>);
    expect(screen.getByText('Ingresar')).toHaveProp('fontWeight', '600');
    expect(screen.getByText('Ingresar')).toHaveProp('fontSize', 16);
  });

  it('la etiqueta no es seleccionable: con `selectable` Android la dibuja más angosta de lo que midió y la corta (#328)', async () => {
    await render(<Button>Volver a escanear</Button>);
    expect(screen.getByText('Volver a escanear')).toHaveProp('userSelect', 'none');
  });

  it('el xl mide 56 dp con fuente de 16', async () => {
    await render(<Button size="xl">Ingresar</Button>);
    expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveProp('height', 56);
    expect(screen.getByText('Ingresar')).toHaveProp('fontSize', 16);
  });

  it('usa accessibilityLabel si se pasa', async () => {
    await render(<Button accessibilityLabel="Agregar a la lista">Agregar</Button>);
    expect(screen.getByRole('button', { name: 'Agregar a la lista' })).toBeTruthy();
  });

  it('el sm completa el área de toque hasta 44 dp; md y lg ya llegan', async () => {
    const slop = { top: 4, bottom: 4, left: 4, right: 4 };
    await render(
      <>
        <Button size="sm">Chico</Button>
        <Button size="md">Mediano</Button>
        <Button size="lg">Grande</Button>
      </>
    );
    expect(screen.getByRole('button', { name: 'Chico' })).toHaveProp('hitSlop', slop);
    expect(screen.getByRole('button', { name: 'Mediano' }).props.hitSlop).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Grande' }).props.hitSlop).toBeUndefined();
  });
});

describe('IconButton', () => {
  it('se anuncia con su label y llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={PlusIcon} accessibilityLabel="Agregar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={PlusIcon} accessibilityLabel="Agregar" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('buttonPalette', () => {
  it('filled usa los themes de marca de #75', () => {
    expect(buttonPalette('filled', 'brand', false, s)).toMatchObject({ theme: 'active', icon: s.onPrimaryFill });
    expect(buttonPalette('filled', 'destructive', false, s)).toMatchObject({ theme: 'red', icon: s.onDestructive });
  });

  it.each([
    ['outline', { background: 'transparent', borderColor: 'destructive', color: 'destructive' }],
    ['light', { background: 'errorSurface', borderColor: 'transparent', color: 'destructive' }],
    ['subtle', { background: 'transparent', backgroundPress: 'errorSurface', color: 'destructive' }],
  ] as const)('%s destructive', (variant, expected) => {
    expect(buttonPalette(variant, 'destructive', false, s)).toMatchObject({ ...expected, icon: s.destructive });
  });

  it('deshabilitado ignora la variante, como Mantine', () => {
    for (const variant of ['filled', 'outline', 'light', 'subtle'] as const) {
      expect(buttonPalette(variant, 'brand', true, s)).toMatchObject({
        background: 'disabledSurface',
        color: 'disabledText',
        icon: s.disabledText,
      });
      expect(buttonPalette(variant, 'brand', true, s).theme).toBeUndefined();
    }
  });
});
