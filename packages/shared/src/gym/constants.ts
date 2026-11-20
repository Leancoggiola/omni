export const GYM_PLAN_STATUSES = ['ACTIVE', 'ARCHIVED'] as const satisfies readonly string[];

export type GymPlanStatus = (typeof GYM_PLAN_STATUSES)[number];

export const GYM_WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const satisfies readonly string[];

export type GymWeekday = (typeof GYM_WEEKDAYS)[number];

export const GYM_WEEKDAY_LABELS: Record<GymWeekday, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export const GYM_PLAN_NAME_MAX = 120;
export const GYM_EXERCISE_NAME_MAX = 120;
export const GYM_REPS_MAX = 40;

export const GYM_DAY_EXERCISES_MAX = 200;

export const GYM_CATALOG_DEFAULT_LIMIT = 10;
export const GYM_CATALOG_MAX_LIMIT = 20;

export const GYM_PLANS_PAGE_LIMIT = 100;
