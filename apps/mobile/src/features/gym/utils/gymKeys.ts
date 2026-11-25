import { gymPlansKey } from '@omni/shared/gym';
import { unstable_serialize } from 'swr/infinite';

import type { GymPlanStatus } from '@omni/shared/gym';

export const GYM_PLANS_LIST_PAGE_SIZE = 50;

/**
 * Key con la que `useSWRInfinite` guarda las páginas de "Tus planes" de un estado: el `mutate` con filtro de SWR no
 * recorre las keys `$inf$`, así que se invalidan por nombre.
 */
export function gymPlansPagesKey(status: GymPlanStatus): string {
  return unstable_serialize(() => gymPlansKey(status, 1, GYM_PLANS_LIST_PAGE_SIZE));
}
