import { SPACING } from '@omni/shared/theme';
import { XStack, YStack } from 'tamagui';

import { getInitials, Paragraph, UserAvatar } from '@/shared/ui';

import type { ParticipantTone } from '@omni/shared/split-expenses';

export const TONE_TOKENS = {
  sage: { fill: 'successFill', text: 'onSuccessFill' },
  terracotta: { fill: 'accentFill', text: 'onAccentFill' },
  brand: { fill: 'primary', text: 'onPrimary' },
  gray: { fill: 'dimmed', text: 'onDimmed' },
} as const satisfies Record<ParticipantTone, { fill: string; text: string }>;

type ParticipantAvatarProps = {
  name: string;
  tone: ParticipantTone | undefined;
  size?: number;
};

/** Avatar de un participante: el propio lleva el degradé de marca (`tone` indefinido) y el resto un tono. */
export function ParticipantAvatar({ name, tone, size = 32 }: ParticipantAvatarProps) {
  if (tone === undefined) return <UserAvatar name={name} size={size} />;
  const tokens = TONE_TOKENS[tone];

  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor={tokens.fill}
      alignItems="center"
      justifyContent="center"
    >
      <Paragraph color={tokens.text} fontSize={size * 0.4} fontWeight="600">
        {getInitials(name)}
      </Paragraph>
    </YStack>
  );
}

type AvatarStackProps = {
  people: { id: string; name: string; tone: ParticipantTone | undefined }[];
  size?: number;
};

/** Avatares superpuestos de un grupo. Es decorativo: el texto que lo acompaña nombra a las personas. */
export function AvatarStack({ people, size = 24 }: AvatarStackProps) {
  return (
    <XStack accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {people.map((person, index) => (
        <YStack
          key={person.id}
          marginLeft={index === 0 ? 0 : -SPACING.xs}
          borderRadius={size / 2 + 2}
          borderWidth={2}
          borderColor="backgroundStrong"
        >
          <ParticipantAvatar name={person.name} tone={person.tone} size={size} />
        </YStack>
      ))}
    </XStack>
  );
}
