import { createHmac, randomInt } from 'node:crypto';
import {
  HOUSEHOLD_INVITE_CODE_ALPHABET,
  HOUSEHOLD_INVITE_CODE_LENGTH,
  HOUSEHOLD_INVITE_TTL_HOURS,
  HOUSEHOLD_MAX_MEMBERS,
  normalizeInviteCode,
} from '@omni/shared/household';
import type { CreatedHouseholdInvite, HouseholdInfo, HouseholdInvitePreview } from '@omni/shared/household';

import { config } from '../config';
import { lockHouseholds, prisma } from '../common/db';
import type { PrismaTransactionClient } from '../common/db';
import { HttpError } from '../common/http';
import { toIsoDateTimeString } from '../common/utils/lifestyle';

const INVALID_CODE_MESSAGE = 'El código no es válido o ya venció';

type Client = PrismaTransactionClient;

const WITH_HOUSEHOLD_MAX_ATTEMPTS = 3;

const inviteCodeKey = createHmac('sha256', config.jwt.refreshSecret).update('household-invite-code').digest();

/** HMAC con una clave derivada del secreto de refresh: un volcado de la tabla no alcanza para probar códigos offline. */
function hashInviteCode(code: string): string {
  return createHmac('sha256', inviteCodeKey).update(normalizeInviteCode(code)).digest('hex');
}

function generateInviteCode(): string {
  return Array.from(
    { length: HOUSEHOLD_INVITE_CODE_LENGTH },
    () => HOUSEHOLD_INVITE_CODE_ALPHABET[randomInt(HOUSEHOLD_INVITE_CODE_ALPHABET.length)]
  ).join('');
}

function pendingInviteWhere(now = new Date()) {
  return { usedAt: null, revokedAt: null, expiresAt: { gt: now } };
}

/**
 * Hogar de la persona. Toda cuenta tiene uno (la migración y el alta lo crean), así que la ausencia es un estado
 * inconsistente y no un caso de uso.
 */
export async function getHouseholdId(userId: string, client: Client = prisma): Promise<string> {
  const member = await client.householdMember.findUnique({ where: { userId }, select: { householdId: true } });
  if (!member) throw new HttpError(403, 'Tu cuenta no tiene un hogar asignado');
  return member.householdId;
}

/**
 * Corre una escritura de alacena o películas dentro de una transacción con el hogar bloqueado. Resuelve el hogar, lo
 * bloquea y lo vuelve a resolver: si una unión lo movió entre medio, reintenta. Así una alta nunca apunta a un hogar que
 * `acceptInvite` está por borrar.
 */
export async function withHousehold<T>(
  userId: string,
  fn: (tx: Client, householdId: string) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async tx => {
    for (let attempt = 0; attempt < WITH_HOUSEHOLD_MAX_ATTEMPTS; attempt++) {
      const householdId = await getHouseholdId(userId, tx);
      await lockHouseholds(tx, [householdId]);
      if (householdId === (await getHouseholdId(userId, tx))) return fn(tx, householdId);
    }
    throw new HttpError(409, 'Tu hogar cambió mientras se procesaba la operación, intentá de nuevo');
  });
}

/**
 * Hogar de la persona con sus integrantes y la invitación pendiente, si hay. El código en sí no se puede recuperar:
 * solo se guarda su hash y se muestra una vez al generarlo.
 */
