import { PANTRY_EXPIRING_SOON_DAYS } from '@omni/shared/pantry';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import type { PantryAlertFilter, PantrySummary } from '@omni/shared/pantry';

const STAT_FONT_SIZE = 28;

type PantrySummaryCardsProps = {
  summary: PantrySummary;
  alert: PantryAlertFilter;
  onAlertChange: (alert: PantryAlertFilter) => void;
};

type StatCardProps = {
  value: number;
  label: string;
  pressed?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
};

function StatCard({ value, label, pressed = false, onPress, accessibilityLabel }: StatCardProps) {
  return (
    <YStack
      flex={1}
      gap={SPACING['3xs']}
      padding={SPACING.sm}
      borderRadius={RADIUS.lg}
      borderWidth={pressed ? 2 : 1}
      borderColor={pressed ? '$primary' : '$glassBorder'}
      backgroundColor="$surfaceGlass"
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.7 } : undefined}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={onPress ? { selected: pressed } : undefined}
    >
      <Paragraph fontSize={STAT_FONT_SIZE} lineHeight={STAT_FONT_SIZE} fontWeight="800">
        {value}
      </Paragraph>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} numberOfLines={2}>
        {label}
      </Paragraph>
    </YStack>
  );
}

/**
 * Los contadores del inventario: total, bajo stock y por vencer. Bajo stock y por vencer filtran la lista al tocarlos
 * (y al volver a tocar se quitan); la cantidad en la lista de compras vive en el contador de la pestaña.
 */
export function PantrySummaryCards({ summary, alert, onAlertChange }: PantrySummaryCardsProps) {
  return (
    <XStack gap={SPACING.sm}>
      <StatCard
        value={summary.totalProducts}
        label="Productos"
        accessibilityLabel={`${summary.totalProducts} productos`}
      />
      <StatCard
        value={summary.lowStockCount}
        label="Bajo stock"
        pressed={alert === 'low'}
        onPress={() => onAlertChange(alert === 'low' ? 'all' : 'low')}
        accessibilityLabel={`${summary.lowStockCount} con bajo stock`}
      />
      <StatCard
        value={summary.expiringSoonCount}
        label={`Vence en ${PANTRY_EXPIRING_SOON_DAYS} días`}
        pressed={alert === 'expiring'}
        onPress={() => onAlertChange(alert === 'expiring' ? 'all' : 'expiring')}
        accessibilityLabel={`${summary.expiringSoonCount} por vencer en ${PANTRY_EXPIRING_SOON_DAYS} días`}
      />
    </XStack>
  );
}
