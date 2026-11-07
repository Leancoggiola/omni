import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { SparkleIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { Button } from '@/shared/ui';

type GenerateBannerProps = {
  lowStockCount: number;
  onGenerate: () => void;
};

/** Aviso con el atajo "Generar desde bajo stock"; se muestra solo si hay productos en su mínimo. */
export function GenerateBanner({ lowStockCount, onGenerate }: GenerateBannerProps) {
  const colors = useSemanticColors();

  return (
    <YStack
      gap={SPACING.sm}
      padding={SPACING.md}
      borderRadius={RADIUS.xl}
      borderWidth={1}
      borderColor="$primaryBorder"
      backgroundColor="$primarySurface"
    >
      <XStack gap={SPACING.sm} alignItems="center">
        <SparkleIcon size={20} color={colors.primary} />
        <Paragraph flex={1} fontSize={FONT_SIZE.md}>
          <Paragraph fontWeight="700" fontSize={FONT_SIZE.md}>
            {`${lowStockCount} ${lowStockCount === 1 ? 'producto con bajo stock' : 'productos con bajo stock'}. `}
          </Paragraph>
          Generá la lista y se suman los que faltan.
        </Paragraph>
      </XStack>
      <Button variant="light" onPress={onGenerate}>
        Generar desde bajo stock
      </Button>
    </YStack>
  );
}
