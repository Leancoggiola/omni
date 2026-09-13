import { FC } from 'react';
import { Button, Group } from '@mantine/core';

import { PageHeader } from '@/shared/ui';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

interface SplitExpensesHeaderProps {
  onOpenFriends: () => void;
  onNewGathering: () => void;
}

export const SplitExpensesHeader: FC<SplitExpensesHeaderProps> = ({ onOpenFriends, onNewGathering }) => {
  return (
    <PageHeader
      icon={<UsersThreeIcon size="1.5rem" />}
      title="División de Gastos"
      subtitle="Dividí los gastos de tus juntadas fácilmente"
      actions={
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
      }
    />
  );
};
