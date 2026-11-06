import { FC, useRef, useState } from 'react';
import { Paper } from '@mantine/core';

import { confirm, ErrorState, getErrorMessage, LoadingState, notifyError, notifySuccess } from '@/shared/ui';

import { useSplitExpensesMutations } from '../../../hooks/useSplitExpensesMutations';
import { useGathering } from '../hooks/useGathering';
import { GatheringFeed } from './GatheringFeed/GatheringFeed';
import { SettlePanel } from './SettlePanel/SettlePanel';

import type { AddGatheringExpensePayload, GatheringExpense } from '@omni/shared/split-expenses';

interface GatheringWorkspaceProps {
  gatheringId: string;
}

/**
 * Paneles central y derecho de la juntada elegida: carga el detalle, orquesta las acciones (agregar y borrar gasto,
 * saldar o reabrir, eliminar) y muestra el error de la carga con reintento en lugar de los paneles.
 */
export const GatheringWorkspace: FC<GatheringWorkspaceProps> = ({ gatheringId }) => {
  const [settleLoading, setSettleLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingGathering = useRef(false);
  const deletingExpenseIds = useRef(new Set<string>());

  const { gathering, isLoading, error, mutate } = useGathering(gatheringId);
  const { addGatheringExpense, deleteGatheringExpense, toggleGatheringSettled, deleteGathering } =
    useSplitExpensesMutations();

  if (error) {
    return (
      <Paper style={{ flex: '999 1 21rem' }}>
        <ErrorState message="No se pudo cargar la juntada" onRetry={() => mutate()} />
      </Paper>
    );
  }

  if (isLoading || !gathering) {
    return (
      <Paper style={{ flex: '999 1 21rem' }}>
        <LoadingState size="sm" />
      </Paper>
    );
  }

  const handleAddExpense = async (payload: AddGatheringExpensePayload) => {
    await addGatheringExpense(gathering.id, payload);
  };

  const handleDeleteExpense = async (expense: GatheringExpense) => {
    if (deletingExpenseIds.current.has(expense.id)) return;
    deletingExpenseIds.current.add(expense.id);

    try {
      const confirmed = await confirm({
        title: 'Eliminar gasto',
        description: `¿Seguro que querés eliminar el gasto de ${expense.participantName}${expense.description ? ` ("${expense.description}")` : ''}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
      });
      if (!confirmed) return;

      await deleteGatheringExpense(gathering.id, expense.id);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el gasto'));
    } finally {
      deletingExpenseIds.current.delete(expense.id);
    }
  };

  const handleToggleSettled = async () => {
    setSettleLoading(true);
    try {
      await toggleGatheringSettled(gathering.id, { isSettled: !gathering.isSettled });
      notifySuccess(gathering.isSettled ? 'Juntada reabierta' : 'Juntada saldada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar la juntada'));
    } finally {
      setSettleLoading(false);
    }
  };

  const handleDeleteGathering = async () => {
    if (deletingGathering.current) return;
    deletingGathering.current = true;

    try {
      const confirmed = await confirm({
        title: 'Eliminar juntada',
        description: `¿Seguro que querés eliminar "${gathering.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
      });
      if (!confirmed) return;

      setDeleting(true);
      await deleteGathering(gathering.id);
      notifySuccess('Juntada eliminada');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar la juntada'));
    } finally {
      deletingGathering.current = false;
      setDeleting(false);
    }
  };

  return (
    <>
      <GatheringFeed
        gathering={gathering}
        deleting={deleting}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
        onDeleteGathering={handleDeleteGathering}
      />
      <SettlePanel gathering={gathering} loading={settleLoading} onToggleSettled={handleToggleSettled} />
    </>
  );
};
