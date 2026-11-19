import { z } from 'zod';

import { GYM_PLAN_NAME_MAX } from '@omni/shared/gym';

export interface PlanFormValues {
  name: string;
}

export const planFormSchema: z.ZodType<PlanFormValues> = z.object({
  name: z.string().trim().min(1, 'Ponele un nombre al plan').max(GYM_PLAN_NAME_MAX),
});
