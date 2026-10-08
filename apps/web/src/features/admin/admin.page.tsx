import { FC } from 'react';
import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/shared/ui';

import { CreateUserModal, useAdminUserMutations, useAdminUsers, UserRow } from './modules';

import { GearIcon, UserPlusIcon, UsersIcon } from '@phosphor-icons/react';

export const AdminPage: FC = () => {
  const { users, isLoading, error, mutate } = useAdminUsers();
  const { createUser, deleteUser } = useAdminUserMutations();
  const [modalOpened, { open, close }] = useDisclosure(false);

  const createButton = (
    <Button leftSection={<UserPlusIcon size="1rem" aria-hidden />} onClick={open}>
      Crear usuario
    </Button>
  );

  const renderUsers = () => {
    if (error) return <ErrorState message="No se pudieron cargar los usuarios" onRetry={() => mutate()} />;
    if (isLoading) return <LoadingState />;
    if (users.length === 0) {
      return <EmptyState icon={<UsersIcon size="1.5rem" />} title="Todavía no hay usuarios" />;
    }

    return (
      <Stack component="ul" gap="sm" p="none" m="none" style={{ listStyle: 'none' }}>
        {users.map(user => (
          <UserRow key={user.id} user={user} onDelete={deleteUser} />
        ))}
      </Stack>
    );
  };

  return (
    <Stack gap="xl">
      <PageHeader
        icon={<GearIcon size="1.5rem" />}
        title="Administración"
        subtitle="Gestión de usuarios"
        actions={createButton}
      />

      <Paper>
        <Stack gap="md">
          <Group gap="sm" align="baseline">
            <Title order={2} size="h4">
              Usuarios registrados
            </Title>
            {!error && !isLoading && (
              <Text size="sm" c="dimmed">
                {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
              </Text>
            )}
          </Group>
          {renderUsers()}
        </Stack>
      </Paper>

      <CreateUserModal opened={modalOpened} onClose={close} onCreate={createUser} />
    </Stack>
  );
};
