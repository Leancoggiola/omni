import { RADIUS } from '@omni/shared/theme';
import { ListIcon, SquaresFourIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { IconButton } from '@/shared/ui';

export type MediaView = 'list' | 'grid';

type MediaViewToggleProps = {
  value: MediaView;
  onChange: (view: MediaView) => void;
};

/**
 * Grupo segmentado Lista/Grilla: dos botones de ícono de 44 dp, el activo en `light`. La vista no se recuerda: la
 * pantalla siempre arranca en lista.
 */
export function MediaViewToggle({ value, onChange }: MediaViewToggleProps) {
  return (
    <XStack
      flexShrink={0}
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.full}
      accessibilityRole="radiogroup"
      accessibilityLabel="Vista"
    >
      <IconButton
        icon={ListIcon}
        accessibilityLabel="Lista"
        variant={value === 'list' ? 'light' : 'subtle'}
        selected={value === 'list'}
        onPress={() => onChange('list')}
      />
      <IconButton
        icon={SquaresFourIcon}
        accessibilityLabel="Grilla"
        variant={value === 'grid' ? 'light' : 'subtle'}
        selected={value === 'grid'}
        onPress={() => onChange('grid')}
      />
    </XStack>
  );
}
