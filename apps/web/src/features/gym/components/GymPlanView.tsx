import { FC, ReactNode, useCallback, useState } from 'react';
import { Alert, Button, SimpleGrid, Stack } from '@mantine/core';

import {
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
} from '@/shared/ui';

import { useGymDayMutations } from '../hooks/useGymDayMutations';
import { useGymExerciseMutations } from '../hooks/useGymExerciseMutations';
import { useGymPlan } from '../hooks/useGymPlan';
import { useGymWriteFailure } from '../hooks/useGymWriteFailure';
import { deleteDayCopy, removeExerciseCopy } from '../utils/gymMessages';
import { getPlanStats } from '../utils/gymPlanStats';
import { weekdayOfDate } from '../utils/gymWeekday';
import { AddExerciseModal } from './AddExerciseModal/AddExerciseModal';
import { ChangeDayModal } from './ChangeDayModal';
import { DayCard } from './DayCard/DayCard';
import { EditExerciseModal } from './EditExerciseModal';
import { GymSummaryCards } from './GymSummaryCards';
import { MoveExerciseModal } from './MoveExerciseModal';
import { WeightModal } from './WeightModal/WeightModal';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { SaveOrderResult } from './DayCard/DayReorderList';
import type {
  AddGymExercisePayload,
  GymExercise,
  GymPlanDay,
  GymWeekday,
  UpdateGymExercisePayload,
} from '@omni/shared/gym';

