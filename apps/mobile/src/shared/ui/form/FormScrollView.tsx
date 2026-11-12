import { ScrollView, type ScrollViewProps } from 'react-native';

import { FormScrollProvider } from './FormContext';
import { useScrollFocusedInputIntoView } from './useScrollFocusedInputIntoView';

/**
 * `ScrollView` de una pantalla con formularios (Perfil): el `TextField` enfocado scrollea hasta quedar arriba del
 * teclado, al abrirse el teclado y al pasar de campo con "Siguiente". Los toques no cierran el teclado si los
 * atiende un hijo. Para "Siguiente" entre campos, cada formulario de adentro va en su `FormFields`.
 */
export function FormScrollView({ children, onScroll, ...props }: ScrollViewProps) {
  const { scrollRef, onScroll: trackScroll, scrollIntoView } = useScrollFocusedInputIntoView();

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      onScroll={event => {
        trackScroll(event);
        onScroll?.(event);
      }}
    >
      <FormScrollProvider scrollIntoView={scrollIntoView}>{children}</FormScrollProvider>
    </ScrollView>
  );
}
