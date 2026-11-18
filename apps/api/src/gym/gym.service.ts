import type {
  AddGymExercisePayload,
  CreateGymPlanPayload,
  GymCatalogExercise,
  GymExercise,
  GymPlanDetail,
  GymPlanSummary,
  GymWeekday,
  GymWeightEntry,
  ListGymPlansParams,
  ListGymWeightHistoryParams,
  ReorderGymDayExercisesPayload,
  SuggestGymCatalogParams,
  UpdateGymDayPayload,
  UpdateGymExercisePayload,
  UpdateGymExerciseWeightPayload,
  UpdateGymPlanPayload,
} from '@omni/shared/gym';
import type { PaginatedResponse } from '@omni/shared/common';
import type {
  GymExerciseWeightEntry,
  GymPlan,
  GymPlanDay,
  GymPlanExercise,
  GymExercise as PrismaCatalogExercise,
  Prisma,
} from '../generated/prisma/client';

import { lockGymUser, prisma, type PrismaTransactionClient } from '../common/db';
import { decimalToNumber, normalizeName, toIsoDateTimeString } from '../common/utils/lifestyle';
import { paginationSkipTake } from '@omni/shared/common';
import { HttpError } from '../common/http';

const ARCHIVED_MESSAGE = 'El plan está archivado';
const EXERCISE_NOT_FOUND = 'Ejercicio no encontrado';

const planDetailInclude = {
  days: {
    orderBy: { weekday: 'asc' },
    include: {
      exercises: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        include: { exercise: true },
      },
    },
  },
} satisfies Prisma.GymPlanInclude;

type PlanExerciseRow = GymPlanExercise & { exercise: PrismaCatalogExercise };
type PlanDetailRow = GymPlan & { days: (GymPlanDay & { exercises: PlanExerciseRow[] })[] };

interface VariantKey {
  nameNormalized: string;
  sets: number | null;
  repsNormalized: string;
}

/** "8 - 12" y "8-12" son las mismas repeticiones, igual que "AMRAP" y "amrap". */
function normalizeReps(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function variantKey(variant: { name: string; sets: number | null; reps: string }): VariantKey {
  return {
    nameNormalized: normalizeName(variant.name),
    sets: variant.sets,
    repsNormalized: normalizeReps(variant.reps),
  };
}

function sameVariantKey(a: VariantKey, b: VariantKey): boolean {
  return a.nameNormalized === b.nameNormalized && a.sets === b.sets && a.repsNormalized === b.repsNormalized;
}

/**
 * `id` es el de la fila del plan (el que usan las rutas `/exercises/:id`); `catalogId` es la variante del catálogo, que
 * comparte nombre, series, repeticiones, peso e historial con los demás planes que la usan.
 */
function mapExercise(row: PlanExerciseRow): GymExercise {
  return {
    id: row.id,
    catalogId: row.exerciseId,
    name: row.exercise.name,
    sets: row.exercise.sets,
    reps: row.exercise.reps,
    currentWeightKg: decimalToNumber(row.exercise.currentWeightKg),
    sortOrder: row.sortOrder,
  };
}

function mapCatalogExercise(row: PrismaCatalogExercise): GymCatalogExercise {
  return {
    id: row.id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    currentWeightKg: decimalToNumber(row.currentWeightKg),
  };
}

function mapWeightEntry(row: GymExerciseWeightEntry): GymWeightEntry {
  return {
    id: row.id,
    weightKg: Number(row.weightKg.toString()),
    sets: row.sets,
    reps: row.reps,
    recordedAt: toIsoDateTimeString(row.recordedAt),
  };
}

function mapPlanDetail(plan: PlanDetailRow): GymPlanDetail {
  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    createdAt: toIsoDateTimeString(plan.createdAt),
    archivedAt: plan.archivedAt ? toIsoDateTimeString(plan.archivedAt) : null,
    days: plan.days.map(day => ({
      id: day.id,
      weekday: day.weekday,
      exercises: day.exercises.map(mapExercise),
    })),
  };
}

