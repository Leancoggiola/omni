import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

const DOT_SIZE = 8;

/** Avisa que la lista compartida se refresca sola, sin depender de que la otra persona avise. */
export function PantryLiveIndicator() {
  return (
    <XStack alignItems="center" gap={SPACING['2xs']} accessibilityRole="text" accessibilityLiveRegion="polite">
      <YStack width={DOT_SIZE} height={DOT_SIZE} borderRadius={RADIUS.full} backgroundColor="$success" />
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs}>
        Se actualiza solo
      </Paragraph>
    </XStack>
  );
}
