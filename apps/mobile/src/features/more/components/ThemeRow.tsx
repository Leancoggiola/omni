import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { MoonIcon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { Switch } from '@/shared/ui';

/** Toggle de tema (= `ColorSchemeToggle` de web): override de la sesión, no toca la preferencia del perfil. */
export function ThemeRow() {
  const { colorScheme, toggle } = useColorSchemeControl();
  const colors = useSemanticColors();
  const isDark = colorScheme === 'dark';

  return (
    <XStack alignItems="center" gap={SPACING.sm}>
      <MoonIcon size={20} color={colors.text} weight={isDark ? 'fill' : 'regular'} />
      <Paragraph flex={1} fontSize={FONT_SIZE.lg}>
        Tema oscuro
      </Paragraph>
      <Switch checked={isDark} onCheckedChange={toggle} accessibilityLabel="Tema oscuro" />
    </XStack>
  );
}
