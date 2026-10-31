import { formatInviteExpiryDate, inviteHoursLeft } from '@omni/shared/household';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { LinkBreakIcon, UserPlusIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useHousehold } from '@/core/household';
import {
  Badge,
  Banner,
  Button,
  confirm,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  SectionCard,
  UserAvatar,
} from '@/shared/ui';

import { useHouseholdActions } from '../hooks/useHouseholdActions';
import { dismissPushNotice, isPushNoticeDismissed } from '../utils/pushNoticeDismissal';
import { InviteCodeSheet } from './InviteCodeSheet';
import { JoinHouseholdSheet } from './JoinHouseholdSheet';

import type { CreatedHouseholdInvite, HouseholdInfo } from '@omni/shared/household';

type Opened = { invite: CreatedHouseholdInvite; key: number };

/**
 * Card "Hogar compartido" del Perfil: solo, invitación pendiente o vinculado. El código recién generado vive acá
 * (en estado) hasta que se cierra la hoja; el GET nunca lo devuelve. Los avisos de revocar y de unirse se dan al
 * cerrar la hoja (`onClosed`), cuando el Modal ya no tapa los toasts.
 */
export function HouseholdCard() {
  const { household, isLoading, error, mutate } = useHousehold();
  const { user } = useAuth();
  const { createInvite, revokeInvite, previewInvite, acceptInvite, leaveHousehold } = useHouseholdActions();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinKey, setJoinKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(isPushNoticeDismissed);
  const busyRef = useRef(false);
  const afterClose = useRef<string | null>(null);

  const runBusy = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleInvite = () =>
    runBusy(async () => {
      try {
        const invite = await createInvite();
        setOpened(current => ({ invite, key: (current?.key ?? 0) + 1 }));
        setInviteOpen(true);
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

  const handleRevokeFromCard = () =>
    runBusy(async () => {
      try {
        await revokeInvite();
        notifySuccess('Invitación revocada. El código ya no funciona.');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No pudimos revocar la invitación'));
      }
    });

  const handleRevokeFromSheet = async () => {
    await revokeInvite();
    afterClose.current = 'Invitación revocada. El código ya no funciona.';
  };

  const handleOpenJoin = () => {
    setJoinKey(key => key + 1);
    setJoinOpen(true);
  };

  const handleSheetClosed = () => {
    const message = afterClose.current;
    afterClose.current = null;
    if (message) notifySuccess(message);
  };

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

  if (error && !household) {
    return <ErrorState message="No pudimos cargar tu hogar. Revisá tu conexión." onRetry={() => void mutate()} />;
  }
  if (isLoading || !household) return <LoadingState />;

  const partner = household.members.find(member => member.username !== user?.username);
  const isLinked = household.members.length >= 2 && partner !== undefined;

  return (
    <>
      <SectionCard>
        <XStack alignItems="center" justifyContent="space-between" gap={SPACING.sm}>
          <Paragraph flex={1} fontSize={FONT_SIZE.xl} fontWeight="700" accessibilityRole="header">
            Hogar compartido
          </Paragraph>
          <StatusBadge household={household} isLinked={isLinked} />
        </XStack>

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
            onRevoke={() => void handleRevokeFromCard()}
            onJoin={handleOpenJoin}
          />
        ) : (
          <SoloBody busy={busy} onInvite={() => void handleInvite()} onJoin={handleOpenJoin} />
        )}
      </SectionCard>

      {opened ? (
        <InviteCodeSheet
          key={opened.key}
          invite={opened.invite}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onRevoke={handleRevokeFromSheet}
          onClosed={handleSheetClosed}
        />
      ) : null}
      <JoinHouseholdSheet
        key={joinKey}
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onPreview={previewInvite}
        onAccept={acceptInvite}
        onJoined={name => {
          afterClose.current = `Ya compartís tu hogar con ${name}`;
        }}
        onClosed={handleSheetClosed}
      />
    </>
  );
}

function StatusBadge({ household, isLinked }: { household: HouseholdInfo; isLinked: boolean }) {
  if (isLinked) return <Badge color="accent">{`${household.members.length} de 2`}</Badge>;
  if (household.pendingInvite)
    return (
      <Badge color="accent" variant="light">
        Invitación pendiente
      </Badge>
    );
  return (
    <Badge color="dimmed" variant="light">
      Solo vos
    </Badge>
  );
}

function SoloBody({ busy, onInvite, onJoin }: { busy: boolean; onInvite: () => void; onJoin: () => void }) {
  return (
    <YStack gap={SPACING.md}>
      <YStack gap={SPACING['2xs']}>
        <Paragraph fontWeight="700" fontSize={FONT_SIZE.lg}>
          Todavía estás solo
        </Paragraph>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
          Vinculá tu cuenta con tu pareja y compartan películas, series, alacena y lista de compras. Gimnasio y gastos
          siguen siendo solo tuyos.
        </Paragraph>
      </YStack>
      <YStack gap={SPACING.xs}>
        <Button fullWidth leftSection={UserPlusIcon} loading={busy} onPress={onInvite}>
          Invitar a mi pareja
        </Button>
        <Button fullWidth variant="outline" onPress={onJoin}>
          Tengo un código
        </Button>
      </YStack>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} textAlign="center">
        Un hogar admite hasta 2 personas y cada persona solo puede estar en uno.
      </Paragraph>
    </YStack>
  );
}

