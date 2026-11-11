import { FC, useState } from 'react';
import { Alert, Button, Code, Divider, Group, Modal, Stack, Text } from '@mantine/core';

import { getErrorMessage, notifyError, notifySuccess } from '@/shared/ui';

import type { CreatedHouseholdInvite } from '@omni/shared/household';

import { buildInviteMessage, formatInviteCode, formatInviteExpiryDate, inviteHoursLeft } from '@omni/shared/household';
import { ClockIcon, CopyIcon, WarningIcon } from '@phosphor-icons/react';

interface InviteCodeModalProps {
  invite: CreatedHouseholdInvite | null;
  onClose: () => void;
  onRevoke: () => Promise<void>;
}

/**
 * Muestra el código recién generado, la única vez que existe en claro: sin código no hay forma de recuperarlo.
 * En web solo se copia (código o mensaje), sin Web Share.
 */
export const InviteCodeModal: FC<InviteCodeModalProps> = ({ invite, onClose, onRevoke }) => {
  const [revoking, setRevoking] = useState(false);

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifySuccess(success);
    } catch {
      notifyError('No pudimos copiar. Seleccioná el código y copialo a mano.');
    }
  };

  const handleRevoke = async () => {
    if (revoking) return;
    setRevoking(true);
    try {
      await onRevoke();
      notifySuccess('Invitación revocada. El código ya no funciona.');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'No pudimos revocar la invitación'));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal opened={invite !== null} onClose={onClose} title="Tu invitación" centered>
      {invite && (
        <Stack gap="md">
          <Text c="dimmed">Pasale este código a tu pareja.</Text>
          <Code fz="2rem" fw={700} ta="center" py="md" aria-label="Código de invitación">
            {formatInviteCode(invite.code)}
          </Code>
          <Alert color="warning" icon={<WarningIcon size="1rem" />} title="Guardalo ahora">
            Este código se muestra una sola vez. Si lo perdés, generá uno nuevo: no podemos recuperarlo.
          </Alert>
          <Group gap="xs" wrap="nowrap">
            <ClockIcon size="1rem" />
            <Text size="sm" c="dimmed">
              Vence en {inviteHoursLeft(invite.expiresAt, new Date())} h · {formatInviteExpiryDate(invite.expiresAt)}.
              Sirve para una sola persona.
            </Text>
          </Group>
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<CopyIcon size="1rem" />}
              onClick={() => void copy(invite.code, 'Código copiado. Pegalo en el chat con tu pareja.')}
            >
              Copiar código
            </Button>
            <Button
              variant="light"
              leftSection={<CopyIcon size="1rem" />}
              onClick={() =>
                void copy(
                  buildInviteMessage(invite.code, invite.expiresAt, new Date()),
                  'Mensaje copiado. Pegalo en el chat con tu pareja.'
                )
              }
            >
              Copiar mensaje
            </Button>
          </Group>
          <Divider />
          <Group justify="flex-end" gap="sm">
            <Button variant="outline" color="destructive" loading={revoking} onClick={() => void handleRevoke()}>
              Revocar invitación
            </Button>
            <Button onClick={onClose} disabled={revoking}>
              Listo, ya lo guardé
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
};
