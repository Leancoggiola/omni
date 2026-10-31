import type { Role, User } from '../generated/prisma/client';
import type { CreateUserPayload } from '@omni/shared/auth';
import type { ChangePasswordPayload, UpdateProfilePayload, UpdatePreferencesPayload } from '@omni/shared/users';
import * as bcrypt from 'bcrypt';
import { lockUserSessions, prisma } from '../common/db';
import { hashPassword } from '../common/utils/password';
import { HttpError } from '../common/http';
import { detachForAccountDeletion } from '../household/household.service';

export async function create(dto: Omit<CreateUserPayload, 'role'> & { password: string; role?: Role }): Promise<User> {
  return prisma.user.create({
    data: {
      username: dto.username.toLowerCase(),
      name: dto.name,
      email: dto.email?.toLowerCase() ?? null,
      password: dto.password,
      role: dto.role ?? 'USER',
      householdMember: { create: { household: { create: {} } } },
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
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    omit: { password: true },
    include: { preferences: true },
  });
}

export async function getProfile(userId: string) {
  const user = await findById(userId);

  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
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

/**
 * Exige la contraseña actual (400 si no coincide: un 401 haría que los clientes intenten renovar la sesión) y la
 * verifica dentro del lock de sesiones, contra la contraseña vigente. Si la cuenta ya no existe responde 401: la sesión
 * dejó de ser válida y el cliente debe cerrarla.
 * Revoca todas las sesiones en la misma transacción: ningún refresh token emitido antes del cambio sigue valiendo.
 * La contraseña nueva (`newPasswordSchema`, compartida con el alta de usuario) tiene tope de 72 caracteres porque bcrypt
 * trunca en silencio lo que pasa de ese largo.
 * La contraseña nueva se hashea antes de tomar el lock para que dure solo el `compare` y las escrituras; el hash que se
 * descarta con una actual incorrecta lo acota el `passwordLimiter` de la ruta.
 */
export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordPayload) {
  const hashedPassword = await hashPassword(newPassword);

  await prisma.$transaction(async tx => {
    await lockUserSessions(tx, userId);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new HttpError(401, 'Usuario no encontrado');
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new HttpError(400, 'La contraseña actual es incorrecta');
    }
    await tx.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    await tx.refreshToken.deleteMany({ where: { userId } });
  });
}

/** Estando vinculada equivale a desvincular: el hogar sigue con la otra persona y solo desaparece si era la última. */
export async function deleteAccount(userId: string) {
  await prisma.$transaction(async tx => {
    await detachForAccountDeletion(tx, userId);
    await tx.user.deleteMany({ where: { id: userId } });
  });
}

export async function updatePreferences(userId: string, dto: UpdatePreferencesPayload) {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...dto },
    update: dto,
  });
}
