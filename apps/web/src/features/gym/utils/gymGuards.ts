import type { GymPlanStatus, GymWeekday } from '@omni/shared/gym';

import { GYM_PLAN_STATUSES, GYM_WEEKDAYS } from '@omni/shared/gym';

/** Si el valor del `Select` es un día de la semana del gimnasio. */
export function isGymWeekday(value: string | null): value is GymWeekday {
  return value !== null && (GYM_WEEKDAYS as readonly string[]).includes(value);
}

/** Si el valor del selector es un estado de plan. */
export function isGymPlanStatus(value: string): value is GymPlanStatus {
  return (GYM_PLAN_STATUSES as readonly string[]).includes(value);
}
