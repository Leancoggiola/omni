import { useEffect, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

/**
 * Alto que el teclado le quita a la pantalla (0 con el teclado cerrado), para dejarlo como padding inferior.
 * En Android edge-to-edge `KeyboardAvoidingView` conserva parte de su padding al cerrar el teclado y deja un hueco
 * debajo de lo que está anclado al borde inferior (la hoja del login). Pensado para Android, la única plataforma de la app.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      setInset(Math.max(0, Dimensions.get('window').height - event.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
