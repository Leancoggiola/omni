import { SPACING } from '@omni/shared/theme';
import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';

/** Espacio que queda libre entre el campo enfocado y el teclado: deja ver el botón que sigue al campo. */
const CLEARANCE = SPACING['3xl'] * 2;

/**
 * Mantiene visible el campo enfocado de un `ScrollView` con teclado. En Android edge-to-edge la ventana
 * no se redimensiona, así que ni el teclado al abrirse ni "Siguiente" entre campos hacen scrollear el
 * formulario: el campo queda tapado. `KeyboardAvoidingView` solo achica el área; este hook hace el scroll.
 *
 * Uso: `<ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}>` y, en los campos que
 * reciben el foco con el teclado ya abierto, `onFocus={scrollIntoView}`.
 */
export function useScrollFocusedInputIntoView() {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const scrollIntoView = useCallback(() => {
    // Un frame después: al cambiar de campo, `currentlyFocusedInput` ya apunta al nuevo.
    requestAnimationFrame(() => {
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
    };
  }, [scrollIntoView]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { scrollRef, onScroll, scrollIntoView };
}
