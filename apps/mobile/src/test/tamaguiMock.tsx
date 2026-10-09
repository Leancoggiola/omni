/**
 * Doble mínimo de `tamagui` para tests de comportamiento de `@/shared/ui`. Se carga con
 * `jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'))`.
 *
 * Los Stacks pasan sus props a host components de RN (accesibilidad incluida): con `onPress` son un
 * `Pressable`. Lo que se prueba es el contrato de la primitiva (role, label, estado, callbacks), no
 * el render de Tamagui. El `Sheet` guarda sus props en `mockSheet` para disparar cierres.
 */
import { Pressable, Text, TextInput, View } from 'react-native';

import type { ReactNode } from 'react';

type AnyProps = { children?: ReactNode; onPress?: () => void; [key: string]: unknown };

function Stack({ children, onPress, ...props }: AnyProps) {
  // Deshabilitado es un Pressable `disabled`: corta el `fireEvent.press` de RNTL, que si no sigue
  // subiendo y dispara el `onPress` del componente (`<Button onPress>`) aunque el Stack no lo tenga.
  const disabled = (props.accessibilityState as { disabled?: boolean } | undefined)?.disabled;
  if (onPress || disabled) {
    return (
      <Pressable onPress={onPress} disabled={!onPress} {...props}>
        {children}
      </Pressable>
    );
  }
  return <View {...props}>{children}</View>;
}

export const XStack = Stack;
export const YStack = Stack;
export const Paragraph = ({ children, ...props }: AnyProps) => <Text {...props}>{children}</Text>;
export const Theme = ({ children }: AnyProps) => <>{children}</>;
export const Spinner = (props: AnyProps) => <View testID="spinner" {...props} />;

export const Input = ({ disabled, ...props }: AnyProps & { disabled?: boolean }) => (
  <TextInput editable={!disabled} {...props} />
);

type SwitchProps = AnyProps & { checked: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean };

export function Switch({ checked, onCheckedChange, disabled, children, ...props }: SwitchProps) {
  return (
    <Pressable {...props} onPress={disabled ? undefined : () => onCheckedChange?.(!checked)}>
      {children}
    </Pressable>
  );
}
Switch.Thumb = function Thumb() {
  return null;
};

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnimationComplete: (event: { open: boolean }) => void;
  children: ReactNode;
};

export const mockSheet: { props: SheetProps | null } = { props: null };

export function Sheet(props: SheetProps) {
  mockSheet.props = props;
  return <View>{props.children}</View>;
}
Sheet.Overlay = function Overlay() {
  return null;
};
Sheet.Handle = function Handle() {
  return null;
};
Sheet.Frame = Stack;
Sheet.ScrollView = Stack;
