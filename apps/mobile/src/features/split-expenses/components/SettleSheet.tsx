import { formatMoney } from '@omni/shared/common';
import { describeSettlement, formatSignedBalance, participantLabel } from '@omni/shared/split-expenses';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckCircleIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, Paragraph } from '@/shared/ui';

import { describeTransfers, gatheringTotals } from '../utils/presentation';
import { ParticipantAvatar } from './ParticipantAvatar';

import type { GatheringDetail, ParticipantTone } from '@omni/shared/split-expenses';

type SettleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gathering: GatheringDetail;
  tones: Record<string, ParticipantTone | undefined>;
  onSettle: () => Promise<unknown>;
  onSettled: () => void;
  onClosed?: () => void;
};

/**
 * Hoja "Saldar cuentas": las transferencias que cancelan los saldos, lo que pagó y gastó cada uno con su diferencia, y
 * "Marcar como saldada" para la juntada entera. Quien la usa la remonta con `key` en cada apertura.
 */
export function SettleSheet({ open, onOpenChange, gathering, tones, onSettle, onSettled, onClosed }: SettleSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = useRef(false);

  const handleSettle = async () => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSettle();
      onSettled();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo actualizar la juntada'));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Saldar cuentas" busy={submitting} onClosed={onClosed}>
      <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
        {`${gathering.name} · ${gatheringTotals(gathering)}`}
      </Paragraph>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}

      {gathering.settlements.length > 0 ? (
        <YStack gap={SPACING.xs}>
          {gathering.settlements.map(settlement => {
            const { from, to } = describeSettlement(settlement, gathering.participants);
            const amount = formatMoney(settlement.amount);
            return (
              <XStack
                key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}
                alignItems="center"
                gap={SPACING.sm}
                padding={SPACING.sm}
                borderRadius={RADIUS.lg}
                borderWidth={1}
                borderColor="hairline"
                accessible
                accessibilityLabel={`${from} le transfiere ${amount} a ${to}`}
              >
                <ParticipantAvatar name={settlement.fromName} tone={tones[settlement.fromParticipantId]} />
                <YStack flex={1}>
                  <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
                    {`${from} → ${to}`}
                  </Paragraph>
                  <Paragraph fontSize={FONT_SIZE.xl} fontWeight="700">
                    {amount}
                  </Paragraph>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      ) : (
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
          {describeTransfers(gathering.settlements)}
        </Paragraph>
      )}

      <YStack height={1} backgroundColor="hairline" />

      <YStack gap={SPACING.sm}>
        {gathering.participants.map(participant => {
          const difference = formatSignedBalance(participant.balance);
          const detail = `pagó ${formatMoney(participant.totalPaid)} · gastó ${formatMoney(participant.owed)}`;
          return (
            <XStack
              key={participant.id}
              alignItems="center"
              gap={SPACING.sm}
              accessible
              accessibilityLabel={`${participantLabel(participant)}, ${detail}, saldo ${difference.label}`}
            >
              <ParticipantAvatar name={participant.displayName} tone={tones[participant.id]} />
              <YStack flex={1}>
                <XStack justifyContent="space-between" alignItems="center" gap={SPACING.xs}>
                  <Paragraph flex={1} fontSize={FONT_SIZE.md} fontWeight="600" numberOfLines={1}>
                    {participantLabel(participant)}
                  </Paragraph>
                  <Paragraph color={difference.tone} fontSize={FONT_SIZE.lg} fontWeight="700">
                    {difference.label}
                  </Paragraph>
                </XStack>
                <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
                  {detail}
                </Paragraph>
              </YStack>
            </XStack>
          );
        })}
      </YStack>

      <Button
        fullWidth
        size="lg"
        color="success"
        leftSection={CheckCircleIcon}
        loading={submitting}
        onPress={() => void handleSettle()}
      >
        Marcar como saldada
      </Button>
    </FormSheet>
  );
}
