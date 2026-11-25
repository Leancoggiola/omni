import { describeSplitCaption, GATHERING_EXPENSE_DESCRIPTION_MAX, participantLabel } from '@omni/shared/split-expenses';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, Paragraph, TextField } from '@/shared/ui';

import { parseAmountInput } from '../utils/quickExpense';
import { ChoiceChip } from './ChoiceChip';
import { ParticipantAvatar } from './ParticipantAvatar';

import type {
  AddGatheringExpensePayload,
  GatheringParticipantSummary,
  ParticipantTone,
} from '@omni/shared/split-expenses';

export const INVALID_AMOUNT_MESSAGE = 'Ingresá un monto válido';

const AMOUNT_HEIGHT = 72;
const AMOUNT_FONT_SIZE = 40;

export type ExpenseDraft = { payerId: string; amount: string; description: string };

type ExpenseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatheringName: string;
  participants: GatheringParticipantSummary[];
  tones: Record<string, ParticipantTone | undefined>;
  initial: ExpenseDraft;
  onSubmit: (payload: AddGatheringExpensePayload) => Promise<unknown>;
  onAdded: () => void;
};

type PayerOptionProps = {
  participant: GatheringParticipantSummary;
  tone: ParticipantTone | undefined;
  checked: boolean;
  onPress: () => void;
};

/** Una opción de "¿Quién pagó?": avatar y nombre en una grilla de radios. */
function PayerOption({ participant, tone, checked, onPress }: PayerOptionProps) {
  return (
    <YStack
      width="23%"
      alignItems="center"
      gap={SPACING.xs}
      paddingVertical={SPACING.sm}
      paddingHorizontal={SPACING['2xs']}
      borderRadius={RADIUS.lg}
      borderWidth={checked ? 2 : 1}
      borderColor={checked ? 'primaryBorder' : 'hairline'}
      backgroundColor={checked ? 'primarySurface' : 'backgroundStrong'}
      opacity="press:0.7"
      onPress={onPress}
      accessible
      accessibilityRole="radio"
      accessibilityLabel={participantLabel(participant)}
      accessibilityState={{ checked }}
    >
      <ParticipantAvatar name={participant.displayName} tone={tone} size={40} />
      <Paragraph
        color={checked ? 'primary' : 'color'}
        fontSize={FONT_SIZE.sm}
        fontWeight={checked ? '700' : '500'}
        numberOfLines={1}
      >
        {participantLabel(participant)}
      </Paragraph>
    </YStack>
  );
}

/**
 * Hoja "Nuevo gasto": monto, detalle, quién pagó y entre quiénes se divide (todos por defecto), con la línea en vivo
 * del reparto. Sin nadie elegido es un error y no se puede agregar. Un error de la API queda arriba sin perder lo
 * cargado. Quien la usa la remonta con `key` en cada apertura.
 */
export function ExpenseSheet({
  open,
  onOpenChange,
  gatheringName,
  participants,
  tones,
  initial,
  onSubmit,
  onAdded,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState(initial.amount);
  const [description, setDescription] = useState(initial.description);
  const [payerId, setPayerId] = useState(initial.payerId);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  const parsed = parseAmountInput(amount);
  const sharedWith = participants.filter(participant => !excluded.includes(participant.id)).map(({ id }) => id);
  const caption = describeSplitCaption(parsed ?? 0, sharedWith.length, participants.length);
  const canSubmit = amount.trim() !== '' && !caption.invalid;

  const toggleSharer = (id: string) => {
    setExcluded(current => (current.includes(id) ? current.filter(other => other !== id) : [...current, id]));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || busy.current) return;
    if (parsed === null) {
      setAmountError(INVALID_AMOUNT_MESSAGE);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const trimmed = description.trim();
      await onSubmit({
        participantId: payerId,
        amount: parsed,
        description: trimmed === '' ? null : trimmed,
        sharedWith: sharedWith.length === participants.length ? undefined : sharedWith,
      });
      onAdded();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo agregar el gasto'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Nuevo gasto" busy={submitting}>
      <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
        {gatheringName}
      </Paragraph>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
      <TextField
        label="Monto"
        placeholder="$ 0"
        keyboardType="decimal-pad"
        height={AMOUNT_HEIGHT}
        fontSize={AMOUNT_FONT_SIZE}
        fontWeight="600"
        textAlign="center"
        value={amount}
        onChangeText={(text: string) => {
          setAmount(text);
          setAmountError(null);
          setSubmitError(null);
        }}
        error={amountError ?? undefined}
      />
      <TextField
        label="Detalle"
        placeholder="¿En qué se gastó?"
        maxLength={GATHERING_EXPENSE_DESCRIPTION_MAX}
        value={description}
        onChangeText={(text: string) => setDescription(text)}
      />
      <YStack gap={SPACING.xs} accessibilityRole="radiogroup" accessibilityLabel="¿Quién pagó?">
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          ¿Quién pagó?
        </Paragraph>
        <XStack flexWrap="wrap" gap="2%" rowGap={SPACING.xs}>
          {participants.map(participant => (
            <PayerOption
              key={participant.id}
              participant={participant}
              tone={tones[participant.id]}
              checked={participant.id === payerId}
              onPress={() => setPayerId(participant.id)}
            />
          ))}
        </XStack>
      </YStack>
      <YStack gap={SPACING.xs}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          ¿Entre quiénes?
        </Paragraph>
        <XStack flexWrap="wrap" gap={SPACING.xs}>
          {participants.map(participant => (
            <ChoiceChip
              key={participant.id}
              label={participantLabel(participant)}
              accessibilityLabel={`Dividir con ${participantLabel(participant)}`}
              selected={!excluded.includes(participant.id)}
              avatar={<ParticipantAvatar name={participant.displayName} tone={tones[participant.id]} size={24} />}
              onPress={() => toggleSharer(participant.id)}
            />
          ))}
        </XStack>
      </YStack>
      <Banner color={caption.invalid ? 'destructive' : 'brand'}>{caption.text}</Banner>
      <Button fullWidth size="lg" loading={submitting} disabled={!canSubmit} onPress={() => void handleSubmit()}>
        Agregar gasto
      </Button>
    </FormSheet>
  );
}
