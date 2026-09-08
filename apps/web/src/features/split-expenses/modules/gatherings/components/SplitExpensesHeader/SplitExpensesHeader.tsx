import { FC } from 'react';
import { Button, Group, Stack, Text, Title } from '@mantine/core';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

interface SplitExpensesHeaderProps {
  onOpenFriends: () => void;
  onNewGathering: () => void;
}

export const SplitExpensesHeader: FC<SplitExpensesHeaderProps> = ({ onOpenFriends, onNewGathering }) => {
  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      <Stack gap="3xs">
        <Title order={1}>División de Gastos</Title>
        <Text c="dimmed" size="md">
          Dividí los gastos de tus juntadas fácilmente
        </Text>
      </Stack>
      <Group gap="xs">
        <Button
          variant="default"
          size="sm"
          leftSection={<UsersThreeIcon size="1rem" weight="bold" />}
          onClick={onOpenFriends}
        >
          Amigos
        </Button>
        <Button
          variant="gradient"
          size="sm"
          leftSection={<PlusIcon size="1rem" weight="bold" />}
          onClick={onNewGathering}
        >
          Nueva juntada
        </Button>
      </Group>
    </Group>
  );
};