export async function getHousehold(userId: string, client: Client = prisma): Promise<HouseholdInfo> {
  const householdId = await getHouseholdId(userId, client);
  const household = await client.household.findUniqueOrThrow({
    where: { id: householdId },
    include: {
      members: {
        orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      },
      invites: { where: pendingInviteWhere(), orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  const [invite] = household.invites;
  return {
    id: household.id,
    members: household.members.map(m => ({
      userId: m.user.id,
      name: m.user.name,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      joinedAt: toIsoDateTimeString(m.joinedAt),
    })),
    pendingInvite: invite ? { id: invite.id, expiresAt: toIsoDateTimeString(invite.expiresAt) } : null,
  };
}

/** Genera un código nuevo y revoca el pendiente anterior: a lo sumo una invitación viva por hogar. */
export async function createInvite(userId: string): Promise<CreatedHouseholdInvite> {
  return prisma.$transaction(async tx => {
    const householdId = await getHouseholdId(userId, tx);
    await lockHouseholds(tx, [householdId]);

    const members = await tx.householdMember.count({ where: { householdId } });
    if (members >= HOUSEHOLD_MAX_MEMBERS) {
      throw new HttpError(409, 'Tu hogar ya tiene el máximo de integrantes');
    }

    const now = new Date();
    await tx.householdInvite.updateMany({
      where: { householdId, ...pendingInviteWhere(now) },
      data: { revokedAt: now },
    });

    const code = generateInviteCode();
    const invite = await tx.householdInvite.create({
      data: {
        householdId,
        createdById: userId,
        codeHash: hashInviteCode(code),
        expiresAt: new Date(now.getTime() + HOUSEHOLD_INVITE_TTL_HOURS * 60 * 60 * 1000),
      },
    });
    return { id: invite.id, code, expiresAt: toIsoDateTimeString(invite.expiresAt) };
  });
}

export async function revokeInvite(userId: string): Promise<void> {
  const householdId = await getHouseholdId(userId);
  const { count } = await prisma.householdInvite.updateMany({
    where: { householdId, ...pendingInviteWhere() },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new HttpError(404, 'No hay una invitación pendiente');
}

/**
 * Valida un código contra el estado actual y devuelve los dos hogares involucrados. Vencido, usado, revocado o
 * inexistente responden igual para no revelar cuál es. Quien acepta tiene que estar solo en su hogar.
 */
async function resolveInvite(client: Client, userId: string, code: string) {
  const invite = await client.householdInvite.findFirst({
    where: { codeHash: hashInviteCode(code), ...pendingInviteWhere() },
    include: { createdBy: { select: { name: true } } },
  });
  if (!invite) throw new HttpError(404, INVALID_CODE_MESSAGE);

  const ownHouseholdId = await getHouseholdId(userId, client);
  if (ownHouseholdId === invite.householdId) {
    throw new HttpError(409, 'Ese código es de tu propio hogar');
  }

  const [ownMembers, targetMembers] = await Promise.all([
    client.householdMember.count({ where: { householdId: ownHouseholdId } }),
    client.householdMember.count({ where: { householdId: invite.householdId } }),
  ]);
  if (ownMembers >= HOUSEHOLD_MAX_MEMBERS) {
    throw new HttpError(409, 'Ya estás vinculado a otra persona: desvinculate antes de unirte a otro hogar');
  }
  if (targetMembers >= HOUSEHOLD_MAX_MEMBERS) {
    throw new HttpError(409, 'Ese hogar ya tiene el máximo de integrantes');
  }
  return { invite, ownHouseholdId, targetHouseholdId: invite.householdId };
}

/**
 * Qué aporta quien acepta y qué se pisa. En los repetidos de alacena y de películas gana el registro del hogar que
 * recibe, así que los conflictos listan los registros de quien se une que se descartan.
 */
export async function previewInvite(userId: string, code: string): Promise<HouseholdInvitePreview> {
  const { invite, ownHouseholdId, targetHouseholdId } = await resolveInvite(prisma, userId, code);

  const [ownMedia, targetMedia, ownProducts, targetProducts, shoppingItemCount] = await Promise.all([
    prisma.mediaItem.findMany({
      where: { householdId: ownHouseholdId },
      select: { tmdbId: true, mediaType: true, title: true },
    }),
    prisma.mediaItem.findMany({
      where: { householdId: targetHouseholdId },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.pantryProduct.findMany({
      where: { householdId: ownHouseholdId },
      select: { name: true, nameNormalized: true },
    }),
    prisma.pantryProduct.findMany({
      where: { householdId: targetHouseholdId },
      select: { nameNormalized: true },
    }),
    prisma.pantryShoppingListItem.count({ where: { householdId: ownHouseholdId } }),
  ]);

  const targetMediaKeys = new Set(targetMedia.map(m => `${m.mediaType}:${m.tmdbId}`));
  const targetNames = new Set(targetProducts.map(p => p.nameNormalized));

  return {
    inviter: { name: invite.createdBy?.name ?? '' },
    contributes: {
      mediaCount: ownMedia.length,
      pantryProductCount: ownProducts.length,
      shoppingItemCount,
    },
    conflicts: {
      media: ownMedia.filter(m => targetMediaKeys.has(`${m.mediaType}:${m.tmdbId}`)),
      pantry: ownProducts.filter(p => targetNames.has(p.nameNormalized)).map(p => ({ name: p.name })),
    },
  };
}

/**
 * Une el hogar de quien acepta al que generó el código, dentro de una transacción con lock sobre ambos hogares.
 * Los repetidos se resuelven a favor del hogar que recibe; los ítems de lista de compras de quien se une que apuntaban a
 * un producto descartado pasan a apuntar al producto equivalente del hogar que recibe.
 */
export async function acceptInvite(userId: string, code: string): Promise<HouseholdInfo> {
  await prisma.$transaction(async tx => {
    const hashed = await tx.householdInvite.findUnique({
      where: { codeHash: hashInviteCode(code) },
      select: { householdId: true },
    });
    if (!hashed) throw new HttpError(404, INVALID_CODE_MESSAGE);

    const ownHouseholdId = await getHouseholdId(userId, tx);
    await lockHouseholds(tx, [ownHouseholdId, hashed.householdId]);

    const { invite, targetHouseholdId } = await resolveInvite(tx, userId, code);
    if (ownHouseholdId !== (await getHouseholdId(userId, tx))) {
      throw new HttpError(409, 'Tu hogar cambió mientras se procesaba la unión');
    }

    const now = new Date();
    const claimed = await tx.householdInvite.updateMany({
      where: { id: invite.id, ...pendingInviteWhere(now) },
      data: { usedAt: now, usedById: userId },
    });
    if (claimed.count === 0) throw new HttpError(404, INVALID_CODE_MESSAGE);

    const [targetMedia, targetProducts] = await Promise.all([
      tx.mediaItem.findMany({ where: { householdId: targetHouseholdId }, select: { tmdbId: true, mediaType: true } }),
      tx.pantryProduct.findMany({
        where: { householdId: targetHouseholdId },
        select: { id: true, nameNormalized: true },
      }),
    ]);
    const targetMediaKeys = new Set(targetMedia.map(m => `${m.mediaType}:${m.tmdbId}`));
    const targetProductByName = new Map(targetProducts.map(p => [p.nameNormalized, p.id]));

    const ownMedia = await tx.mediaItem.findMany({
      where: { householdId: ownHouseholdId },
      select: { id: true, tmdbId: true, mediaType: true },
    });
    const duplicateMediaIds = ownMedia.filter(m => targetMediaKeys.has(`${m.mediaType}:${m.tmdbId}`)).map(m => m.id);
    await tx.mediaItem.deleteMany({ where: { id: { in: duplicateMediaIds } } });
    await tx.mediaItem.updateMany({ where: { householdId: ownHouseholdId }, data: { householdId: targetHouseholdId } });

    const ownProducts = await tx.pantryProduct.findMany({
      where: { householdId: ownHouseholdId },
      select: { id: true, nameNormalized: true },
    });
    const duplicateProducts = ownProducts.filter(p => targetProductByName.has(p.nameNormalized));
    await tx.pantryShoppingListItem.deleteMany({
      where: {
        pantryProductId: { in: duplicateProducts.map(p => p.id) },
        source: 'AUTO',
        checked: false,
      },
    });
    if (duplicateProducts.length > 0) {
      const sourceIds = duplicateProducts.map(p => p.id);
      const targetIds = duplicateProducts.map(p => targetProductByName.get(p.nameNormalized)!);
      await tx.$executeRaw`
        UPDATE "PantryShoppingListItem" AS i
        SET "pantryProductId" = m.target_id
        FROM unnest(${sourceIds}::text[], ${targetIds}::text[]) AS m(source_id, target_id)
        WHERE i."pantryProductId" = m.source_id`;
    }
    await tx.pantryProduct.deleteMany({ where: { id: { in: duplicateProducts.map(p => p.id) } } });
    await tx.pantryProduct.updateMany({
      where: { householdId: ownHouseholdId },
      data: { householdId: targetHouseholdId },
    });
    await tx.pantryShoppingListItem.updateMany({
      where: { householdId: ownHouseholdId },
      data: { householdId: targetHouseholdId },
    });

    await tx.householdMember.update({
      where: { userId },
      data: { householdId: targetHouseholdId, joinedAt: now },
    });
    await tx.household.delete({ where: { id: ownHouseholdId } });
  });

  return getHousehold(userId);
}

/**
 * Quien se va recibe un hogar nuevo con una copia del estado actual; quien se queda conserva todo. No requiere
 * aprobación del otro. La copia conserva la autoría y reapunta la lista de compras a los productos copiados.
 */
export async function leaveHousehold(userId: string): Promise<HouseholdInfo> {
  await prisma.$transaction(async tx => {
    const householdId = await getHouseholdId(userId, tx);
    await lockHouseholds(tx, [householdId]);

    const members = await tx.householdMember.count({ where: { householdId } });
    if (members < HOUSEHOLD_MAX_MEMBERS) {
      throw new HttpError(409, 'No estás vinculado a otra persona');
    }

    const now = new Date();
    await tx.householdInvite.updateMany({
      where: { householdId, ...pendingInviteWhere(now) },
      data: { revokedAt: now },
    });

    const fresh = await tx.household.create({ data: {} });

    const media = await tx.mediaItem.findMany({ where: { householdId } });
    await tx.mediaItem.createMany({
      data: media.map(({ id: _id, householdId: _householdId, ...rest }) => ({ ...rest, householdId: fresh.id })),
    });

    const products = await tx.pantryProduct.findMany({ where: { householdId } });
    const copiedProducts = await tx.pantryProduct.createManyAndReturn({
      data: products.map(({ id: _id, householdId: _householdId, ...rest }) => ({ ...rest, householdId: fresh.id })),
      select: { id: true, nameNormalized: true },
    });
    const copiedByName = new Map(copiedProducts.map(p => [p.nameNormalized, p.id]));
    const originalNameById = new Map(products.map(p => [p.id, p.nameNormalized]));

    const items = await tx.pantryShoppingListItem.findMany({ where: { householdId } });
    await tx.pantryShoppingListItem.createMany({
      data: items.map(({ id: _id, householdId: _householdId, pantryProductId, ...rest }) => ({
        ...rest,
        householdId: fresh.id,
        pantryProductId: pantryProductId
          ? (copiedByName.get(originalNameById.get(pantryProductId) ?? '') ?? null)
          : null,
      })),
    });

    await tx.householdMember.update({ where: { userId }, data: { householdId: fresh.id, joinedAt: now } });
  });

  return getHousehold(userId);
}

/**
 * Borrar la cuenta equivale a desvincular sin copia: si queda otra persona conserva todo (la autoría de lo que
 * agregó pasa a anónima) y si era la única, el hogar se elimina con sus datos. Va dentro de la transacción del borrado.
 */
export async function detachForAccountDeletion(tx: Client, userId: string): Promise<void> {
  const member = await tx.householdMember.findUnique({ where: { userId }, select: { householdId: true } });
  if (!member) return;

  await lockHouseholds(tx, [member.householdId]);
  const members = await tx.householdMember.count({ where: { householdId: member.householdId } });
  if (members <= 1) {
    await tx.household.delete({ where: { id: member.householdId } });
    return;
  }
  const now = new Date();
  await tx.householdInvite.updateMany({
    where: { householdId: member.householdId, ...pendingInviteWhere(now) },
    data: { revokedAt: now },
  });
}
