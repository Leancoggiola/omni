import { FONT_SIZE, LINE_HEIGHT, SPACING } from '@omni/shared/theme';
import { type PropsWithChildren } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Button } from '../button/Button';
import { DisplayTitle } from '../DisplayTitle';
import { QueuedSheet } from '../sheet/QueuedSheet';
import { useSheetQueue } from '../sheet/useSheetQueue';

import { registerConfirmHandler, type ConfirmRequest } from './confirm';

/**
 * Confirmaciones en una hoja inferior de v2 (título en `display`). Botones apilados a lo ancho: confirmar arriba (filled) y
 * cancelar abajo (outline), ver "Botones de acción" en `apps/mobile/CLAUDE.md`.
 */
export function ConfirmProvider({ children }: PropsWithChildren) {
  const queue = useSheetQueue<boolean, ConfirmRequest>(registerConfirmHandler, false);
  const request = queue.shown;

  return (
    <>
      {children}
      <QueuedSheet queue={queue}>
        <YStack gap={SPACING.xs}>
          <DisplayTitle size="md">{request?.title ?? ''}</DisplayTitle>
          <Paragraph fontSize={FONT_SIZE.lg} lineHeight={LINE_HEIGHT.xl + 2} color="$dimmed">
            {request?.description}
          </Paragraph>
        </YStack>
        <YStack gap={SPACING.sm}>
          <Button
            fullWidth
            size="lg"
            color={request?.destructive ? 'destructive' : 'brand'}
            onPress={() => queue.close(true)}
          >
            {request?.confirmLabel ?? ''}
          </Button>
          <Button fullWidth size="lg" variant="outline" onPress={() => queue.close(false)}>
            {request?.cancelLabel ?? ''}
          </Button>
        </YStack>
      </QueuedSheet>
    </>
  );
}
