import { API_PATHS, buildQueryString } from '../api/paths';

import { GYM_PLANS_PAGE_LIMIT } from './constants';

import type { GymPlanStatus } from './constants';

/**
 * Lista de planes, con o sin filtro de estado, de a `GYM_PLANS_PAGE_LIMIT` por defecto (el máximo que acepta la API):
 * la usan web y mobile como key de SWR y para pedir cada página.
 */
export function gymPlansKey(status?: GymPlanStatus, page?: number, limit: number = GYM_PLANS_PAGE_LIMIT): string {
  return `${API_PATHS.gym.plans}${buildQueryString({ limit, page, status })}`;
}

/**
 * Keys del gimnasio que cambian con una escritura: planes (lista y detalle), catálogo e historial de peso. La variante
 * del catálogo es compartida entre planes, así que una escritura puede cambiar lo que muestra cualquier otro plan. La
 * usan web y mobile como filtro de `mutate`.
 */
export function isGymKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const { plans, exercises } = API_PATHS.gym;
  return key.startsWith(plans) || key.startsWith(exercises);
}
