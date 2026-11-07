import { FC } from 'react';
import { Button, Group } from '@mantine/core';

import { PageHeader } from '@/shared/ui';

import { useSplitBalance } from '../hooks/useSplitBalance';
import { describeBalanceSummary } from '../utils/gatheringView';

import { PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';

interface SplitExpensesHeaderProps {
  onOpenFriends: () => void;
  onNewGathering: () => void;
}

/**
 * Cabecera "Gastos compartidos": el subtítulo resume el saldo propio ("Te deben $X · debés $Y", de `GET /balance`);
 * mientras carga muestra la descripción de la sección y si falla lo dice, sin tapar el resto de la página.
 */
export const SplitExpensesHeader: FC<SplitExpensesHeaderProps> = ({ onOpenFriends, onNewGathering }) => {
  const { balance, error } = useSplitBalance();

  const subtitle = error
    ? 'No se pudo cargar tu saldo'
    : balance
      ? describeBalanceSummary(balance)
      : 'Dividí los gastos de tus juntadas fácilmente';

  return (
    <PageHeader
      icon={<UsersThreeIcon size="1.5rem" />}
      title="Gastos compartidos"
      accent="compartidos"
      subtitle={subtitle}
      actions={
        <Group gap="xs">
          <Button
            variant="light"
            size="sm"
            leftSection={<UsersThreeIcon size="1rem" weight="bold" />}
            onClick={onOpenFriends}
          >
            Amigos
          </Button>
          <Button size="sm" leftSection={<PlusIcon size="1rem" weight="bold" />} onClick={onNewGathering}>
            Nueva juntada
          </Button>
        </Group>
      }
    />
  );
};