function assertActive(plan: Pick<GymPlan, 'status'>) {
  if (plan.status === 'ARCHIVED') throw new HttpError(409, ARCHIVED_MESSAGE);
}

async function getOwnedPlan(db: PrismaTransactionClient, userId: string, planId: string) {
  const plan = await db.gymPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new HttpError(404, 'Plan no encontrado');
  return plan;
}

async function getOwnedActivePlan(db: PrismaTransactionClient, userId: string, planId: string) {
  const plan = await getOwnedPlan(db, userId, planId);
  assertActive(plan);
  return plan;
}

async function getOwnedDay(db: PrismaTransactionClient, userId: string, dayId: string) {
  const day = await db.gymPlanDay.findFirst({
    where: { id: dayId, plan: { userId } },
    include: { plan: true },
  });
  if (!day) throw new HttpError(404, 'Día no encontrado');
  return day;
}

async function getOwnedExercise(db: PrismaTransactionClient, userId: string, exerciseId: string) {
  const exercise = await db.gymPlanExercise.findFirst({
    where: { id: exerciseId, day: { plan: { userId } } },
    include: { day: { include: { plan: true } }, exercise: true },
  });
  if (!exercise) throw new HttpError(404, EXERCISE_NOT_FOUND);
  return exercise;
}

async function findOrCreateDay(db: PrismaTransactionClient, planId: string, weekday: GymWeekday) {
  const existing = await db.gymPlanDay.findUnique({ where: { planId_weekday: { planId, weekday } } });
  return existing ?? db.gymPlanDay.create({ data: { planId, weekday } });
}

function findVariant(db: PrismaTransactionClient, userId: string, key: VariantKey) {
  return db.gymExercise.findFirst({ where: { userId, ...key } });
}

async function nextSortOrder(db: PrismaTransactionClient, dayId: string) {
  const maxOrder = await db.gymPlanExercise.aggregate({ where: { dayId }, _max: { sortOrder: true } });
  return (maxOrder._max.sortOrder ?? -1) + 1;
}

/** Borra el día si se quedó sin ejercicios. El plan nunca se borra por quedar vacío: se archiva a propósito. */
async function pruneEmptyDay(db: PrismaTransactionClient, dayId: string) {
  const remaining = await db.gymPlanExercise.count({ where: { dayId } });
  if (remaining === 0) await db.gymPlanDay.delete({ where: { id: dayId } });
}

/**
 * Borra las variantes del catálogo que ya no usa ningún plan (archivados incluidos), con su historial de peso. Se
 * llama después de borrar un plan, un día o un ejercicio, con las variantes que apuntaban las filas borradas.
 */
async function pruneOrphanVariants(db: PrismaTransactionClient, userId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return;
  await db.gymExercise.deleteMany({
    where: { userId, id: { in: [...new Set(exerciseIds)] }, planExercises: { none: {} } },
  });
}

async function listWeightHistory(
  exerciseId: string,
  params: ListGymWeightHistoryParams
): Promise<PaginatedResponse<GymWeightEntry>> {
  const { skip, take } = paginationSkipTake(params);
  const where = { exerciseId };
  const [rows, total] = await Promise.all([
    prisma.gymExerciseWeightEntry.findMany({
      where,
      skip,
      take,
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.gymExerciseWeightEntry.count({ where }),
  ]);
  return { items: rows.map(mapWeightEntry), total, page: params.page, limit: params.limit };
}

export async function getPlan(userId: string, planId: string): Promise<GymPlanDetail> {
  const plan = await prisma.gymPlan.findFirst({
    where: { id: planId, userId },
    include: planDetailInclude,
  });
  if (!plan) throw new HttpError(404, 'Plan no encontrado');
  return mapPlanDetail(plan);
}

export async function listPlans(userId: string, params: ListGymPlansParams) {
  const { skip, take } = paginationSkipTake(params);
  const where = {
    userId,
    ...(params.status && { status: params.status }),
  };

  const [items, total] = await Promise.all([
    prisma.gymPlan.findMany({
      where,
      skip,
      take,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { days: true } },
        days: { select: { _count: { select: { exercises: true } } } },
      },
    }),
    prisma.gymPlan.count({ where }),
  ]);

  const plans: GymPlanSummary[] = items.map(plan => ({
    id: plan.id,
    name: plan.name,
    status: plan.status,
    createdAt: toIsoDateTimeString(plan.createdAt),
    archivedAt: plan.archivedAt ? toIsoDateTimeString(plan.archivedAt) : null,
    dayCount: plan._count.days,
    exerciseCount: plan.days.reduce((sum, day) => sum + day._count.exercises, 0),
  }));

  return { items: plans, total, page: params.page, limit: params.limit };
}

