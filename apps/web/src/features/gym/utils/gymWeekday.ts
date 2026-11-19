import type { GymWeekday } from '@omni/shared/gym';

import { GYM_WEEKDAYS } from '@omni/shared/gym';

/** `Date.getDay()` arranca en domingo (0): lo pasa a MONDAY…SUNDAY, el orden de `GYM_WEEKDAYS`. */
export function weekdayOfDate(date: Date = new Date()): GymWeekday {
  return GYM_WEEKDAYS[(date.getDay() + 6) % 7]!;
}
