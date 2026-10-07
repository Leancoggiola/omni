import type { User } from '../generated/prisma/client';
import type { CreateUserPayload } from '@omni/shared/auth';
import type { UpdateProfilePayload, UpdatePreferencesPayload } from '@omni/shared/users';
import * as bcrypt from 'bcrypt';
import { prisma } from '../common/db';

const BCRYPT_ROUNDS = 12;

export async function create(
  dto: Omit<CreateUserPayload, 'role'> & { password: string; role?: string }
): Promise<User> {
  return prisma.user.create({
    data: {
      username: dto.username.toLowerCase(),
      name: dto.name,
      email: dto.email ?? null,
      password: dto.password,
      role: (dto.role as 'ADMIN' | 'USER') ?? 'USER',
    },
  });
}

/** Returns user WITH password (for auth validation). */
export async function findByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
}

/** Returns user WITH password and preferences: login valida y arma la sesión con un solo query. */
export async function findByUsernameForLogin(username: string) {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: { preferences: true },
  });
}

/** Returns user WITH password (kept for future password recovery via email). */
export async function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    omit: { password: true },
    include: { preferences: true },
  });
}

// ─── Profile ───────────────────────────────────────────────

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: true },
    include: { preferences: true },
  });

  if (!user) {
    throw { status: 404, message: 'Usuario no encontrado' };
  }

  return user;
}

export async function updateProfile(userId: string, dto: UpdateProfilePayload) {
  const data: { phone?: string | null; birthDate?: Date | null } = {};

  if (dto.phone !== undefined) {
    data.phone = dto.phone;
  }
  if (dto.birthDate !== undefined) {
    data.birthDate = dto.birthDate === null ? null : new Date(dto.birthDate);
  }

  if (Object.keys(data).length === 0) {
    return getProfile(userId);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    omit: { password: true },
    include: { preferences: true },
  });
}

// ─── Password ──────────────────────────────────────────────

export async function changePassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

// ─── Delete Account ────────────────────────────────────────

export async function deleteAccount(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

// ─── Preferences ───────────────────────────────────────────

export async function updatePreferences(userId: string, dto: UpdatePreferencesPayload) {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...dto },
    update: dto,
  });
}