export async function createPlan(userId: string, dto: CreateGymPlanPayload) {
  const plan = await prisma.gymPlan.create({
    data: { userId, name: dto.name.trim() },
    include: planDetailInclude,
  });
  return mapPlanDetail(plan);
}

export async function updatePlan(userId: string, planId: string, dto: UpdateGymPlanPayload) {
  const plan = await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    await getOwnedActivePlan(tx, userId, planId);
    return tx.gymPlan.update({
      where: { id: planId },
      data: { name: dto.name.trim() },
      include: planDetailInclude,
    });
  });
  return mapPlanDetail(plan);
}

/** Borra el plan con sus días y ejercicios, y las variantes del catálogo que solo usaba este plan. */
export async function deletePlan(userId: string, planId: string) {
  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    await getOwnedPlan(tx, userId, planId);
    const rows = await tx.gymPlanExercise.findMany({ where: { day: { planId } }, select: { exerciseId: true } });
    await tx.gymPlan.delete({ where: { id: planId } });
    await pruneOrphanVariants(
      tx,
      userId,
      rows.map(row => row.exerciseId)
    );
  });
}

/** Idempotente: archivar un plan ya archivado lo devuelve tal cual, sin tocar `archivedAt`. */
export async function archivePlan(userId: string, planId: string) {
  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    await getOwnedPlan(tx, userId, planId);
    await tx.gymPlan.updateMany({
      where: { id: planId, userId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  });
  return getPlan(userId, planId);
}

/** Idempotente: desarchivar un plan activo lo devuelve tal cual. */
export async function unarchivePlan(userId: string, planId: string) {
  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    await getOwnedPlan(tx, userId, planId);
    await tx.gymPlan.updateMany({
      where: { id: planId, userId, status: 'ARCHIVED' },
      data: { status: 'ACTIVE', archivedAt: null },
    });
  });
  return getPlan(userId, planId);
}

/** Pasa el día a otro día de la semana. 409 si el plan ya tiene ese día. */
export async function updateDay(userId: string, dayId: string, dto: UpdateGymDayPayload) {
  const planId = await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const day = await getOwnedDay(tx, userId, dayId);
    assertActive(day.plan);

    if (dto.weekday !== day.weekday) {
      const taken = await tx.gymPlanDay.findUnique({
        where: { planId_weekday: { planId: day.planId, weekday: dto.weekday } },
      });
      if (taken) throw new HttpError(409, 'El plan ya tiene ese día');

      await tx.gymPlanDay.update({ where: { id: dayId }, data: { weekday: dto.weekday } });
    }
    return day.planId;
  });

  return getPlan(userId, planId);
}

/** Borra el día con sus ejercicios, y las variantes del catálogo que ya no usa ningún plan. */
export async function deleteDay(userId: string, dayId: string) {
  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const day = await getOwnedDay(tx, userId, dayId);
    assertActive(day.plan);

    const rows = await tx.gymPlanExercise.findMany({ where: { dayId }, select: { exerciseId: true } });
    await tx.gymPlanDay.delete({ where: { id: dayId } });
    await pruneOrphanVariants(
      tx,
      userId,
      rows.map(row => row.exerciseId)
    );
  });
}

