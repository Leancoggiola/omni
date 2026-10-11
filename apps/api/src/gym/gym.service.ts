import type {
  AddGymExercisePayload,
  CreateGymPlanPayload,
  GymExercise,
  GymPlanDetail,
  GymPlanSummary,
  ListGymPlansParams,
  UpdateGymExercisePayload,
  UpdateGymExerciseWeightPayload,
} from '@omni/shared/gym';
import type { GymPlan, GymPlanDay, GymExercise as PrismaGymExercise } from '../generated/prisma/client';

import { prisma } from '../common/db';
import { decimalToNumber, toIsoDateTimeString } from '../common/utils/lifestyle';
import { paginationSkipTake } from '@omni/shared/common';

const planDetailInclude = {
  days: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      exercises: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
};

function mapExercise(row: PrismaGymExercise): GymExercise {
  return {
    id: row.id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    currentWeightKg: decimalToNumber(row.currentWeightKg),
    sortOrder: row.sortOrder,
  };
}

function mapPlanDetail(plan: GymPlan & { days: (GymPlanDay & { exercises: PrismaGymExercise[] })[] }): GymPlanDetail {
  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    createdAt: toIsoDateTimeString(plan.createdAt),
    archivedAt: plan.archivedAt ? toIsoDateTimeString(plan.archivedAt) : null,
    days: plan.days.map(day => ({
      id: day.id,
      label: day.label,
      sortOrder: day.sortOrder,
      exercises: day.exercises.map(mapExercise),
    })),
  };
}

async function getOwnedPlan(userId: string, planId: string) {
  const plan = await prisma.gymPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw { status: 404, message: 'Plan no encontrado' };
  return plan;
}

async function getOwnedActivePlan(userId: string, planId: string) {
  const plan = await getOwnedPlan(userId, planId);
  if (plan.status === 'ARCHIVED') {
    throw { status: 409, message: 'El plan está archivado' };
  }
  return plan;
}

async function findOrCreateDay(planId: string, dayLabel: string) {
  const label = dayLabel.trim();
  const existing = await prisma.gymPlanDay.findUnique({
    where: { planId_label: { planId, label } },
  });
  if (existing) return existing;

  const maxOrder = await prisma.gymPlanDay.aggregate({
    where: { planId },
    _max: { sortOrder: true },
  });

  return prisma.gymPlanDay.create({
    data: {
      planId,
      label,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

async function getPlanDetail(userId: string, planId: string): Promise<GymPlanDetail> {
  const plan = await prisma.gymPlan.findFirst({
    where: { id: planId, userId },
    include: planDetailInclude,
  });
  if (!plan) throw { status: 404, message: 'Plan no encontrado' };
  return mapPlanDetail(plan);
}

async function getOwnedExercise(userId: string, exerciseId: string) {
  const exercise = await prisma.gymExercise.findFirst({
    where: { id: exerciseId, day: { plan: { userId } } },
    include: { day: { include: { plan: true } } },
  });
  if (!exercise) throw { status: 404, message: 'Ejercicio no encontrado' };
  return exercise;
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

export async function getPlan(userId: string, planId: string) {
  return getPlanDetail(userId, planId);
}

export async function createPlan(userId: string, dto: CreateGymPlanPayload) {
  const plan = await prisma.gymPlan.create({
    data: { userId, name: dto.name ?? null },
    include: planDetailInclude,
  });
  return mapPlanDetail(plan);
}

export async function archivePlan(userId: string, planId: string) {
  await getOwnedPlan(userId, planId);
  const plan = await prisma.gymPlan.update({
    where: { id: planId },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
    include: planDetailInclude,
  });
  return mapPlanDetail(plan);
}

export async function addExercise(userId: string, dto: AddGymExercisePayload) {
  await getOwnedActivePlan(userId, dto.planId);
  const day = await findOrCreateDay(dto.planId, dto.dayLabel);

  const maxOrder = await prisma.gymExercise.aggregate({
    where: { dayId: day.id },
    _max: { sortOrder: true },
  });

  await prisma.gymExercise.create({
    data: {
      dayId: day.id,
      name: dto.name.trim(),
      sets: dto.sets ?? null,
      reps: dto.reps.trim(),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return getPlanDetail(userId, dto.planId);
}

export async function updateExercise(userId: string, exerciseId: string, dto: UpdateGymExercisePayload) {
  const exercise = await getOwnedExercise(userId, exerciseId);
  if (exercise.day.plan.status === 'ARCHIVED') {
    throw { status: 409, message: 'El plan está archivado' };
  }

  let dayId = exercise.dayId;
  if (dto.dayLabel && dto.dayLabel.trim() !== exercise.day.label) {
    const day = await findOrCreateDay(exercise.day.planId, dto.dayLabel);
    dayId = day.id;
  }

  await prisma.gymExercise.update({
    where: { id: exerciseId },
    data: {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.sets !== undefined && { sets: dto.sets }),
      ...(dto.reps !== undefined && { reps: dto.reps.trim() }),
      ...(dayId !== exercise.dayId && { dayId }),
    },
  });

  return getPlanDetail(userId, exercise.day.planId);
}

export async function updateExerciseWeight(userId: string, exerciseId: string, dto: UpdateGymExerciseWeightPayload) {
  const exercise = await getOwnedExercise(userId, exerciseId);
  if (exercise.day.plan.status === 'ARCHIVED') {
    throw { status: 409, message: 'El plan está archivado' };
  }

  const updated = await prisma.gymExercise.update({
    where: { id: exerciseId },
    data: { currentWeightKg: dto.weightKg },
  });

  return mapExercise(updated);
}

export async function deleteExercise(userId: string, exerciseId: string) {
  const exercise = await getOwnedExercise(userId, exerciseId);
  const planId = exercise.day.planId;
  const dayId = exercise.dayId;

  await prisma.gymExercise.delete({ where: { id: exerciseId } });

  const remainingInDay = await prisma.gymExercise.count({ where: { dayId } });
  if (remainingInDay === 0) {
    await prisma.gymPlanDay.delete({ where: { id: dayId } });
  }

  const remainingInPlan = await prisma.gymExercise.count({
    where: { day: { planId } },
  });

  if (remainingInPlan === 0) {
    await prisma.gymPlan.delete({ where: { id: planId } });
  }
}
