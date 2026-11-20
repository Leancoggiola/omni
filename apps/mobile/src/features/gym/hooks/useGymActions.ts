import { useRouter } from 'expo-router';
import { useRef } from 'react';

import { ApiError } from '@/shared/api';
import { confirm, getErrorMessage, notifyError, notifySuccess, useSheetNotice } from '@/shared/ui';

import { deleteDayCopy, deletePlanCopy, removeExerciseCopy } from '../utils/gymMessages';
import { useGymMutations } from './useGymMutations';
import { useGymWriteFailure } from './useGymWriteFailure';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type {
  AddGymExercisePayload,
  GymExercise,
  GymPlanDay,
  GymPlanDetail,
  GymWeekday,
  UpdateGymExercisePayload,
} from '@omni/shared/gym';

type GymActionsParams = {
  plan: GymPlanDetail | undefined;
  /** El plan abierto: `undefined` mientras se resuelve, `null` si no hay planes. */
  planId: string | null | undefined;
  retry: () => Promise<unknown>;
  setLastPlan: (planId: string | null) => Promise<void>;
};

/**
 * Escrituras de la pantalla del gimnasio y el aviso de lo que pasa mientras una hoja se cierra. Las de hoja
 * (`handleAdd`, `handleEdit`, `handleMove`, `handleChangeDay`, `handleWeight`, `handleNameSubmit`) devuelven un
 * `GymSubmitResult` y encolan el aviso de éxito para cuando la hoja se cierre; si la escritura falla con
 * `useGymWriteFailure` y la hoja tiene que cerrarse, el aviso queda en `closedNotice` y `handleClosed` lo muestra
 * cuando termina de ocultarse. Las de menú (`removeExercise`, `deleteDay`, `archivePlan`, `unarchivePlan`,
 * `deletePlan`) confirman si hace falta y avisan con un toast.
 */
export function useGymActions({ plan, planId, retry, setLastPlan }: GymActionsParams) {
  const router = useRouter();
  const mutations = useGymMutations();
  const handleFailure = useGymWriteFailure(planId ?? null);
  const notice = useSheetNotice();
  const closedNotice = useRef<string | null>(null);

  const handleClosed = () => {
    notice.flush();
    if (!closedNotice.current) return;
    notifyError(closedNotice.current);
    closedNotice.current = null;
  };

  const runSheetWrite = async (
    action: () => Promise<unknown>,
    fallback: string,
    success: string
  ): Promise<GymSubmitResult> => {
    try {
      await action();
      notice.queue(success);
      return { status: 'done' };
    } catch (err) {
      const failure = await handleFailure(err, fallback);
      if (failure.status === 'closed') closedNotice.current = failure.notice;
      return failure.status === 'closed' ? { status: 'closed' } : failure;
    }
  };

  const runPlainWrite = async (action: () => Promise<unknown>, fallback: string, success: string) => {
    try {
      await action();
      notifySuccess(success);
      return true;
    } catch (err) {
      const failure = await handleFailure(err, fallback);
      notifyError(failure.status === 'closed' ? failure.notice : failure.message);
      return false;
    }
  };

  const handleAdd = async (exercise: Omit<AddGymExercisePayload, 'planId'>): Promise<GymSubmitResult> => {
    if (!planId) return { status: 'closed' };
    return runSheetWrite(
      () => mutations.addExercise({ ...exercise, planId }),
      'No se pudo agregar el ejercicio',
      'Ejercicio agregado'
    );
  };

  const handleEdit = (exerciseId: string, payload: UpdateGymExercisePayload) =>
    runSheetWrite(
      () => mutations.updateExercise(exerciseId, payload),
      'No se pudo guardar el ejercicio',
      'Ejercicio actualizado'
    );

  const handleMove = (exerciseId: string, weekday: GymWeekday) =>
    runSheetWrite(
      () => mutations.updateExercise(exerciseId, { weekday }),
      'No se pudo mover el ejercicio',
      'Ejercicio movido'
    );

  const handleChangeDay = (dayId: string, weekday: GymWeekday) =>
    runSheetWrite(() => mutations.changeDay(dayId, weekday), 'No se pudo cambiar el día', 'Día cambiado');

  const handleWeight = (exerciseId: string, weightKg: number | null) =>
    runSheetWrite(
      () => mutations.updateWeight(exerciseId, weightKg),
      weightKg === null ? 'No se pudo quitar el peso' : 'No se pudo guardar el peso',
      weightKg === null ? 'Peso quitado' : 'Peso guardado'
    );

  const handleNameSubmit = async (name: string, mode: 'create' | 'rename'): Promise<GymSubmitResult> => {
    if (mode === 'rename' && !plan) return { status: 'closed' };
    try {
      if (mode === 'rename' && plan) {
        await mutations.renamePlan(plan.id, name);
        notice.queue('Plan renombrado');
      } else {
        const created = await mutations.createPlan(name);
        await setLastPlan(created.id);
        notice.queue('Plan creado');
      }
      return { status: 'done' };
    } catch (err) {
      const message = getErrorMessage(
        err,
        mode === 'rename' ? 'No se pudo renombrar el plan' : 'No se pudo crear el plan'
      );
      if (mode === 'rename' && err instanceof ApiError && (err.status === 404 || err.status === 409)) {
        closedNotice.current = message;
        void retry();
        return { status: 'closed' };
      }
      return { status: 'error', message, conflict: false };
    }
  };

  const removeExercise = async (exercise: GymExercise, day: GymPlanDay) => {
    if (!plan) return;
    const { title, description } = removeExerciseCopy(plan, day, exercise);
    if (!(await confirm({ title, description, confirmLabel: 'Quitar ejercicio', destructive: true }))) return;
    await runPlainWrite(
      () => mutations.removeExercise(exercise.id),
      'No se pudo quitar el ejercicio',
      'Ejercicio quitado'
    );
  };

  const deleteDay = async (day: GymPlanDay) => {
    const { title, description } = deleteDayCopy(day);
    if (!(await confirm({ title, description, confirmLabel: 'Borrar día', destructive: true }))) return;
    await runPlainWrite(() => mutations.deleteDay(day.id), 'No se pudo borrar el día', 'Día borrado');
  };

  const archivePlan = async (target: GymPlanDetail) => {
    await runPlainWrite(
      () => mutations.archivePlan(target.id).then(() => undefined),
      'No se pudo archivar el plan',
      'Plan archivado'
    );
  };

  const unarchivePlan = async (target: GymPlanDetail) => {
    await runPlainWrite(
      () => mutations.unarchivePlan(target.id).then(() => undefined),
      'No se pudo desarchivar el plan',
      'Plan desarchivado'
    );
  };

  const deletePlan = async (target: GymPlanDetail) => {
    const { title, description } = deletePlanCopy(target);
    if (!(await confirm({ title, description, confirmLabel: 'Eliminar plan', destructive: true }))) return;
    const deleted = await runPlainWrite(
      () => mutations.deletePlan(target.id),
      'No se pudo eliminar el plan',
      'Plan eliminado'
    );
    if (!deleted) return;
    await setLastPlan(null);
    router.push('/gym/plans');
  };

  return {
    handleClosed,
    handleAdd,
    handleEdit,
    handleMove,
    handleChangeDay,
    handleWeight,
    handleNameSubmit,
    removeExercise,
    deleteDay,
    archivePlan,
    unarchivePlan,
    deletePlan,
  };
}
