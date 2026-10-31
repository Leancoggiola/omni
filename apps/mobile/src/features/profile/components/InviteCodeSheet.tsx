// tamagui-ignore
import { buildInviteMessage, formatInviteCode, formatInviteExpiryDate, inviteHoursLeft } from '@omni/shared/household';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ClockIcon, CopyIcon, ShareNetworkIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage } from '@/shared/ui';

import type { CreatedHouseholdInvite } from '@omni/shared/household';

type InviteCodeSheetProps = {
  invite: CreatedHouseholdInvite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevoke: () => Promise<void>;
  /** El Modal ya se ocultó: el padre avisa ahí lo que haya pasado (revocar). */
  onClosed: () => void;
};

/**
 * Muestra el código recién generado, la única vez que existe en claro. El padre lo remonta con `key` por invitación.
 * Va en una hoja que tapa los toasts: "copiado" cambia el botón, un error de revocar sale en un `Banner`.
 */
export function InviteCodeSheet({ invite, open, onOpenChange, onRevoke, onClosed }: InviteCodeSheetProps) {
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revokingRef = useRef(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(invite.code);
    setCopied(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildInviteMessage(invite.code, invite.expiresAt, new Date()) });
    } catch {
      setError('No pudimos abrir el menú de compartir. Probá con "Copiar código".');
    }
  };

  const handleRevoke = async () => {
    if (revokingRef.current) return;
    revokingRef.current = true;
    setRevoking(true);
    setError(null);
    try {
      await onRevoke();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos revocar la invitación'));
      revokingRef.current = false;
      setRevoking(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Tu invitación" busy={revoking} onClosed={onClosed}>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
        Pasale este código a tu pareja.
      </Paragraph>
      <YStack
        backgroundColor="$primarySurface"
        borderWidth={1}
        borderColor="$primaryBorder"
        borderRadius={RADIUS.lg}
        paddingVertical={SPACING.lg}
        alignItems="center"
      >
        <Paragraph
          color="$primary"
          fontSize={32}
          fontWeight="800"
          letterSpacing={2}
          accessibilityLabel={`Código de invitación: ${formatInviteCode(invite.code)}`}
        >
          {formatInviteCode(invite.code)}
        </Paragraph>
      </YStack>
      <Banner color="warning">
        Guardalo ahora: este código se muestra una sola vez. Si lo perdés, generá uno nuevo: no podemos recuperarlo.
      </Banner>
      <XStack gap={SPACING['2xs']} alignItems="center">
        <ClockIcon size={16} />
        <Paragraph flex={1} color="$dimmed" fontSize={FONT_SIZE.sm}>
          {`Vence en ${inviteHoursLeft(invite.expiresAt, new Date())} h · ${formatInviteExpiryDate(invite.expiresAt)}. Sirve para una sola persona.`}
        </Paragraph>
      </XStack>
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <YStack gap={SPACING.xs}>
        <Button fullWidth leftSection={ShareNetworkIcon} onPress={() => void handleShare()}>
          Compartir código
        </Button>
        <Button fullWidth variant="outline" leftSection={CopyIcon} onPress={() => void handleCopy()}>
          {copied ? 'Código copiado' : 'Copiar código'}
        </Button>
        <Button fullWidth variant="subtle" color="destructive" loading={revoking} onPress={() => void handleRevoke()}>
          Revocar invitación
        </Button>
      </YStack>
    </FormSheet>
  );
}
