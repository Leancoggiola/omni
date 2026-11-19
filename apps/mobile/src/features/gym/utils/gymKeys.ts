import { API_KEYS, buildQueryString } from '@/shared/api';

import type { GymPlanStatus } from '@omni/shared/gym';

export const GYM_PLANS_PAGE_LIMIT = 100;
export const GYM_PLANS_LIST_PAGE_SIZE = 50;

/** Lista de planes, con o sin filtro de estado, de a `GYM_PLANS_PAGE_LIMIT` (`useGymPlans` junta todas las páginas). */
export function gymPlansKey(status?: GymPlanStatus, page?: number, limit: number = GYM_PLANS_PAGE_LIMIT): string {
  return `${API_KEYS.gym.plans}${buildQueryString({ limit, page, status })}`;
}

/**
 * Keys del gimnasio que cambian con una escritura: planes (lista y detalle), catálogo e historial de peso. La variante
 * del catálogo es compartida entre planes, así que una escritura puede cambiar lo que muestra cualquier otro plan.
 * Equivale a `isPantryKey` de `@omni/shared/pantry`; web tiene la suya en `gymCache.ts`.
 */
export function isGymKey(key: unknown): boolean {
  if (typeof key !== 'string') return false;
  return key.startsWith(API_KEYS.gym.plans) || key.startsWith(API_KEYS.gym.exercises);
}
