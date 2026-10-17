import { createHash, randomBytes } from 'node:crypto';
import type {
  NotificationDigest,
  NotificationDevice,
  RegisterNotificationDevicePayload,
} from '@omni/shared/notifications';
import { startOfTodayInAppTz } from '@omni/shared/common';

import { prisma } from '../common/db';
import { toIsoDateString, toIsoDateTimeString } from '../common/utils/lifestyle';
import { loadPantryAlerts } from '../pantry/pantry.service';
import { listUnsettledGatheringDebts } from '../split-expenses/split-expenses.service';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function resolveUserIdFromDeviceToken(bearerToken: string): Promise<string | null> {
  const hash = hashToken(bearerToken);
  const device = await prisma.notificationDevice.findFirst({
    where: { token: hash, isActive: true },
  });
  if (device) {
    await prisma.notificationDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
    return device.userId;
  }
  return null;
}

async function userNotificationsEnabled(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  return prefs?.notifications ?? false;
}

export async function getDigest(userId: string): Promise<NotificationDigest> {
  const today = startOfTodayInAppTz();

  const [pendingReminders, pantryAlerts, splitItems] = await Promise.all([
    prisma.expenseReminder.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
    }),
    loadPantryAlerts(userId, today),
    listUnsettledGatheringDebts(userId),
  ]);

  const overdueReminders = pendingReminders.filter(r => r.dueDate < today);
  const dueTodayReminders = pendingReminders.filter(r => r.dueDate.getTime() === today.getTime());

  const lowStockIds = new Set(pantryAlerts.lowStock.map(p => p.id));
  const pantryItems: NotificationDigest['pantry']['items'] = [
    ...pantryAlerts.lowStock.map(p => ({ id: p.id, name: p.name, reason: 'LOW_STOCK' as const })),
    ...pantryAlerts.expiringSoon
      .filter(p => !lowStockIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, reason: 'EXPIRING' as const })),
  ];

  return {
    generatedAt: toIsoDateTimeString(new Date()),
    userId,
    expenses: {
      overdueCount: overdueReminders.length,
      dueTodayCount: dueTodayReminders.length,
      items: overdueReminders.slice(0, 20).map(r => ({
        id: r.id,
        title: r.title,
        dueDate: toIsoDateString(r.dueDate),
        priority: r.priority,
      })),
    },
    pantry: {
      lowStockCount: pantryItems.filter(i => i.reason === 'LOW_STOCK').length,
      expiringSoonCount: pantryItems.filter(i => i.reason === 'EXPIRING').length,
      items: pantryItems.slice(0, 20),
    },
    splitExpenses: {
      unsettledCount: splitItems.length,
      items: splitItems.slice(0, 20).map(({ id, name, totalAmount }) => ({ id, name, totalAmount })),
    },
  };
}

export async function listDevices(userId: string): Promise<NotificationDevice[]> {
  const rows = await prisma.notificationDevice.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      platform: true,
      label: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  return rows.map(row => ({
    id: row.id,
    platform: row.platform,
    label: row.label,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt ? toIsoDateTimeString(row.lastSeenAt) : null,
    createdAt: toIsoDateTimeString(row.createdAt),
  }));
}

export async function registerDevice(userId: string, dto: RegisterNotificationDevicePayload) {
  let rawToken = dto.token;
  let apiKey: string | undefined;

  if (dto.platform === 'RASPBERRY_PI') {
    rawToken = `omni_pi_${randomBytes(24).toString('hex')}`;
    apiKey = rawToken;
  } else if (!rawToken) {
    throw { status: 400, message: 'El token es obligatorio para WEB y MOBILE' };
  }

  const tokenHash = hashToken(rawToken);

  const device = await prisma.notificationDevice.create({
    data: {
      userId,
      platform: dto.platform,
      token: tokenHash,
      label: dto.label ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  return {
    id: device.id,
    platform: device.platform,
    label: device.label,
    ...(apiKey && { apiKey }),
  };
}

export async function deleteDevice(userId: string, deviceId: string) {
  const device = await prisma.notificationDevice.findFirst({ where: { id: deviceId, userId } });
  if (!device) throw { status: 404, message: 'Dispositivo no encontrado' };
  await prisma.notificationDevice.delete({ where: { id: deviceId } });
}

export async function getDigestForUser(userId: string) {
  const enabled = await userNotificationsEnabled(userId);
  if (!enabled) {
    return {
      generatedAt: toIsoDateTimeString(new Date()),
      userId,
      expenses: { overdueCount: 0, dueTodayCount: 0, items: [] },
      pantry: { lowStockCount: 0, expiringSoonCount: 0, items: [] },
      splitExpenses: { unsettledCount: 0, items: [] },
      notificationsDisabled: true as const,
    };
  }
  return getDigest(userId);
}