/** Reordena los ejercicios del día. La lista tiene que nombrar exactamente a los ejercicios actuales del día. */
export async function reorderDayExercises(userId: string, dayId: string, dto: ReorderGymDayExercisesPayload) {
  const planId = await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const day = await getOwnedDay(tx, userId, dayId);
    assertActive(day.plan);

    const rows = await tx.gymPlanExercise.findMany({ where: { dayId }, select: { id: true } });
    const current = new Set(rows.map(row => row.id));
    const matches = rows.length === dto.exerciseIds.length && dto.exerciseIds.every(id => current.has(id));
    if (!matches) {
      throw new HttpError(409, 'La lista no coincide con los ejercicios del día');
    }

    await tx.$executeRaw`
      UPDATE "GymPlanExercise" AS p
      SET "sortOrder" = (v.ord - 1)::int, "updatedAt" = now()
      FROM unnest(${dto.exerciseIds}::text[]) WITH ORDINALITY AS v(id, ord)
      WHERE p."id" = v.id`;
    return day.planId;
  });

  return getPlan(userId, planId);
}

/**
 * Agrega un ejercicio al día del plan. Si la variante (nombre + series + repeticiones) ya está en el catálogo, la
 * reutiliza con su peso e historial; si no, la crea. 409 si esa misma variante ya está en ese día.
 */
export async function addExercise(userId: string, dto: AddGymExercisePayload) {
  const variant = { name: dto.name.trim(), sets: dto.sets ?? null, reps: dto.reps.trim() };
  const key = variantKey(variant);

  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    await getOwnedActivePlan(tx, userId, dto.planId);

    const [existingDay, existingVariant] = await Promise.all([
      tx.gymPlanDay.findUnique({ where: { planId_weekday: { planId: dto.planId, weekday: dto.weekday } } }),
      findVariant(tx, userId, key),
    ]);
    if (existingDay && existingVariant) {
      const duplicate = await tx.gymPlanExercise.findUnique({
        where: { dayId_exerciseId: { dayId: existingDay.id, exerciseId: existingVariant.id } },
      });
      if (duplicate) throw new HttpError(409, 'El ejercicio ya está en ese día');
    }

    const day = existingDay ?? (await findOrCreateDay(tx, dto.planId, dto.weekday));
    const catalog = existingVariant ?? (await tx.gymExercise.create({ data: { userId, ...variant, ...key } }));

    await tx.gymPlanExercise.create({
      data: { dayId: day.id, exerciseId: catalog.id, sortOrder: await nextSortOrder(tx, day.id) },
    });
  });

  return getPlan(userId, dto.planId);
}

/**
 * `name`, `sets` y `reps` editan la variante del catálogo, así que el cambio se ve en todos los planes que la usan.
 * Cambiar series o repeticiones con un peso cargado suma una entrada al historial con los valores nuevos. `weekday`
 * mueve solo esta fila al final del día indicado (creándolo si hace falta) y borra el día de origen si quedó vacío.
 */
export async function updateExercise(userId: string, exerciseId: string, dto: UpdateGymExercisePayload) {
  const planId = await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const row = await getOwnedExercise(tx, userId, exerciseId);
    assertActive(row.day.plan);

    const current = row.exercise;
    const next = {
      name: dto.name?.trim() ?? current.name,
      sets: dto.sets !== undefined ? dto.sets : current.sets,
      reps: dto.reps?.trim() ?? current.reps,
    };
    const currentKey = variantKey(current);
    const nextKey = variantKey(next);
    const moveTo = dto.weekday && dto.weekday !== row.day.weekday ? dto.weekday : undefined;

    if (!sameVariantKey(currentKey, nextKey)) {
      const conflict = await findVariant(tx, userId, nextKey);
      if (conflict && conflict.id !== current.id) {
        throw new HttpError(409, 'Ya existe un ejercicio con ese nombre, series y repeticiones');
      }
    }

    const targetDay = moveTo
      ? await tx.gymPlanDay.findUnique({ where: { planId_weekday: { planId: row.day.planId, weekday: moveTo } } })
      : null;
    if (targetDay) {
      const duplicate = await tx.gymPlanExercise.findUnique({
        where: { dayId_exerciseId: { dayId: targetDay.id, exerciseId: current.id } },
      });
      if (duplicate) throw new HttpError(409, 'El ejercicio ya está en ese día');
    }

    if (dto.name !== undefined || dto.sets !== undefined || dto.reps !== undefined) {
      await tx.gymExercise.update({ where: { id: current.id }, data: { ...next, ...nextKey } });

      const setsOrRepsChanged =
        currentKey.sets !== nextKey.sets || currentKey.repsNormalized !== nextKey.repsNormalized;
      if (setsOrRepsChanged && current.currentWeightKg !== null) {
        await tx.gymExerciseWeightEntry.create({
          data: { exerciseId: current.id, weightKg: current.currentWeightKg, sets: next.sets, reps: next.reps },
        });
      }
    }

    if (moveTo) {
      const day = targetDay ?? (await findOrCreateDay(tx, row.day.planId, moveTo));
      await tx.gymPlanExercise.update({
        where: { id: exerciseId },
        data: { dayId: day.id, sortOrder: await nextSortOrder(tx, day.id) },
      });
      await pruneEmptyDay(tx, row.dayId);
    }
    return row.day.planId;
  });

  return getPlan(userId, planId);
}

