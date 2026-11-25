import { participantLabel } from '@omni/shared/split-expenses';
import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { PlusIcon } from 'phosphor-react-native';
import { XStack, YStack } from 'tamagui';

import { actionSheet, IconButton, Paragraph, TextField } from '@/shared/ui';

import { ParticipantAvatar } from './ParticipantAvatar';

import type { GatheringParticipantSummary, ParticipantTone } from '@omni/shared/split-expenses';

type ExpenseComposerProps = {
  participants: GatheringParticipantSummary[];
  tones: Record<string, ParticipantTone | undefined>;
  payerId: string;
  text: string;
  disabled?: boolean;
  onPayerChange: (participantId: string) => void;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onExpand: () => void;
};

/**
 * Carga rápida fija al pie del feed: quién pagó (abre un menú), un campo "monto y detalle" que se envía desde el
 * teclado y el + que abre la hoja completa con lo escrito. Lo que se carga acá se divide entre todos.
 */
export function ExpenseComposer({
  participants,
  tones,
  payerId,
  text,
  disabled = false,
  onPayerChange,
  onChangeText,
  onSubmit,
  onExpand,
}: ExpenseComposerProps) {
  const payer = participants.find(participant => participant.id === payerId);
  const payerLabel = payer ? participantLabel(payer) : '';

  const choosePayer = async () => {
    const picked = await actionSheet({
      title: '¿Quién pagó?',
      value: payerId,
      options: participants.map(participant => ({ value: participant.id, label: participantLabel(participant) })),
    });
    if (picked) onPayerChange(picked);
  };

  return (
    <XStack alignItems="center" gap={SPACING.xs}>
      <XStack
        height={SIZE.control.lg}
        maxWidth={128}
        alignItems="center"
        gap={SPACING.xs}
        paddingLeft={SPACING['2xs']}
        paddingRight={SPACING.sm}
        borderRadius={RADIUS.full}
        borderWidth={1}
        borderColor="border-color"
        backgroundColor="background"
        opacity="press:0.7"
        onPress={() => void choosePayer()}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Pagó ${payerLabel}. Elegir quién pagó`}
      >
        <ParticipantAvatar name={payer?.displayName ?? ''} tone={tones[payerId]} />
        <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600" flexShrink={1} numberOfLines={1}>
          {payerLabel}
        </Paragraph>
      </XStack>
      <YStack flex={1}>
        <TextField
          accessibilityLabel="Monto y detalle"
          placeholder="$ Monto y detalle"
          height={SIZE.control.lg}
          borderRadius={RADIUS.full}
          fontSize={FONT_SIZE.lg}
          returnKeyType="send"
          submitBehavior="submit"
          value={text}
          onChangeText={(next: string) => onChangeText(next)}
          onSubmitEditing={onSubmit}
        />
      </YStack>
      <IconButton
        icon={PlusIcon}
        variant="filled"
        size="lg"
        accessibilityLabel="Agregar gasto con más detalle"
        disabled={disabled}
        onPress={onExpand}
      />
    </XStack>
  );
}
