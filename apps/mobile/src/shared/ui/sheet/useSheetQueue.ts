import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Duración de la salida de un Sheet (`transition="medium"`). Tamagui no siempre llama a
 * `onAnimationComplete` al cerrar: los sheets que esperan el cierre usan este tiempo fijo.
 */
export const SHEET_EXIT_MS = 600;

/** Request de un sheet imperativo (`confirm()`, `actionSheet()`): la promesa se resuelve con `resolve`. */
export type SheetRequest<T> = { resolve: (value: T) => void };

export type SheetQueue<T, R extends SheetRequest<T>> = {
  /** `open` del Sheet. */
  open: boolean;
  /** Contenido a mostrar: no vuelve a null al cerrar, así el sheet no se vacía durante la animación de salida. */
  shown: R | null;
  /** Resuelve la request actual (una sola vez) y cierra. */
  close: (result: T) => void;
  onOpenChange: (open: boolean) => void;
  onAnimationComplete: (event: { open: boolean }) => void;
};

/**
 * Cola de un sheet imperativo: muestra las requests de a una, cancela con `cancelValue` al cerrar
 * por overlay, gesto o Atrás, y resuelve las pendientes si el provider se desmonta. Registra el
 * handler una sola vez: `register` y `cancelValue` se leen de refs, así que pasarlos inline no
 * resuelve ni re-registra nada en cada render.
 */
export function useSheetQueue<T, R extends SheetRequest<T>>(
  register: (handler: (request: R) => void) => () => void,
  cancelValue: T
): SheetQueue<T, R> {
  const [pending, setPending] = useState<R[]>([]);
  const [current, setCurrent] = useState<R | null>(null);
  // El Sheet de Tamagui solo se resincroniza con `open` cuando la prop cambia: si la siguiente
  // request entrara sin pasar por `open=false`, un cierre por overlay/gesto dejaría la cola trabada.
  // Por eso `current` vuelve a null entre requests y la siguiente entra al terminar el cierre.
  const [closing, setClosing] = useState(false);
  const [shown, setShown] = useState<R | null>(null);
  // Ref además del estado: el botón y el `onOpenChange(false)` del cierre pueden llegar en el mismo
  // tick, y la request tiene que resolverse una sola vez. Solo se escribe en efectos y handlers.
  const currentRef = useRef<R | null>(null);

  const pendingRef = useRef<R[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const registerRef = useRef(register);
  const cancelRef = useRef(cancelValue);
  useEffect(() => {
    registerRef.current = register;
    cancelRef.current = cancelValue;
  });

  useEffect(() => {
    const unregister = registerRef.current(request => setPending(queue => [...queue, request]));
    return () => {
      unregister();
      // Si el provider se desmonta con requests abiertas, el `await` no queda colgado. Se lee el
      // `cancelValue` vigente al desmontar, a propósito.
      const cancel = cancelRef.current;
      currentRef.current?.resolve(cancel);
      pendingRef.current.forEach(request => request.resolve(cancel));
    };
  }, []);

  useEffect(() => {
    if (current || closing || pending.length === 0) return;
    const [next] = pending;
    currentRef.current = next;
    setCurrent(next);
    setShown(next);
    setPending(queue => queue.slice(1));
  }, [current, closing, pending]);

  const close = useCallback((result: T) => {
    const request = currentRef.current;
    if (!request) return;
    currentRef.current = null;
    request.resolve(result);
    setCurrent(null);
    setClosing(true);
  }, []);

  // Respaldo por si `onAnimationComplete` no llega (p. ej. sin driver de animación): la cola no se traba.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // `@tamagui/sheet` no escucha el botón Atrás de Android: sin esto navegaría la pantalla de abajo.
  useEffect(() => {
    if (!current) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(cancelRef.current);
      return true;
    });
    return () => sub.remove();
  }, [current, close]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) close(cancelRef.current);
    },
    [close]
  );

  const onAnimationComplete = useCallback(({ open }: { open: boolean }) => {
    if (!open) setClosing(false);
  }, []);

  return { open: current !== null, shown, close, onOpenChange, onAnimationComplete };
}
