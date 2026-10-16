import { describe, expect, it } from 'vitest';

import {
  AMOUNT_MAX_8_2,
  AMOUNT_MAX_10_2,
  AMOUNT_MAX_12_2,
  idParamsSchema,
  isoDateStringSchema,
} from '@omni/shared/common';
import { refreshTokenBodySchema } from '@omni/shared/auth';
import {
  completeExpenseReminderSchema,
  createExpenseReminderSchema,
  createPersonalExpenseSchema,
  updatePersonalExpenseSchema,
} from '@omni/shared/expenses';
import { paginationSchema } from '@omni/shared/common';
import { addGymExerciseSchema, updateGymExerciseWeightSchema } from '@omni/shared/gym';
import { addMediaFormSchema, addMediaItemSchema, searchMediaSchema } from '@omni/shared/media';
import { registerNotificationDeviceSchema } from '@omni/shared/notifications';
import {
  addShoppingListItemSchema,
  completeShoppingListItemSchema,
  createPantryProductSchema,
  listPantryProductsSchema,
} from '@omni/shared/pantry';
import { addGatheringExpenseSchema, createGatheringSchema } from '@omni/shared/split-expenses';

describe('isoDateStringSchema', () => {
  it.each(['2026-02-31', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-1-1', 'ayer'])(
    'rechaza %s',
    value => {
      expect(isoDateStringSchema.safeParse(value).success).toBe(false);
    }
  );

  it.each(['0050-03-01', '1899-12-31', '2201-01-01'])('rechaza el año fuera de rango en %s', value => {
    expect(isoDateStringSchema.safeParse(value).success).toBe(false);
  });

  it.each(['2026-02-28', '2024-02-29', '2026-12-31', '1900-01-01'])('acepta %s', value => {
    expect(isoDateStringSchema.safeParse(value).success).toBe(true);
  });

  it('se aplica en los schemas que reciben fechas', () => {
    const expense = { concept: 'Luz', amount: 10, category: 'HOME', date: '2026-02-28' };
    const reminder = { title: 'Luz', dueDate: '2026-02-28', recurrence: 'ONCE' };
    const gathering = { name: 'Asado', date: '2026-02-28', participants: [{ name: 'A' }] };

    expect(createPersonalExpenseSchema.safeParse(expense).success).toBe(true);
    expect(createExpenseReminderSchema.safeParse(reminder).success).toBe(true);
    expect(createGatheringSchema.safeParse(gathering).success).toBe(true);

    expect(createPersonalExpenseSchema.safeParse({ ...expense, date: '2026-02-31' }).success).toBe(false);
    expect(createExpenseReminderSchema.safeParse({ ...reminder, dueDate: '2026-02-31' }).success).toBe(false);
    expect(createGatheringSchema.safeParse({ ...gathering, date: '2026-02-31' }).success).toBe(false);
  });
});

describe('importes', () => {
  const expense = { concept: 'Luz', amount: 10, category: 'HOME', date: '2026-02-20' };

  it('rechaza 1e15 y acepta el máximo de Decimal(12,2)', () => {
    expect(createPersonalExpenseSchema.safeParse({ ...expense, amount: 1e15 }).success).toBe(false);
    expect(createPersonalExpenseSchema.safeParse({ ...expense, amount: AMOUNT_MAX_12_2 + 1 }).success).toBe(false);
    expect(createPersonalExpenseSchema.safeParse({ ...expense, amount: AMOUNT_MAX_12_2 }).success).toBe(true);
    expect(updatePersonalExpenseSchema.safeParse({ amount: 10 }).success).toBe(true);
    expect(updatePersonalExpenseSchema.safeParse({ amount: 1e15 }).success).toBe(false);
    expect(completeExpenseReminderSchema.safeParse({ amount: 10, category: 'HOME' }).success).toBe(true);
    expect(completeExpenseReminderSchema.safeParse({ amount: 1e15, category: 'HOME' }).success).toBe(false);
    expect(addGatheringExpenseSchema.safeParse({ participantId: 'p1', amount: 10 }).success).toBe(true);
    expect(addGatheringExpenseSchema.safeParse({ participantId: 'p1', amount: 1e15 }).success).toBe(false);
  });

  it('respeta Decimal(10,2) en las cantidades de despensa', () => {
    const product = { name: 'Leche', category: 'DAIRY', unit: 'UNITS', quantity: 1 };
    expect(createPantryProductSchema.safeParse({ ...product, quantity: AMOUNT_MAX_10_2 }).success).toBe(true);
    expect(createPantryProductSchema.safeParse({ ...product, quantity: AMOUNT_MAX_10_2 + 1 }).success).toBe(false);
    expect(createPantryProductSchema.safeParse({ ...product, minQuantity: 1e15 }).success).toBe(false);
    expect(addShoppingListItemSchema.safeParse({ pantryProductId: 'p1', quantityToBuy: 1 }).success).toBe(true);
    expect(addShoppingListItemSchema.safeParse({ pantryProductId: 'p1', quantityToBuy: 1e15 }).success).toBe(false);
    expect(completeShoppingListItemSchema.safeParse({ quantityPurchased: 1 }).success).toBe(true);
    expect(completeShoppingListItemSchema.safeParse({ quantityPurchased: 1e15 }).success).toBe(false);
  });

  it('respeta Decimal(8,2) en el peso del gimnasio', () => {
    expect(updateGymExerciseWeightSchema.safeParse({ weightKg: AMOUNT_MAX_8_2 }).success).toBe(true);
    expect(updateGymExerciseWeightSchema.safeParse({ weightKg: AMOUNT_MAX_8_2 + 1 }).success).toBe(false);
  });
});

describe('cotas de entrada', () => {
  it('limita los participantes de una juntada', () => {
    const participants = (count: number) => Array.from({ length: count }, (_, index) => ({ name: `Amigo ${index}` }));
    const gathering = { name: 'Asado', date: '2026-02-20' };
    expect(createGatheringSchema.safeParse({ ...gathering, participants: participants(50) }).success).toBe(true);
    expect(createGatheringSchema.safeParse({ ...gathering, participants: participants(51) }).success).toBe(false);
  });

  it('exige un tmdbId positivo', () => {
    expect(addMediaItemSchema.safeParse({ tmdbId: -1, mediaType: 'movie' }).success).toBe(false);
    expect(addMediaItemSchema.safeParse({ tmdbId: 0, mediaType: 'movie' }).success).toBe(false);
    expect(addMediaItemSchema.safeParse({ tmdbId: 550, mediaType: 'movie' }).success).toBe(true);
    expect(
      addMediaFormSchema.safeParse({ titleQuery: '', tmdbId: -5, mediaType: 'movie', status: 'to_watch' }).success
    ).toBe(false);
  });

  it('limita el largo de búsquedas, tokens e ids', () => {
    const long = 'a'.repeat(5000);
    expect(searchMediaSchema.safeParse({ query: 'fight' }).success).toBe(true);
    expect(registerNotificationDeviceSchema.safeParse({ platform: 'WEB', token: 'abc' }).success).toBe(true);
    expect(refreshTokenBodySchema.safeParse({ refreshToken: 'abc' }).success).toBe(true);
    expect(addGatheringExpenseSchema.safeParse({ participantId: 'p1', amount: 1 }).success).toBe(true);
    expect(searchMediaSchema.safeParse({ query: long }).success).toBe(false);
    expect(listPantryProductsSchema.safeParse({ q: long }).success).toBe(false);
    expect(registerNotificationDeviceSchema.safeParse({ platform: 'WEB', token: long }).success).toBe(false);
    expect(refreshTokenBodySchema.safeParse({ refreshToken: long }).success).toBe(false);
    expect(addShoppingListItemSchema.safeParse({ pantryProductId: long, quantityToBuy: 1 }).success).toBe(false);
    expect(addGatheringExpenseSchema.safeParse({ participantId: long, amount: 1 }).success).toBe(false);
  });
});

describe('enteros de Postgres', () => {
  it('acota tmdbId al máximo de un INT4', () => {
    expect(addMediaItemSchema.safeParse({ tmdbId: 2_147_483_647, mediaType: 'movie' }).success).toBe(true);
    expect(addMediaItemSchema.safeParse({ tmdbId: 3_000_000_000, mediaType: 'movie' }).success).toBe(false);
  });

  it('acota las series de un ejercicio', () => {
    const exercise = { planId: 'p1', dayLabel: 'Lunes', name: 'Sentadilla', reps: '10' };
    expect(addGymExerciseSchema.safeParse({ ...exercise, sets: 4 }).success).toBe(true);
    expect(addGymExerciseSchema.safeParse({ ...exercise, sets: 3e9 }).success).toBe(false);
  });

  it('acota la página de un listado', () => {
    expect(paginationSchema.safeParse({ page: '10000' }).success).toBe(true);
    expect(paginationSchema.safeParse({ page: '999999999999' }).success).toBe(false);
  });
});

describe('idParamsSchema', () => {
  it('valida cada parámetro indicado', () => {
    const schema = idParamsSchema('gatheringId', 'expenseId');
    expect(schema.safeParse({ gatheringId: 'abc', expenseId: 'def' }).success).toBe(true);
    expect(schema.safeParse({ gatheringId: 'abc' }).success).toBe(false);
    expect(schema.safeParse({ gatheringId: '', expenseId: 'def' }).success).toBe(false);
    expect(schema.safeParse({ gatheringId: 'a'.repeat(65), expenseId: 'def' }).success).toBe(false);
  });
});
