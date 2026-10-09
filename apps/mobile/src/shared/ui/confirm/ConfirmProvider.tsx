import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { type PropsWithChildren } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { Button } from '../button/Button';
import { QueuedSheet } from '../sheet/QueuedSheet';
import { useSheetQueue } from '../sheet/useSheetQueue';
import { Title } from '../Title';

import { registerConfirmHandler, type ConfirmRequest } from './confirm';

/**
 * Confirmaciones en un bottom sheet. Botones apilados a lo ancho: confirmar arriba (filled) y
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
          <Title order={3}>{request?.title}</Title>
          <Paragraph fontSize={FONT_SIZE.lg} color="$dimmed">
            {request?.description}
          </Paragraph>
        </YStack>
        <YStack gap={SPACING.sm}>
          <Button fullWidth color={request?.destructive ? 'destructive' : 'brand'} onPress={() => queue.close(true)}>
            {request?.confirmLabel ?? ''}
          </Button>
          <Button fullWidth variant="outline" onPress={() => queue.close(false)}>
            {request?.cancelLabel ?? ''}
          </Button>
        </YStack>
      </QueuedSheet>
    </>
  );
}
