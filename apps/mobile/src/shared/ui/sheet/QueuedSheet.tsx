import { Sheet } from 'tamagui';

import { SheetFrame } from './SheetFrame';

import type { SheetQueue, SheetRequest } from './useSheetQueue';
import type { ReactNode } from 'react';

type QueuedSheetProps<T, R extends SheetRequest<T>> = {
  queue: SheetQueue<T, R>;
  children: ReactNode;
};

/** Hoja inferior de v2 de los providers imperativos (`ConfirmProvider`, `ActionSheetProvider`), atado a su cola. */
export function QueuedSheet<T, R extends SheetRequest<T>>({ queue, children }: QueuedSheetProps<T, R>) {
  return (
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
  );
}
