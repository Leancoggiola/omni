import { FC } from 'react';
import { ActionIcon, Button, Group, Menu } from '@mantine/core';

import { PageHeader } from '@/shared/ui';

import type { GymPlanStatus } from '@omni/shared/gym';

import {
  ArchiveIcon,
  BarbellIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TrayArrowUpIcon,
} from '@phosphor-icons/react';

interface GymHeaderProps {
  planStatus: GymPlanStatus | null;
  archiving: boolean;
  disabled: boolean;
  onCreatePlan: () => void;
  onAddExercise: () => void;
  onRename: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

/**
 * Título y acciones del plan elegido. Plan activo: "Nuevo plan", "Agregar ejercicio" y el menú "⋯" (renombrar,
 * archivar, eliminar). Plan archivado: solo "Desarchivar plan" y "Eliminar plan", sin menú. Sin plan elegido solo queda
 * "Nuevo plan".
 */
export const GymHeader: FC<GymHeaderProps> = ({
  planStatus,
  archiving,
  disabled,
  onCreatePlan,
  onAddExercise,
  onRename,
  onToggleArchive,
  onDelete,
}) => {
  const renderActions = () => {
    if (planStatus === 'ARCHIVED') {
      return (
        <Group gap="sm" wrap="wrap">
          <Button
            leftSection={<TrayArrowUpIcon size="1rem" weight="bold" />}
            loading={archiving}
            disabled={disabled}
            onClick={onToggleArchive}
          >
            Desarchivar plan
          </Button>
          <Button variant="outline" color="destructive" disabled={disabled || archiving} onClick={onDelete}>
            Eliminar plan
          </Button>
        </Group>
      );
    }
    if (planStatus === 'ACTIVE') {
      return (
        <Group gap="sm" wrap="wrap">
          <Button variant="outline" disabled={disabled} onClick={onCreatePlan}>
            Nuevo plan
          </Button>
          <Button leftSection={<PlusIcon size="1rem" weight="bold" />} disabled={disabled} onClick={onAddExercise}>
            Agregar ejercicio
          </Button>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="light" size="lg" aria-label="Acciones del plan" disabled={disabled || archiving}>
                <DotsThreeIcon size="1.25rem" weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<PencilSimpleIcon size="1rem" />} onClick={onRename}>
                Renombrar plan
              </Menu.Item>
              <Menu.Item leftSection={<ArchiveIcon size="1rem" />} onClick={onToggleArchive}>
                Archivar plan
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="destructive" leftSection={<TrashIcon size="1rem" />} onClick={onDelete}>
                Eliminar plan
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      );
    }
    return (
      <Button leftSection={<PlusIcon size="1rem" weight="bold" />} disabled={disabled} onClick={onCreatePlan}>
        Nuevo plan
      </Button>
    );
  };

  return (
    <PageHeader
      icon={<BarbellIcon size="1.5rem" />}
      title="Tu gimnasio"
      accent="gimnasio"
      subtitle={
        planStatus === 'ARCHIVED'
          ? 'Archivado · solo lectura'
          : 'Tus planes por día de la semana y el peso de cada ejercicio'
      }
      actions={renderActions()}
    />
  );
};
