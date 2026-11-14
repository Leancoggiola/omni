import { SPACING } from '@omni/shared/theme';
import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

const CLEARANCE = SPACING['3xl'] * 2;

type ScrollTarget = { scrollTo: (options: { y: number; animated: boolean }) => void };

/**
 * Mantiene visible el campo enfocado de un `ScrollView` con teclado. En Android edge-to-edge la ventana
 * no se redimensiona, así que ni el teclado al abrirse ni "Siguiente" entre campos hacen scrollear el
 * formulario: el campo queda tapado. `KeyboardAvoidingView` solo achica el área; este hook hace el scroll.
 * Deja libre un espacio (`CLEARANCE`) entre el campo enfocado y el teclado, para ver el botón que sigue al campo.
 * `T` es el tipo del ref del scroll (el `ScrollViewInstance` de RN por defecto): lo único que se le pide es
 * `scrollTo`, que cumplen tanto el `ScrollView` de RN como el de Tamagui (`Sheet.ScrollView`).
 *
 * Uso: `<ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}>` y, en los campos que
 * reciben el foco con el teclado ya abierto, `onFocus={scrollIntoView}`.
 */
export function useScrollFocusedInputIntoView<T extends ScrollTarget = ScrollViewInstance>() {
  const scrollRef = useRef<T>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const frame = useRef<number | null>(null);

  const scrollIntoView = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const top = keyboardTop.current;
      const input = TextInput.State.currentlyFocusedInput();
      if (top === null || !input) return;
      input.measureInWindow((_x, y, _width, height) => {
        const overflow = y + height + CLEARANCE - top;
        if (overflow > 0) scrollRef.current?.scrollTo({ y: offsetY.current + overflow, animated: true });
      });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      scrollIntoView();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [scrollIntoView]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { scrollRef, onScroll, scrollIntoView };
}
