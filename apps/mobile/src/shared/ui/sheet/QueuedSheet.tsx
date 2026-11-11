import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { Sheet } from 'tamagui';

import { SheetFrame } from './SheetFrame';
import { SHEET_EXIT_MS } from './useSheetQueue';

import type { SheetQueue, SheetRequest } from './useSheetQueue';
import type { ReactNode } from 'react';

type QueuedSheetProps<T, R extends SheetRequest<T>> = {
  queue: SheetQueue<T, R>;
  children: ReactNode;
};

/**
 * Hoja inferior de v2 de los providers imperativos (`ConfirmProvider`, `ActionSheetProvider`), atado a su cola.
 * Va dentro de su propio `Modal` de RN: un Modal abierto después queda encima del anterior, así que `confirm()` y
 * `actionSheet()` se ven también por encima de un `FormSheet`. El Modal se oculta `SHEET_EXIT_MS` después de
 * cerrar para dejar correr la animación de salida; Atrás cancela la request.
 */
export function QueuedSheet<T, R extends SheetRequest<T>>({ queue, children }: QueuedSheetProps<T, R>) {
  const [visible, setVisible] = useState(queue.open);
  if (queue.open && !visible) setVisible(true);

  const openRef = useRef(queue.open);
  useEffect(() => {
    openRef.current = queue.open;
  });

  useEffect(() => {
    if (queue.open || !visible) return;
    const timer = setTimeout(() => {
      if (!openRef.current) setVisible(false);
    }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [queue.open, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => queue.onOpenChange(false)}
    >
      <Sheet
        open={queue.open}
        onOpenChange={queue.onOpenChange}
        onAnimationComplete={queue.onAnimationComplete}
        snapPointsMode="fit"
        dismissOnSnapToBottom
        zIndex={100_000}
        transition="medium"
      >
        <Sheet.Overlay transition="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <SheetFrame>{children}</SheetFrame>
      </Sheet>
    </Modal>
  );
}
