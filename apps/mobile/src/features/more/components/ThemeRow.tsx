import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { MoonIcon } from 'phosphor-react-native';
import { Paragraph, Switch, XStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';

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
      {/* Activo, Tamagui pinta el track con `$backgroundActive` salvo que haya `activeStyle`; el thumb
          por defecto toma `$color` y en claro sale negro. Track primario como el Switch de Mantine. */}
      <Switch
        checked={isDark}
        onCheckedChange={toggle}
        backgroundColor="$dimmedSurface"
        borderWidth={1}
        borderColor="$borderColor"
        activeStyle={{ backgroundColor: '$primary', borderColor: '$primary' }}
        accessibilityLabel="Tema oscuro"
      >
        <Switch.Thumb backgroundColor={colors.white} />
      </Switch>
    </XStack>
  );
}