/**
 * Cambia el peso de la variante (en todos los planes que la usan). Un peso distinto del anterior suma una entrada al
 * historial con las series y repeticiones actuales; borrar el peso (`null`) o repetir el mismo no registra nada.
 */
export async function updateExerciseWeight(userId: string, exerciseId: string, dto: UpdateGymExerciseWeightPayload) {
  return prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const row = await getOwnedExercise(tx, userId, exerciseId);
    assertActive(row.day.plan);

    const catalog = await tx.gymExercise.update({
      where: { id: row.exerciseId },
      data: { currentWeightKg: dto.weightKg },
    });

    const previous = decimalToNumber(row.exercise.currentWeightKg);
    const stored = decimalToNumber(catalog.currentWeightKg);
    if (catalog.currentWeightKg !== null && stored !== previous) {
      await tx.gymExerciseWeightEntry.create({
        data: { exerciseId: catalog.id, weightKg: catalog.currentWeightKg, sets: catalog.sets, reps: catalog.reps },
      });
    }
    return mapExercise({ ...row, exercise: catalog });
  });
}

export async function deleteExercise(userId: string, exerciseId: string) {
  await prisma.$transaction(async tx => {
    await lockGymUser(tx, userId);
    const row = await getOwnedExercise(tx, userId, exerciseId);
    assertActive(row.day.plan);

    await tx.gymPlanExercise.delete({ where: { id: exerciseId } });
    await pruneEmptyDay(tx, row.dayId);
    await pruneOrphanVariants(tx, userId, [row.exerciseId]);
  });
}

/** Historial de la variante de un ejercicio del plan. Se puede leer también con el plan archivado. */
export async function listExerciseWeightHistory(
  userId: string,
  exerciseId: string,
  params: ListGymWeightHistoryParams
) {
  const row = await getOwnedExercise(prisma, userId, exerciseId);
  return listWeightHistory(row.exerciseId, params);
}

export async function listCatalogWeightHistory(userId: string, catalogId: string, params: ListGymWeightHistoryParams) {
  const catalog = await prisma.gymExercise.findFirst({ where: { id: catalogId, userId }, select: { id: true } });
  if (!catalog) throw new HttpError(404, EXERCISE_NOT_FOUND);
  return listWeightHistory(catalog.id, params);
}

/** Variantes del catálogo del usuario, por nombre. Sin `q` devuelve las primeras `limit`. */
export async function suggestCatalog(userId: string, params: SuggestGymCatalogParams): Promise<GymCatalogExercise[]> {
  const rows = await prisma.gymExercise.findMany({
    where: {
      userId,
      ...(params.q && {
        OR: [
          { nameNormalized: { contains: normalizeName(params.q) } },
          { name: { contains: params.q.trim(), mode: 'insensitive' as const } },
        ],
      }),
    },
    take: params.limit,
    orderBy: [{ name: 'asc' }, { sets: 'asc' }, { repsNormalized: 'asc' }],
  });
  return rows.map(mapCatalogExercise);
}
