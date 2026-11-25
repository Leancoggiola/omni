import type { GymPlanSummary } from '@omni/shared/gym';

/**
 * Plan que abre la pantalla del gimnasio: el último elegido si sigue existiendo; si no, el primero de la lista (la API
 * ordena primero los activos, del más nuevo al más viejo). `undefined` mientras falta el guardado o la lista; `null`
 * si no hay planes.
 */
export function resolvePlanId(
  lastPlanId: string | null | undefined,
  plans: readonly GymPlanSummary[] | undefined
): string | null | undefined {
  if (lastPlanId === undefined || plans === undefined) return undefined;
  if (lastPlanId && plans.some(plan => plan.id === lastPlanId)) return lastPlanId;
  return plans[0]?.id ?? null;
}
