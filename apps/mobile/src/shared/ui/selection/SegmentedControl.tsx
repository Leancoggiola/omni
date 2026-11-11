import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

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
const SEGMENT_HEIGHT = 40;

function normalize<T extends string>(item: SegmentedControlItem<T>) {
  return typeof item === 'string' ? { value: item, label: item } : item;
}

/**
 * Equivalente de `SegmentedControl` de Mantine como lo usa web en v2: pista glass en pill (`surface-glass` y
 * `glass-border`) y el segmento activo en `primarySurface` con el texto en `primary`. Mismo `data` que Mantine:
 * strings u objetos `{ value, label }`.
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
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.full}
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
            borderRadius={RADIUS.full}
            alignItems="center"
            justifyContent="center"
            backgroundColor={active ? '$primarySurface' : 'transparent'}
            onPress={disabled || active ? undefined : () => onChange(item.value)}
            pressStyle={{ opacity: 0.7 }}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={item.label}
            accessibilityState={{ checked: active, disabled }}
          >
            <Paragraph
              fontSize={FONT_SIZE.md}
              fontWeight={active ? '700' : '600'}
              color={active ? '$primary' : '$dimmed'}
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
