import { prisma } from '../common/db';
import { hashPassword } from '../common/utils/password';
import * as usersService from '../users/users.service';
import type { CreateUserPayload } from '@omni/shared/auth';
import { HttpError } from '../common/http';

export async function createUser(dto: CreateUserPayload) {
  const existing = await usersService.findByUsername(dto.username);
  if (existing) {
    throw new HttpError(409, 'El nombre de usuario ya está en uso');
  }

  if (dto.email) {
    const byEmail = await usersService.findByEmail(dto.email);
    if (byEmail) {
      throw new HttpError(409, 'El correo electrónico ya está en uso');
    }
  }

  const hashedPassword = await hashPassword(dto.password);
  const user = await usersService.create({
    ...dto,
    password: hashedPassword,
  });

  const { password: _password, ...sanitized } = user;
  return sanitized;
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteUser(userId: string, requesterId: string) {
  if (userId === requesterId) {
    throw new HttpError(400, 'No podés eliminar tu propia cuenta');
  }

  const user = await usersService.findById(userId);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (user.role === 'ADMIN') {
    throw new HttpError(403, 'No se puede eliminar a un administrador');
  }

  await usersService.deleteAccount(userId);
  return { message: 'Usuario eliminado exitosamente' };
}
