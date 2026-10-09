import { RADIUS, SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from 'tamagui';

import type { SheetQueue, SheetRequest } from './useSheetQueue';
import type { ReactNode } from 'react';

type QueuedSheetProps<T, R extends SheetRequest<T>> = {
  queue: SheetQueue<T, R>;
  children: ReactNode;
};

/** Bottom sheet de los providers imperativos (`ConfirmProvider`, `ActionSheetProvider`), atado a su cola. */
export function QueuedSheet<T, R extends SheetRequest<T>>({ queue, children }: QueuedSheetProps<T, R>) {
  const insets = useSafeAreaInsets();

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
      <Sheet.Handle />
      <Sheet.Frame
        backgroundColor="$backgroundStrong"
        borderTopLeftRadius={RADIUS.xl}
        borderTopRightRadius={RADIUS.xl}
        padding={SPACING.lg}
        paddingBottom={SPACING.lg + insets.bottom}
        gap={SPACING.lg}
      >
        {children}
      </Sheet.Frame>
    </Sheet>
  );
}
