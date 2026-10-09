import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import { elevation } from '@/theme/elevation';

export type SegmentedControlItem<T extends string> = T | { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  data: readonly SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Nombre del grupo para el lector de pantalla (p. ej. "Estado"). */
  accessibilityLabel?: string;
};

const TRACK_PADDING = SPACING['2xs'];
const SEGMENT_HEIGHT = 36;

function normalize<T extends string>(item: SegmentedControlItem<T>) {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

/**
 * Equivalente de `SegmentedControl` de Mantine como lo usa web (`size="sm"`, `color="brand.6"`,
 * `fullWidth`): pista neutra y el segmento activo en marca. Mismo `data` que Mantine: strings u
 * objetos `{ value, label }`.
 */
export function SegmentedControl<T extends string>({
  data,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <XStack
      backgroundColor="$dimmedSurface"
      borderRadius={RADIUS.lg}
      padding={TRACK_PADDING}
      gap={TRACK_PADDING}
      opacity={disabled ? 0.6 : 1}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {data.map(normalize).map(item => {
        const active = item.value === value;
        return (
          <XStack
            key={item.value}
            flex={1}
            height={SEGMENT_HEIGHT}
            paddingHorizontal={SPACING['2xs']}
            borderRadius={RADIUS.md}
            alignItems="center"
            justifyContent="center"
            backgroundColor={active ? '$primary' : 'transparent'}
            {...(active ? elevation('sm') : null)}
            onPress={disabled || active ? undefined : () => onChange(item.value)}
            pressStyle={{ opacity: 0.7 }}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={item.label}
            accessibilityState={{ checked: active, disabled }}
          >
            <Paragraph
              fontSize={FONT_SIZE.sm}
              fontWeight="600"
              color={active ? '$onPrimary' : '$dimmed'}
              numberOfLines={1}
            >
              {item.label}
            </Paragraph>
          </XStack>
        );
      })}
    </XStack>
  );
}
