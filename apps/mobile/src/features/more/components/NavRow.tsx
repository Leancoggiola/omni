import { isNavAvailable, NAV_REGISTRY } from '@omni/shared/navigation';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { NAV_HREFS, NAV_ICONS } from '@/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

const CHIP_SIZE = 36;

/**
 * Ítem de módulo del launcher. Igual que en el navbar de web, lo que mobile todavía no tiene se
 * muestra deshabilitado, acá con la pill "Próximamente".
 */
export function NavRow({ navKey }: { navKey: NavKey }) {
  const router = useRouter();
  const colors = useSemanticColors();
  const { label } = NAV_REGISTRY[navKey];
  const IconComponent = NAV_ICONS[navKey];
  const href = isNavAvailable(navKey, 'mobile') ? NAV_HREFS[navKey] : undefined;
  const available = href !== undefined;

  return (
    <XStack
      alignItems="center"
      gap={SPACING.sm}
      paddingVertical={SPACING.xs}
      onPress={href ? () => router.navigate(href) : undefined}
      pressStyle={available ? { opacity: 0.7 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={available ? label : `${label}, próximamente`}
      accessibilityState={{ disabled: !available }}
    >
      <YStack
        width={CHIP_SIZE}
        height={CHIP_SIZE}
        borderRadius={RADIUS.md}
        backgroundColor={available ? '$primarySurface' : '$dimmedSurface'}
        alignItems="center"
        justifyContent="center"
      >
        <IconComponent size={20} color={available ? colors.primary : colors.dimmed} />
      </YStack>
      <Paragraph flex={1} fontSize={FONT_SIZE.lg} color={available ? '$color' : '$dimmed'}>
        {label}
      </Paragraph>
      {available ? (
        <CaretRightIcon size={16} color={colors.dimmed} />
      ) : (
        <Paragraph
          fontSize={FONT_SIZE.sm}
          fontWeight="600"
          color="$dimmed"
          paddingHorizontal={SPACING.sm}
          paddingVertical={SPACING['3xs']}
          borderRadius={RADIUS.full}
          borderWidth={1}
          borderColor="$dimmedBorder"
          backgroundColor="$dimmedSurface"
        >
          Próximamente
        </Paragraph>
      )}
    </XStack>
  );
}
