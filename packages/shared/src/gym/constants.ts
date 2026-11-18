export const GYM_PLAN_STATUSES = ['ACTIVE', 'ARCHIVED'] as const satisfies readonly string[];

export type GymPlanStatus = (typeof GYM_PLAN_STATUSES)[number];

/** Días de un plan, de lunes a domingo: el plan los devuelve siempre en este orden. */
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

/** Display labels (Spanish) */
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

/** Tope de ids al reordenar un día: más ejercicios que esto en un solo día no es un uso real. */
export const GYM_DAY_EXERCISES_MAX = 200;

export const GYM_CATALOG_DEFAULT_LIMIT = 10;
export const GYM_CATALOG_MAX_LIMIT = 20;
