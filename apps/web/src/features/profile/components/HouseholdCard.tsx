import { FC, useState } from 'react';
import { Alert, Badge, Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { useHousehold } from '@/core/household';
import {
  confirm,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  UserAvatar,
} from '@/shared/ui';

import { useHouseholdActions } from '../hooks/useHouseholdActions';
import { dismissPushNotice, isPushNoticeDismissed } from '../utils/pushNoticeDismissal';
import { InviteCodeModal } from './InviteCodeModal';
import { JoinHouseholdModal } from './JoinHouseholdModal';

import type { CreatedHouseholdInvite, HouseholdInfo } from '@omni/shared/household';

import { formatInviteExpiryDate, inviteHoursLeft } from '@omni/shared/household';
import { ClockIcon, HouseIcon, LinkBreakIcon, UserPlusIcon } from '@phosphor-icons/react';

/**
 * Card "Hogar compartido" del Perfil: solo, invitación pendiente o vinculado. El código recién generado vive acá
 * (en estado) hasta que se cierra el modal; el GET nunca lo devuelve.
 */
export const HouseholdCard: FC = () => {
  const { household, isLoading, error, mutate } = useHousehold();
  const { user } = useAuth();
  const { createInvite, revokeInvite, previewInvite, acceptInvite, leaveHousehold } = useHouseholdActions();
  const [invite, setInvite] = useState<CreatedHouseholdInvite | null>(null);
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(isPushNoticeDismissed);

  const runBusy = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = () =>
    runBusy(async () => {
      try {
        setInvite(await createInvite());
      } catch (err) {
        notifyError(getErrorMessage(err, 'No pudimos generar la invitación'));
      }
    });

  const handleRegenerate = async () => {
    const confirmed = await confirm({
      title: '¿Generar un código nuevo?',
      description:
        'El código anterior deja de funcionar al instante. Vas a ver el nuevo una sola vez, así que tené a mano dónde compartirlo.',
      confirmLabel: 'Generar código nuevo',
      destructive: false,
    });
    if (confirmed) await handleInvite();
  };

  const handleRevoke = () =>
    runBusy(async () => {
      try {
        await revokeInvite();
        notifySuccess('Invitación revocada. El código ya no funciona.');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No pudimos revocar la invitación'));
      }
    });

  const handleLeave = async (partnerName: string) => {
    const confirmed = await confirm({
      title: `¿Desvincular a ${partnerName}?`,
      description: `Te llevás una copia: un hogar nuevo con tus películas, alacena y lista de compras tal como están hoy. ${partnerName} conserva todo lo que hay en el hogar, sin cambios y sin tener que aprobarlo. Desde ahí cada uno edita lo suyo: los cambios nuevos ya no se comparten.`,
      confirmLabel: 'Desvincular y llevarme una copia',
    });
    if (!confirmed) return;
    await runBusy(async () => {
      try {
        await leaveHousehold();
        notifySuccess('Te desvinculaste. Tenés una copia de lo compartido.');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No pudimos desvincular'));
      }
    });
  };

  const handleDismissPush = () => {
    dismissPushNotice();
    setPushDismissed(true);
  };

  if (error) return <ErrorState message="No pudimos cargar tu hogar. Revisá tu conexión." onRetry={() => mutate()} />;
  if (isLoading || !household) return <LoadingState />;

  const partner = household.members.find(member => member.username !== user?.username);
  const isLinked = household.members.length >= 2 && partner !== undefined;

  return (
    <Paper>
      <Stack gap="lg">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <HouseIcon size="1.5rem" />
            <Title order={2} size="h4" fw={600}>
              Hogar compartido
            </Title>
          </Group>
          <StatusBadge household={household} isLinked={isLinked} />
        </Group>

        {isLinked ? (
          <LinkedBody
            household={household}
            selfUsername={user?.username}
            pushDismissed={pushDismissed}
            busy={busy}
            onDismissPush={handleDismissPush}
            onLeave={() => void handleLeave(partner.name)}
          />
        ) : household.pendingInvite ? (
          <PendingBody
            expiresAt={household.pendingInvite.expiresAt}
            busy={busy}
            onRegenerate={() => void handleRegenerate()}
            onRevoke={() => void handleRevoke()}
            onJoin={() => setJoining(true)}
          />
        ) : (
          <SoloBody busy={busy} onInvite={() => void handleInvite()} onJoin={() => setJoining(true)} />
        )}
      </Stack>

      <InviteCodeModal invite={invite} onClose={() => setInvite(null)} onRevoke={revokeInvite} />
      <JoinHouseholdModal
        opened={joining}
        onClose={() => setJoining(false)}
        onPreview={previewInvite}
        onAccept={acceptInvite}
      />
    </Paper>
  );
};

const StatusBadge: FC<{ household: HouseholdInfo; isLinked: boolean }> = ({ household, isLinked }) => {
  if (isLinked) return <Badge color="sage">{household.members.length} de 2</Badge>;
  if (household.pendingInvite) return <Badge color="warning">Invitación pendiente</Badge>;
  return <Badge variant="light">Solo vos</Badge>;
};

const SoloBody: FC<{ busy: boolean; onInvite: () => void; onJoin: () => void }> = ({ busy, onInvite, onJoin }) => (
  <Stack gap="md" align="flex-start">
    <Stack gap="3xs">
      <Text fw={700}>Todavía estás solo</Text>
      <Text c="dimmed">
        Vinculá tu cuenta con tu pareja y compartan películas, series, alacena y lista de compras. Gimnasio y gastos
        siguen siendo solo tuyos.
      </Text>
    </Stack>
    <Group gap="sm">
      <Button leftSection={<UserPlusIcon size="1rem" />} loading={busy} onClick={onInvite}>
        Invitar a mi pareja
      </Button>
      <Button variant="outline" onClick={onJoin}>
        Tengo un código
      </Button>
    </Group>
    <Text size="xs" c="dimmed">
      Un hogar admite hasta 2 personas y cada persona solo puede estar en uno.
    </Text>
  </Stack>
);

interface PendingBodyProps {
  expiresAt: string;
  busy: boolean;
  onRegenerate: () => void;
  onRevoke: () => void;
  onJoin: () => void;
}

const PendingBody: FC<PendingBodyProps> = ({ expiresAt, busy, onRegenerate, onRevoke, onJoin }) => (
  <Stack gap="md" align="flex-start">
    <Alert color="info" icon={<ClockIcon size="1rem" />} title="Invitación vigente">
      Vence en {inviteHoursLeft(expiresAt, new Date())} h ({formatInviteExpiryDate(expiresAt)}). Por seguridad no
      podemos volver a mostrar el código.
    </Alert>
    <Group gap="sm">
      <Button loading={busy} onClick={onRegenerate}>
        Generar un código nuevo
      </Button>
      <Button variant="outline" disabled={busy} onClick={onRevoke}>
        Revocar invitación
      </Button>
      <Button variant="subtle" onClick={onJoin}>
        Tengo un código
      </Button>
    </Group>
  </Stack>
);

interface LinkedBodyProps {
  household: HouseholdInfo;
  selfUsername: string | undefined;
  pushDismissed: boolean;
  busy: boolean;
  onDismissPush: () => void;
  onLeave: () => void;
}

const LinkedBody: FC<LinkedBodyProps> = ({ household, selfUsername, pushDismissed, busy, onDismissPush, onLeave }) => (
  <Stack gap="md">
    <Stack gap="sm">
      {household.members.map((member, index) => (
        <Stack key={member.userId} gap="sm">
          {index > 0 && <Divider />}
          <Group gap="sm" wrap="nowrap">
            <UserAvatar name={member.name} src={member.avatarUrl} />
            <Stack gap="3xs">
              <Group gap="xs">
                <Text fw={700}>{member.name}</Text>
                {member.username === selfUsername && <Badge variant="light">Vos</Badge>}
              </Group>
              <Text size="sm" c="dimmed">
                @{member.username} · desde {formatJoinedAt(member.joinedAt)}
              </Text>
            </Stack>
          </Group>
        </Stack>
      ))}
    </Stack>
    <Group gap="xs">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        Compartido
      </Text>
      <Badge variant="light">Películas y series</Badge>
      <Badge variant="light">Alacena</Badge>
      <Badge variant="light">Lista de compras</Badge>
    </Group>
    <Text size="sm" c="dimmed">
      Gimnasio y gastos siguen siendo solo tuyos.
    </Text>
    {!pushDismissed && (
      <Alert color="info" withCloseButton closeButtonLabel="Descartar aviso" onClose={onDismissPush}>
        No hay notificaciones push. Los cambios de tu pareja aparecen cuando la página se actualiza sola cada tanto.
      </Alert>
    )}
    <Divider />
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Text size="sm" c="dimmed">
        Desvincularte no necesita la aprobación de tu pareja.
      </Text>
      <Button
        variant="outline"
        color="destructive"
        leftSection={<LinkBreakIcon size="1rem" />}
        loading={busy}
        onClick={onLeave}
      >
        Desvincular
      </Button>
    </Group>
  </Stack>
);

function formatJoinedAt(joinedAt: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(joinedAt)
  );
}