type PendingBodyProps = {
  expiresAt: string;
  busy: boolean;
  onRegenerate: () => void;
  onRevoke: () => void;
  onJoin: () => void;
};

function PendingBody({ expiresAt, busy, onRegenerate, onRevoke, onJoin }: PendingBodyProps) {
  return (
    <YStack gap={SPACING.md}>
      <Banner color="info">
        {`Invitación vigente. Vence en ${inviteHoursLeft(expiresAt, new Date())} h (${formatInviteExpiryDate(expiresAt)}). Por seguridad no podemos volver a mostrar el código.`}
      </Banner>
      <YStack gap={SPACING.xs}>
        <Button fullWidth loading={busy} onPress={onRegenerate}>
          Generar un código nuevo
        </Button>
        <Button fullWidth variant="outline" disabled={busy} onPress={onRevoke}>
          Revocar invitación
        </Button>
        <Button fullWidth variant="subtle" onPress={onJoin}>
          Tengo un código
        </Button>
      </YStack>
    </YStack>
  );
}

type LinkedBodyProps = {
  household: HouseholdInfo;
  selfUsername: string | undefined;
  pushDismissed: boolean;
  busy: boolean;
  onDismissPush: () => void;
  onLeave: () => void;
};

function LinkedBody({ household, selfUsername, pushDismissed, busy, onDismissPush, onLeave }: LinkedBodyProps) {
  return (
    <YStack gap={SPACING.md}>
      <YStack gap={SPACING.sm}>
        {household.members.map(member => (
          <XStack key={member.userId} gap={SPACING.sm} alignItems="center">
            <UserAvatar name={member.name} />
            <YStack flex={1}>
              <Paragraph fontWeight="700" fontSize={FONT_SIZE.lg}>
                {member.username === selfUsername ? `${member.name} (vos)` : member.name}
              </Paragraph>
              <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
                {`@${member.username} · desde ${formatJoinedAt(member.joinedAt)}`}
              </Paragraph>
            </YStack>
          </XStack>
        ))}
      </YStack>
      <YStack gap={SPACING['2xs']}>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs} fontWeight="700" textTransform="uppercase">
          Compartido entre los dos
        </Paragraph>
        <XStack gap={SPACING.xs} flexWrap="wrap">
          <Badge color="accent" variant="light">
            Películas y series
          </Badge>
          <Badge color="accent" variant="light">
            Alacena
          </Badge>
          <Badge color="accent" variant="light">
            Lista de compras
          </Badge>
        </XStack>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
          Gimnasio y gastos siguen siendo solo tuyos.
        </Paragraph>
      </YStack>
      {pushDismissed ? null : (
        <YStack gap={SPACING['2xs']}>
          <Banner color="info">
            No hay notificaciones push. Los cambios de tu pareja aparecen cuando la app se actualiza sola cada tanto, o
            al tirar para refrescar.
          </Banner>
          <Button variant="subtle" size="sm" alignSelf="flex-end" onPress={onDismissPush}>
            Entendido
          </Button>
        </YStack>
      )}
      <Button
        fullWidth
        variant="outline"
        color="destructive"
        leftSection={LinkBreakIcon}
        loading={busy}
        onPress={onLeave}
      >
        Desvincular
      </Button>
    </YStack>
  );
}

function formatJoinedAt(joinedAt: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(joinedAt)
  );
}
