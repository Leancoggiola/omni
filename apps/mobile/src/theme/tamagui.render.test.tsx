import { SEMANTIC } from '@omni/shared/theme';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { Input, Paragraph, Sheet, Switch, TamaguiProvider, XStack, YStack } from 'tamagui';

import { SheetOverlay } from '@/shared/ui/sheet/SheetOverlay';

import { tamaguiConfig } from './tamagui.config';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

const s = SEMANTIC.light;

function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

const touch = { pageX: 0, pageY: 0 };
const pressEvent = {
  persist: () => undefined,
  currentTarget: { measure: (callback: (...rect: number[]) => void) => callback(0, 0, 100, 100, 0, 0) },
  nativeEvent: { touches: [touch], changedTouches: [touch], timestamp: 0 },
};

/** Tamagui 3 en nativo no escucha `onPressIn`: el toque entra por el sistema de responder de RN. */
function pressIn(testID: string) {
  act(() => {
    fireEvent(screen.getByTestId(testID), 'responderGrant', pressEvent);
  });
}

function pressOut(testID: string) {
  act(() => {
    fireEvent(screen.getByTestId(testID), 'responderRelease', pressEvent);
  });
}

function renderLight(children: React.ReactNode) {
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

describe('Tamagui 3 con el config de la app (render real, sin mock)', () => {
  it('resuelve los valores planos: tokens propios, lineHeight en px y la familia display', () => {
    renderLight(
      <Paragraph testID="p" color="dimmed" lineHeight="20px" fontSize={14} fontFamily="display">
        hola
      </Paragraph>
    );

    expect(styleOf('p')).toMatchObject({
      color: s.dimmed,
      lineHeight: 20,
      fontSize: 14,
      fontFamily: 'BricolageGrotesqueBold',
    });
  });

  it('un Paragraph sin tamaño sale en Montserrat de 14 con interlineado 23, como el $true de Tamagui 2', () => {
    renderLight(
      <>
        <Paragraph testID="plain">hola</Paragraph>
        <Paragraph testID="sized" fontSize={13}>
          hola
        </Paragraph>
      </>
    );

    expect(styleOf('plain')).toMatchObject({ fontFamily: 'Montserrat', fontSize: 14, lineHeight: 23 });
    expect(styleOf('sized')).toMatchObject({ fontSize: 13, lineHeight: 23 });
  });

  it('`theme="active"` trae el relleno de marca', () => {
    renderLight(<XStack testID="x" theme="active" backgroundColor="background" />);

    expect(styleOf('x').backgroundColor).toBe(s.primaryFill);
  });

  it('el Switch apagado usa la pista border-subtle, encendido el relleno de marca, y el thumb es siempre blanco', () => {
    renderLight(
      <>
        <Switch testID="off" size="xl" activeTheme="active" checked={false} onCheckedChange={() => undefined}>
          <Switch.Thumb testID="thumbOff" activeStyle={{ backgroundColor: s.white }} />
        </Switch>
        <Switch testID="on" size="xl" activeTheme="active" checked onCheckedChange={() => undefined}>
          <Switch.Thumb testID="thumbOn" activeStyle={{ backgroundColor: s.white }} />
        </Switch>
      </>
    );

    expect(styleOf('off').backgroundColor).toBe(s.borderSubtle);
    expect(styleOf('on').backgroundColor).toBe(s.primaryFill);
    expect(styleOf('thumbOff').backgroundColor).toBe('rgba(255,255,255,1)');
    expect(styleOf('thumbOn').backgroundColor).toBe(s.white);
  });

  it('el Input toma los colores del theme Input y los tokens de placeholder, cursor y selección', () => {
    renderLight(
      <Input testID="i" placeholderTextColor="placeholder-color" cursorColor="primary" selectionColor="primary" />
    );

    const props = screen.getByTestId('i').props;
    expect(props.placeholderTextColor).toBe(s.placeholder);
    expect(props.cursorColor).toBe(s.primary);
    expect(props.selectionColor).toBe(s.primary);
    expect(styleOf('i')).toMatchObject({ backgroundColor: s.card, borderTopColor: s.border });
  });

  it('el Sheet con Container y Background monta su contenido y el scrim de `SheetOverlay` con el driver de animaciones de la app', () => {
    renderLight(
      <Sheet open onOpenChange={() => undefined} snapPointsMode="fit" disableDrag transition="medium">
        <SheetOverlay testID="scrim" />
        <Sheet.Container padding={8}>
          <Sheet.Background testID="bg" backgroundColor="backgroundStrong" />
          <Text>contenido</Text>
        </Sheet.Container>
      </Sheet>
    );

    expect(screen.getByText('contenido')).toBeTruthy();
    expect(styleOf('bg').backgroundColor).toBe(s.card);
    expect(styleOf('scrim').backgroundColor).toBe('rgba(0, 0, 0, 0.69)');
  });

  it('la cláusula `press:` de un color cambia el fondo al presionar y vuelve al soltar', () => {
    renderLight(<YStack testID="y" onPress={() => undefined} backgroundColor="background press:background-press" />);

    expect(styleOf('y').backgroundColor).toBe(s.body);
    pressIn('y');
    expect(styleOf('y').backgroundColor).toBe(s.border);
    pressOut('y');
    expect(styleOf('y').backgroundColor).toBe(s.body);
  });

  it('la cláusula `press:` de la opacidad baja a 0.7 al presionar', () => {
    renderLight(<YStack testID="y" onPress={() => undefined} opacity="press:0.7" />);

    expect(styleOf('y').opacity).toBeUndefined();
    pressIn('y');
    expect(styleOf('y').opacity).toBe(0.7);
    pressOut('y');
    expect(styleOf('y').opacity).toBeUndefined();
  });

  it('la cláusula `focus:` del borde de un Input pasa de border-color a primary al enfocar', () => {
    renderLight(<Input testID="i" borderWidth={1} borderColor="border-color focus:primary" />);

    expect(styleOf('i').borderTopColor).toBe(s.border);
    act(() => {
      fireEvent(screen.getByTestId('i'), 'focus');
    });
    expect(styleOf('i').borderTopColor).toBe(s.primary);
    act(() => {
      fireEvent(screen.getByTestId('i'), 'blur');
    });
    expect(styleOf('i').borderTopColor).toBe(s.border);
  });
  it('paddingStart/paddingEnd del Input les ganan al paddingInline del size (hueco del ícono de TextField)', () => {
    renderLight(<Input testID="i" paddingStart={40} paddingEnd={12} />);

    expect(styleOf('i')).toMatchObject({ paddingStart: 40, paddingEnd: 12 });
  });
});
