import { useCallback, useEffect, useReducer, useRef } from 'react';
import { BackHandler } from 'react-native';

import type { SheetTransitionEvent } from 'tamagui';

export const SHEET_EXIT_MS = 600;

export type SheetRequest<T> = { resolve: (value: T) => void };

export type SheetQueue<T, R extends SheetRequest<T>> = {
  open: boolean;
  shown: R | null;
  close: (result: T) => void;
  onOpenChange: (open: boolean) => void;
  onTransition: (event: SheetTransitionEvent) => void;
};

type QueueState<R> = { pending: R[]; current: R | null; closing: boolean; shown: R | null };

type QueueAction<R> = { type: 'enqueue'; request: R } | { type: 'close' } | { type: 'settled' };

/**
 * Máquina de la cola: una request entra directo si no hay otra abierta ni cerrándose, y si no espera. Al cerrar
 * pasa por `closing` hasta que termina la animación de salida (`settled`), y recién ahí se promueve la próxima.
 * `shown` no vuelve a null: la hoja conserva el contenido mientras se va.
 */
function queueReducer<R>(state: QueueState<R>, action: QueueAction<R>): QueueState<R> {
  switch (action.type) {
    case 'enqueue':
      if (state.current || state.closing) return { ...state, pending: [...state.pending, action.request] };
      return { ...state, current: action.request, shown: action.request };
    case 'close':
      return state.current ? { ...state, current: null, closing: true } : state;
    case 'settled': {
      if (!state.closing) return state;
      const [next = null, ...rest] = state.pending;
      return { pending: rest, current: next, closing: false, shown: next ?? state.shown };
    }
  }
}

/**
 * Cola de un sheet imperativo (`confirm()`, `actionSheet()`): cada `SheetRequest` resuelve su promesa con `resolve`.
 * Muestra las requests de a una, cancela con `cancelValue` al cerrar
 * por overlay, gesto o Atrás, y resuelve las pendientes si el provider se desmonta. Registra el
 * handler una sola vez: `register` y `cancelValue` se leen de refs, así que pasarlos inline no
 * resuelve ni re-registra nada en cada render. La promoción de la próxima request sale del reducer, no de un
 * efecto, y `currentRef` se baja al cerrar para que un segundo cierre en el mismo tick no resuelva dos veces.
 *
 * Devuelve `open` (el `open` del Sheet), `shown` (el contenido a mostrar: no vuelve a null al cerrar, así el sheet no
 * se vacía durante la animación de salida), `close` (resuelve la request actual una sola vez y cierra), `onOpenChange`
 * y `onTransition` (el `onTransition` del Sheet: el fin de la salida habilita la próxima request). Tamagui no siempre
 * llama a `onTransition` al cerrar: los sheets que esperan el cierre usan `SHEET_EXIT_MS`, la duración de la salida
 * de un Sheet con `transition="medium"`.
 */
export function useSheetQueue<T, R extends SheetRequest<T>>(
  register: (handler: (request: R) => void) => () => void,
  cancelValue: T
): SheetQueue<T, R> {
  const [state, dispatch] = useReducer(queueReducer<R>, { pending: [], current: null, closing: false, shown: null });
  const { current, pending } = state;
  const currentRef = useRef<R | null>(null);
  const pendingRef = useRef<R[]>([]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

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
    const unregister = registerRef.current(request => dispatch({ type: 'enqueue', request }));
    return () => {
      unregister();
      const cancel = cancelRef.current;
      currentRef.current?.resolve(cancel);
      pendingRef.current.forEach(request => request.resolve(cancel));
    };
  }, []);

  const close = useCallback((result: T) => {
    const request = currentRef.current;
    if (!request) return;
    currentRef.current = null;
    request.resolve(result);
    dispatch({ type: 'close' });
  }, []);

  useEffect(() => {
    if (!state.closing) return;
    const timer = setTimeout(() => dispatch({ type: 'settled' }), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [state.closing]);

  const hasCurrent = state.current !== null;
  useEffect(() => {
    if (!hasCurrent) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(cancelRef.current);
      return true;
    });
    return () => sub.remove();
  }, [hasCurrent, close]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) close(cancelRef.current);
    },
    [close]
  );

  const onTransition = useCallback(({ phase, cause, finished }: SheetTransitionEvent) => {
    if (phase === 'end' && cause === 'close' && finished !== false) dispatch({ type: 'settled' });
  }, []);

  return { open: hasCurrent, shown: state.shown, close, onOpenChange, onTransition };
}
