import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { CheckIcon, ShareNetworkIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { Button, DisplayTitle, Paragraph } from '@/shared/ui';

import { BottomPanel } from './BottomPanel';

const CHECK_SIZE = 56;

type SettledPanelProps = {
  reopening: boolean;
  onReopen: () => void;
  onShare: () => void;
};

/** Pie de una juntada saldada, de solo lectura: "Todo saldado", con "Reabrir" y "Compartir" el resumen. */
export function SettledPanel({ reopening, onReopen, onShare }: SettledPanelProps) {
  const colors = useSemanticColors();

  return (
    <BottomPanel>
      <YStack alignItems="center" gap={SPACING.xs}>
        <YStack
          width={CHECK_SIZE}
          height={CHECK_SIZE}
          borderRadius={CHECK_SIZE / 2}
          backgroundColor="successSurface"
          alignItems="center"
          justifyContent="center"
        >
          <CheckIcon size={28} color={colors.success} />
        </YStack>
        <DisplayTitle size="md" textAlign="center">
          Todo saldado
        </DisplayTitle>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md} textAlign="center">
          No queda nada pendiente.
        </Paragraph>
      </YStack>
      <XStack gap={SPACING.xs}>
        <YStack flex={1}>
          <Button fullWidth variant="outline" loading={reopening} onPress={onReopen}>
            Reabrir
          </Button>
        </YStack>
        <YStack flex={1}>
          <Button fullWidth leftSection={ShareNetworkIcon} onPress={onShare}>
            Compartir
          </Button>
        </YStack>
      </XStack>
    </BottomPanel>
  );
}
