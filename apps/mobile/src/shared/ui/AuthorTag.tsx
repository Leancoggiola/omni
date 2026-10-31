import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import { getInitials } from './UserAvatar.utils';

import type { ItemAuthor } from '@omni/shared/household';

const AVATAR_SIZE = 24;

const AVATAR_TOKENS = {
  self: { surface: '$primarySurface', text: '$primary' },
  member: { surface: '$accentSurface', text: '$accent' },
  deleted: { surface: '$track', text: '$dimmed' },
} as const satisfies Record<ItemAuthor['kind'], Record<'surface' | 'text', string>>;

type AuthorTagProps = {
  author: ItemAuthor;
  /** Con `false` queda solo el avatar (el nombre sigue en el `accessibilityLabel`). */
  showName?: boolean;
};

/**
 * Quién agregó un ítem compartido: avatar chico con iniciales y, opcionalmente, el nombre ("Vos" si es la propia
 * sesión). La cuenta eliminada es un avatar neutro con "?". Mismo contrato que `AuthorTag` de web.
 */
export function AuthorTag({ author, showName = true }: AuthorTagProps) {
  const label = author.kind === 'self' ? 'Vos' : author.name;
  const tokens = AVATAR_TOKENS[author.kind];

  return (
    <XStack alignItems="center" gap={SPACING['2xs']} accessible accessibilityLabel={`Agregado por ${label}`}>
      <YStack
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        borderRadius={AVATAR_SIZE / 2}
        backgroundColor={tokens.surface}
        alignItems="center"
        justifyContent="center"
      >
        <Paragraph color={tokens.text} fontSize={FONT_SIZE.xs} fontWeight="700">
          {author.kind === 'deleted' ? '?' : getInitials(author.name)}
        </Paragraph>
      </YStack>
      {showName ? (
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs} numberOfLines={1} flexShrink={1}>
          {label}
        </Paragraph>
      ) : null}
    </XStack>
  );
}
