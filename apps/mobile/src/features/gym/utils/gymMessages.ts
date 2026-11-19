import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';

import { formatSetsRepsShort, formatWeightKg } from './gymFormat';

import type { GymExercise, GymPlanDay, GymPlanDetail } from '@omni/shared/gym';

type ConfirmCopy = { title: string; description: string };

const plural = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

/** Texto de confirmar el borrado de un plan; los días y ejercicios se cuentan del detalle. */
export function deletePlanCopy(plan: GymPlanDetail): ConfirmCopy {
  const exerciseCount = plan.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const tail = 'No se puede deshacer.';
  if (exerciseCount === 0) {
    return { title: '¿Eliminar el plan?', description: `Se borra ${plan.name}, que no tiene ejercicios. ${tail}` };
  }
  return {
    title: '¿Eliminar el plan?',
    description:
      `Se borran ${plan.name}, sus ${plural(plan.days.length, 'día', 'días')} y ` +
      `${plural(exerciseCount, 'ejercicio', 'ejercicios')}. Los ejercicios que no uses en otro plan se borran ` +
      `con su peso y su historial. ${tail}`,
  };
}

/**
 * Texto de quitar un ejercicio del día. El cliente no sabe si la variante está en otro plan, por eso dice "si no lo
 * usás…"; si la misma variante sigue en otro día del plan (mismo `catalogId`) se conservan su peso y su historial.
 */
export function removeExerciseCopy(plan: GymPlanDetail, day: GymPlanDay, exercise: GymExercise): ConfirmCopy {
  const dayLabel = GYM_WEEKDAY_LABELS[day.weekday].toLowerCase();
  const otherDay = plan.days.find(
    other => other.id !== day.id && other.exercises.some(row => row.catalogId === exercise.catalogId)
  );
  const lastOfDay = day.exercises.length === 1 ? ` Es el último del ${dayLabel}: el día también se borra.` : '';

  if (otherDay) {
    const otherLabel = GYM_WEEKDAY_LABELS[otherDay.weekday].toLowerCase();
    return {
      title: `¿Quitar ${exercise.name} del ${dayLabel}?`,
      description:
        `Se quita solo de este día. ${exercise.name} ${formatSetsRepsShort(exercise.sets, exercise.reps)} también ` +
        `está en el ${otherLabel}: su peso y su historial se conservan.${lastOfDay}`,
    };
  }

  const weight = exercise.currentWeightKg === null ? '' : ` (${formatWeightKg(exercise.currentWeightKg)})`;
  return {
    title: `¿Quitar ${exercise.name} del ${dayLabel}?`,
    description:
      `Se quita solo de este día. Si no lo usás en otro día ni en otro plan, también se borran su peso${weight} y ` +
      `su historial.${lastOfDay}`,
  };
}

/** Texto de confirmar el borrado de un día entero. */
export function deleteDayCopy(day: GymPlanDay): ConfirmCopy {
  const dayLabel = GYM_WEEKDAY_LABELS[day.weekday].toLowerCase();
  return {
    title: `¿Borrar el ${dayLabel}?`,
    description:
      `Se borran sus ${plural(day.exercises.length, 'ejercicio', 'ejercicios')} de este plan. Los que no uses en ` +
      'otro día ni en otro plan se borran con su peso y su historial.',
  };
}