import { ApiError } from '@omni/shared/api';
import { ArchiveIcon, BarbellIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react';

type Dialog =
  | { kind: 'weight'; exercise: GymExercise; dayLabel: string }
  | { kind: 'edit'; exercise: GymExercise }
  | { kind: 'move'; exercise: GymExercise; weekday: GymWeekday; occupiedWeekdays: GymWeekday[] }
  | { kind: 'changeDay'; day: GymPlanDay; occupiedWeekdays: GymWeekday[] };

interface GymPlanViewProps {
  planId: string;
  toolbar: ReactNode;
  addWeekday: GymWeekday | null;
  orderingDayId: string | null;
  onAddWeekdayChange: (weekday: GymWeekday | null) => void;
  onOrderingDayChange: (dayId: string | null) => void;
  onShowPlans: () => void;
}

/**
 * El plan elegido: contadores, la barra del plan, los días con ejercicios (de lunes a domingo, de a dos columnas) y
 * los modales de peso, alta, edición, mover y cambiar de día. Un plan archivado se ve igual pero con el aviso "Plan
 * archivado" y sin acciones de escritura. Una escritura que falla se resuelve acá: 409 por archivado cierra el
 * modal y deja el plan en solo lectura, otros 409 son un aviso dentro del formulario, un 404 vuelve a pedir el plan.
 * El error de carga se muestra con reintento (o "Plan no encontrado" ante un 404), nunca como plan vacío.
 *
 * Cada escritura corre con `runWrite`: si sale bien avisa y cierra; si falla, `handleFailure` decide: un 409 de
 * formulario vuelve como `conflict` (aviso dentro del formulario) salvo que `asNotice` pida un toast, archivado o
 * inexistente cierran, y la red deja el formulario abierto (ya se avisó con un toast).
 */
export const GymPlanView: FC<GymPlanViewProps> = ({
  planId,
  toolbar,
  addWeekday,
  orderingDayId,
  onAddWeekdayChange,
  onOrderingDayChange,
  onShowPlans,
}) => {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogOpened, setDialogOpened] = useState(false);
  const [reorderKey, setReorderKey] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const { plan, isLoading, error, mutate: retry } = useGymPlan(planId);
  const { addExercise, updateExercise, moveExercise, updateWeight, deleteExercise, reorderDay } =
    useGymExerciseMutations(planId);
  const { changeDay, deleteDay } = useGymDayMutations(planId);
  const handleFailure = useGymWriteFailure(planId);
  const readOnly = plan?.status === 'ARCHIVED';
  const openDialog = useCallback((next: Dialog) => {
    setDialog(next);
    setDialogOpened(true);
  }, []);
  const closeDialog = useCallback(() => setDialogOpened(false), []);

  const runWrite = useCallback(
    async (
      action: () => Promise<void>,
      fallback: string,
      options: { close?: () => void; asNotice?: boolean } = {}
    ): Promise<GymSubmitResult> => {
      try {
        await action();
        options.close?.();
        return { status: 'done' };
      } catch (err) {
        const failure = await handleFailure(err, fallback);
        if (failure === 'conflict') {
          if (!options.asNotice) return { status: 'conflict', message: getErrorMessage(err, fallback) };
          notifyError(getErrorMessage(err, fallback));
          return { status: 'failed' };
        }
        if (failure === 'other') return { status: 'failed' };
        onAddWeekdayChange(null);
        onOrderingDayChange(null);
        options.close?.();
        return { status: 'closed' };
      }
    },
    [handleFailure, onAddWeekdayChange, onOrderingDayChange]
  );

  const findDay = useCallback(
    (exercise: GymExercise) => plan?.days.find(day => day.exercises.some(row => row.id === exercise.id)),
    [plan]
  );
  const occupiedBy = useCallback(
    (exercise: GymExercise) =>
      plan?.days
        .filter(day => day.exercises.some(row => row.catalogId === exercise.catalogId))
        .map(day => day.weekday) ?? [],
    [plan]
  );

  const handleOpenWeight = useCallback(
    (exercise: GymExercise, dayLabel: string) => openDialog({ kind: 'weight', exercise, dayLabel }),
    [openDialog]
  );
  const handleEdit = useCallback((exercise: GymExercise) => openDialog({ kind: 'edit', exercise }), [openDialog]);
  const handleMove = useCallback(
    (exercise: GymExercise) => {
      const day = findDay(exercise);
      if (!day) return;
      openDialog({ kind: 'move', exercise, weekday: day.weekday, occupiedWeekdays: occupiedBy(exercise) });
    },
    [findDay, occupiedBy, openDialog]
  );
  const handleChangeDay = useCallback(
    (day: GymPlanDay) =>
      openDialog({
        kind: 'changeDay',
        day,
        occupiedWeekdays: plan?.days.filter(other => other.id !== day.id).map(other => other.weekday) ?? [],
      }),
    [openDialog, plan]
  );

  const handleSaveWeight = (exercise: GymExercise, weightKg: number | null) =>
    runWrite(
      async () => {
        await updateWeight(exercise.id, weightKg);
        notifySuccess(weightKg === null ? 'Peso quitado' : 'Peso guardado');
      },
      weightKg === null ? 'No se pudo quitar el peso' : 'No se pudo guardar el peso',
      { close: closeDialog, asNotice: true }
    );

  const handleEditSubmit = (exerciseId: string, payload: UpdateGymExercisePayload) =>
    runWrite(
      async () => {
        await updateExercise(exerciseId, payload);
        notifySuccess('Ejercicio actualizado');
      },
      'No se pudo guardar el ejercicio',
      { close: closeDialog }
    );

  const handleMoveSubmit = (exerciseId: string, weekday: GymWeekday) =>
    runWrite(
      async () => {
        await moveExercise(exerciseId, weekday);
        notifySuccess('Ejercicio movido');
      },
      'No se pudo mover el ejercicio',
      { close: closeDialog }
    );

  const handleChangeDaySubmit = (dayId: string, weekday: GymWeekday) =>
    runWrite(
      async () => {
        await changeDay(dayId, weekday);
        notifySuccess('Día cambiado');
      },
      'No se pudo cambiar el día',
      { close: closeDialog }
    );

  const handleAdd = (payload: AddGymExercisePayload) =>
    runWrite(
      async () => {
        await addExercise(payload);
        notifySuccess('Ejercicio agregado');
      },
      'No se pudo agregar el ejercicio',
      { close: () => onAddWeekdayChange(null) }
    );

  const handleRemove = async (exercise: GymExercise) => {
    const day = findDay(exercise);
    if (!plan || !day || deleting) return;
    setDeleting(true);
    try {
      const { title, description } = removeExerciseCopy(plan, day, exercise);
      if (!(await confirm({ title, description, confirmLabel: 'Quitar ejercicio' }))) return;

      await runWrite(
        async () => {
          await deleteExercise(exercise.id);
          notifySuccess('Ejercicio quitado');
        },
        'No se pudo quitar el ejercicio',
        { asNotice: true }
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDay = async (day: GymPlanDay) => {
    if (deleting) return;
    setDeleting(true);
    try {
      const { title, description } = deleteDayCopy(day);
      if (!(await confirm({ title, description, confirmLabel: 'Borrar día' }))) return;

      await runWrite(
        async () => {
          await deleteDay(day.id);
          notifySuccess('Día borrado');
        },
        'No se pudo borrar el día',
        { asNotice: true }
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveOrder = async (day: GymPlanDay, exerciseIds: string[]): Promise<SaveOrderResult> => {
    const result = await runWrite(
      async () => {
        await reorderDay(day.id, exerciseIds);
        notifySuccess('Orden guardado');
      },
      'No se pudo guardar el orden',
      { close: () => onOrderingDayChange(null) }
    );
    if (result.status === 'conflict') return 'conflict';
    if (result.status === 'failed') return 'failed';
    return result.status === 'closed' ? 'closed' : 'saved';
  };

  const handleReloadDay = async () => {
    const fresh = await retry();
    if (!fresh?.days.some(day => day.id === orderingDayId)) onOrderingDayChange(null);
    setReorderKey(key => key + 1);
  };

  const addModal = !readOnly && (
    <AddExerciseModal
      opened={addWeekday !== null}
      onClose={() => onAddWeekdayChange(null)}
      planId={planId}
      weekday={addWeekday ?? weekdayOfDate()}
      onSubmit={handleAdd}
    />
  );

  if (error && (!plan || (error instanceof ApiError && error.status === 404))) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Stack gap="lg">
        {toolbar}
        {notFound ? (
          <EmptyState
            icon={<WarningCircleIcon />}
            title="Plan no encontrado"
            description="Puede que lo hayas borrado desde otro dispositivo."
            action={
              <Button variant="light" onClick={onShowPlans}>
                Ver mis planes
              </Button>
            }
          />
        ) : (
          <ErrorState message="No se pudo cargar tu plan" onRetry={() => retry()} />
        )}
        {addModal}
      </Stack>
    );
  }
  if (isLoading || !plan) {
    return (
      <Stack gap="lg">
        <GymSummaryCards stats={undefined} />
        {toolbar}
        <LoadingState variant="skeleton" rows={4} />
        {addModal}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {error && <ErrorState message="No se pudo actualizar tu plan" onRetry={() => retry()} />}
      {readOnly && (
        <Alert color="warning" icon={<ArchiveIcon size="1.25rem" />} title="Plan archivado">
          Solo podés mirarlo. Para editarlo, desarchivalo.
        </Alert>
      )}
      <GymSummaryCards stats={getPlanStats(plan)} />
      {toolbar}

      {plan.days.length === 0 ? (
        <EmptyState
          icon={<BarbellIcon />}
          title="Este plan está vacío"
          description="Agregá el primer ejercicio y el día se crea solo. Elegís el día de la semana al cargarlo."
          action={
            !readOnly && (
              <Button
                variant="light"
                leftSection={<PlusIcon size="1rem" />}
                onClick={() => onAddWeekdayChange(weekdayOfDate())}
              >
                Agregar ejercicio
              </Button>
            )
          }
        />
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {plan.days.map(day => (
            <DayCard
              key={day.id}
              day={day}
              readOnly={readOnly}
              ordering={orderingDayId === day.id}
              locked={deleting || (orderingDayId !== null && orderingDayId !== day.id)}
              reorderKey={reorderKey}
              onOpenWeight={handleOpenWeight}
              onEdit={handleEdit}
              onMove={handleMove}
              onRemove={exercise => void handleRemove(exercise)}
              onAddToDay={target => onAddWeekdayChange(target.weekday)}
              onStartOrdering={target => onOrderingDayChange(target.id)}
              onChangeDay={handleChangeDay}
              onDeleteDay={target => void handleDeleteDay(target)}
              onSaveOrder={handleSaveOrder}
              onCancelOrdering={() => onOrderingDayChange(null)}
              onReloadDay={handleReloadDay}
            />
          ))}
        </SimpleGrid>
      )}

      <WeightModal
        opened={dialogOpened && dialog?.kind === 'weight'}
        onClose={closeDialog}
        exercise={dialog?.kind === 'weight' ? dialog.exercise : null}
        dayLabel={dialog?.kind === 'weight' ? dialog.dayLabel : ''}
        readOnly={readOnly}
        onSave={handleSaveWeight}
      />
      <EditExerciseModal
        opened={dialogOpened && dialog?.kind === 'edit'}
        exercise={dialog?.kind === 'edit' ? dialog.exercise : null}
        onClose={closeDialog}
        onSubmit={handleEditSubmit}
      />
      <MoveExerciseModal
        opened={dialogOpened && dialog?.kind === 'move'}
        target={dialog?.kind === 'move' ? dialog : null}
        onClose={closeDialog}
        onSubmit={handleMoveSubmit}
      />
      <ChangeDayModal
        opened={dialogOpened && dialog?.kind === 'changeDay'}
        target={dialog?.kind === 'changeDay' ? dialog : null}
        onClose={closeDialog}
        onSubmit={handleChangeDaySubmit}
      />
      {addModal}
    </Stack>
  );
};
