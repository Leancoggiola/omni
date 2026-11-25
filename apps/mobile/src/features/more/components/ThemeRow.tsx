import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { MoonIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { Paragraph, Switch } from '@/shared/ui';

/**
 * Toggle de tema (= `ColorSchemeToggle` de web): override de la sesión, no toca la preferencia del perfil. Muestra el
 * tema elegido (`selectedScheme`), no el que se ve, así el Switch responde al toque mientras corre el fundido.
 */
export function ThemeRow() {
  const { selectedScheme, toggle } = useColorSchemeControl();
  const colors = useSemanticColors();
  const isDark = selectedScheme === 'dark';

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
