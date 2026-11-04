// tamagui-ignore
import { SPACING } from '@omni/shared/theme';
import { Redirect, useRouter } from 'expo-router';
import { GearIcon, UsersIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';
import { Paragraph, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';
import {
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  Screen,
  ScreenHeader,
  usePullToRefresh,
} from '@/shared/ui';

import { CreateUserFab, FAB_SIZE } from './components/CreateUserFab';
import { CreateUserSheet } from './components/CreateUserSheet';
import { UserRow } from './components/UserRow';
import { useAdminUserMutations } from './hooks/useAdminUserMutations';
import { useAdminUsers } from './hooks/useAdminUsers';

import type { AdminUser } from '@omni/shared/users';

/**
 * Administración: ruta de stack solo para ADMIN (= `AdminRoute` de web). Un USER que llega por link vuelve a Inicio.
 */
export function AdminScreen() {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') return <Redirect href="/" />;

  return <AdminUsersScreen />;
}

function AdminUsersScreen() {
  const router = useRouter();
  const { users, isLoading, error, mutate } = useAdminUsers();
  const { createUser, deleteUser } = useAdminUserMutations();
  const refreshControl = usePullToRefresh(mutate);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = useRef(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const openCreate = () => {
    setCreateKey(key => key + 1);
    setCreateOpen(true);
  };

  const handleDelete = useCallback(
    async (target: AdminUser) => {
      if (deleting.current) return;
      deleting.current = true;
      try {
        const confirmed = await confirm({
          title: 'Eliminar usuario',
          description: `¿Seguro que querés eliminar a "${target.name}" (@${target.username})? Se borrarán también todos sus datos (medios, gimnasio, alacena, gastos y más). Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar usuario',
          cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;

        setDeletingId(target.id);
        try {
          await deleteUser(target.id);
          notifySuccess('Usuario eliminado');
        } catch (err) {
          notifyError(getErrorMessage(err, 'No se pudo eliminar el usuario'));
        } finally {
          setDeletingId(null);
        }
      } finally {
        deleting.current = false;
      }
    },
    [deleteUser]
  );

  const onDeletePress = useCallback((target: AdminUser) => void handleDelete(target), [handleDelete]);
  const renderItem = useCallback<ListRenderItem<AdminUser>>(
    ({ item }) => <UserRow user={item} deleting={deletingId === item.id} onDeletePress={onDeletePress} />,
    [deletingId, onDeletePress]
  );

  const renderEmpty = () => {
    if (error) return <ErrorState message="No se pudieron cargar los usuarios" onRetry={() => void mutate()} />;
    if (isLoading) return <LoadingState variant="skeleton" rows={4} />;
    return <EmptyState icon={UsersIcon} title="Todavía no hay usuarios" />;
  };

  return (
    <Screen insetBottom>
      <FlatList
        data={error ? [] : users}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        extraData={deletingId}
        ListHeaderComponent={
          <YStack gap={SPACING.md} paddingBottom={SPACING.md}>
            <ScreenHeader
              icon={GearIcon}
              title="Administración"
              subtitle="Gestión de usuarios"
              size="lg"
              onBack={goBack}
              backLabel="Volver a Más"
            />
            {!error && !isLoading ? (
              <Paragraph color="$dimmed">{`${users.length} ${users.length === 1 ? 'usuario' : 'usuarios'}`}</Paragraph>
            ) : null}
          </YStack>
        }
        ListEmptyComponent={renderEmpty()}
        ItemSeparatorComponent={Separator}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: FAB_SIZE + SPACING.md * 2 }}
        showsVerticalScrollIndicator={false}
      />
      <CreateUserFab onPress={openCreate} />
      <CreateUserSheet key={createKey} open={createOpen} onOpenChange={setCreateOpen} onCreate={createUser} />
    </Screen>
  );
}

function Separator() {
  return <YStack height={SPACING.sm} />;
}
