import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { UsersThreeIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';

import { SensitiveGate } from '@/core/biometrics';
import {
  confirm,
  EmptyState,
  ErrorState,
  FormScrollView,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  Paragraph,
  Screen,
  ScreenHeader,
  SectionCard,
  usePullToRefresh,
  useSheetNotice,
} from '@/shared/ui';

import { EditFriendSheet } from './components/EditFriendSheet';
import { FriendRow } from './components/FriendRow';
import { NewFriendForm } from './components/NewFriendForm';
import { useSplitExpensesMutations } from './hooks/useSplitExpensesMutations';
import { useSplitFriends } from './hooks/useSplitFriends';

import type { SplitFriend } from '@omni/shared/split-expenses';

/**
 * Amigos de División de gastos (ruta de stack): alta, saldo de cada uno en las juntadas activas y edición en una hoja,
 * desde donde se elimina con confirmación.
 */
function FriendsContent({ onBack }: { onBack: () => void }) {
  const { friends, isLoading, error, mutate } = useSplitFriends();
  const { createFriend, updateFriend, deleteFriend } = useSplitExpensesMutations();
  const refreshControl = usePullToRefresh(mutate);
  const notice = useSheetNotice();
  const [editing, setEditing] = useState<SplitFriend | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const pendingDelete = useRef<SplitFriend | null>(null);

  const openEdit = (friend: SplitFriend) => {
    setEditKey(key => key + 1);
    setEditing(friend);
    setEditOpen(true);
  };

  const confirmDelete = async (friend: SplitFriend) => {
    const confirmed = await confirm({
      title: 'Eliminar amigo',
      description: `¿Seguro que querés eliminar a "${friend.name}"?`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    try {
      await deleteFriend(friend.id);
      notifySuccess('Amigo eliminado');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el amigo'));
    }
  };

  const handleDelete = (friend: SplitFriend) => {
    pendingDelete.current = friend;
    setEditOpen(false);
  };

  const handleClosed = () => {
    notice.flush();
    const friend = pendingDelete.current;
    pendingDelete.current = null;
    if (friend) void confirmDelete(friend);
  };

  const renderFriends = () => {
    if (error && !friends) {
      return <ErrorState message="No se pudieron cargar los amigos" onRetry={() => void mutate()} />;
    }
    if (isLoading || !friends) return <LoadingState variant="skeleton" rows={3} compact />;
    if (friends.length === 0) {
      return (
        <EmptyState
          icon={UsersThreeIcon}
          title="Sin amigos guardados"
          description="Sumá a quienes se repiten en tus juntadas."
        />
      );
    }
    return (
      <>
        {error ? <ErrorState message="No se pudieron actualizar los amigos" onRetry={() => void mutate()} /> : null}
        <SectionCard>
          {friends.map((friend, index) => (
            <FriendRow key={friend.id} friend={friend} divided={index > 0} onEdit={openEdit} />
          ))}
        </SectionCard>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm} paddingHorizontal={SPACING['2xs']}>
          Los amigos viven solo en tu Omni: no necesitan cuenta para sumarse a una juntada.
        </Paragraph>
      </>
    );
  };

  return (
    <Screen insetBottom>
      <ScreenHeader title="Amigos" size="lg" onBack={onBack} />
      <FormScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.xl }}
      >
        <NewFriendForm onCreate={createFriend} />
        {renderFriends()}
      </FormScrollView>
      {editing ? (
        <EditFriendSheet
          key={editKey}
          friend={editing}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={updateFriend}
          onSaved={() => notice.queue('Amigo actualizado')}
          onDelete={handleDelete}
          onClosed={handleClosed}
        />
      ) : null}
    </Screen>
  );
}

export function FriendsScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/split-expenses'));

  return (
    <SensitiveGate module="split-expenses" onBack={goBack}>
      <FriendsContent onBack={goBack} />
    </SensitiveGate>
  );
}
