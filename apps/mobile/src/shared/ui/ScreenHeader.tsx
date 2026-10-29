import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ArrowLeftIcon, type Icon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { IconButton } from './button/IconButton';
import { DisplayTitle } from './DisplayTitle';

const CHIP_SIZE = 44;

type ScreenHeaderProps = {
  icon?: Icon;
  title: string;
  accent?: string;
  subtitle?: string;
  size?: 'md' | 'lg' | 'xl';
  onBack?: () => void;
  backLabel?: string;
};

/** La palabra acentuada por defecto: la última, si el título tiene más de una; `accent` tiene que ser una palabra entera. */
function accentWord(title: string, accent?: string): string | undefined {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return undefined;
  if (accent === undefined) return words[words.length - 1];
  return words.includes(accent) ? accent : undefined;
}

/**
 * Equivalente de `PageHeader` de web en v2: chip de ícono opcional en `primarySurface`, el título en `display` (`size`
 * `md` por defecto; `lg` en Perfil y `xl` en "Más") con una palabra
 * en `primary` (sin itálica) y el subtítulo. `accent` es esa palabra (por defecto, la última) y tiene que ser una
 * palabra completa de `title`; un título de una sola palabra no se resalta. Pantallas de stack (Perfil): `onBack`
 * agrega un `IconButton` glass de volver, que `backLabel` nombra ("Volver a Más").
 */
export function ScreenHeader({
  icon: IconComponent,
  title,
  accent,
  subtitle,
  size = 'md',
  onBack,
  backLabel = 'Volver',
}: ScreenHeaderProps) {
  const colors = useSemanticColors();

  return (
    <XStack alignItems="center" justifyContent="space-between" gap={SPACING.md}>
      <XStack alignItems="center" gap={SPACING.sm} flexShrink={1}>
        {onBack ? (
          <IconButton icon={ArrowLeftIcon} variant="glass" accessibilityLabel={backLabel} onPress={onBack} />
        ) : null}
        {IconComponent ? (
          <YStack
            width={CHIP_SIZE}
            height={CHIP_SIZE}
            borderRadius={RADIUS.full}
            backgroundColor="$primarySurface"
            alignItems="center"
            justifyContent="center"
          >
            <IconComponent size={22} color={colors.primary} />
          </YStack>
        ) : null}
        <YStack flexShrink={1} gap={SPACING['2xs']}>
          <DisplayTitle size={size} accent={accentWord(title, accent)} numberOfLines={1}>
            {title}
          </DisplayTitle>
          {subtitle ? (
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
              {subtitle}
            </Paragraph>
          ) : null}
        </YStack>
      </XStack>
    </XStack>
  );
}
