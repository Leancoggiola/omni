import type { AddMediaItemPayload, FilterMediaParams, UpdateMediaItemPayload } from '@omni/shared/media';

import { prisma } from '../common/db';
import * as tmdbService from './tmdb.service';
import { HttpError } from '../common/http';
import { getHouseholdId, withHousehold } from '../household/household.service';

export async function search(query: string, page: number, type: string) {
  switch (type) {
    case 'movie':
      return tmdbService.searchMovies(query, page);
    case 'tv':
      return tmdbService.searchTv(query, page);
    default:
      return tmdbService.searchMulti(query, page);
  }
}

export async function addToList(userId: string, dto: AddMediaItemPayload) {
  const key = (householdId: string) => ({
    householdId_tmdbId_mediaType: { householdId, tmdbId: dto.tmdbId, mediaType: dto.mediaType },
  });
  const duplicate = () => new HttpError(409, 'Este elemento ya está en tu lista');

  const householdId = await getHouseholdId(userId);
  if (await prisma.mediaItem.findUnique({ where: key(householdId) })) throw duplicate();

  let title: string;
  let posterPath: string | null;

  if (dto.mediaType === 'movie') {
    const detail = await tmdbService.getMovieDetail(dto.tmdbId);
    title = detail.title;
    posterPath = detail.poster_path;
  } else {
    const detail = await tmdbService.getTvDetail(dto.tmdbId);
    title = detail.name;
    posterPath = detail.poster_path;
  }

  return withHousehold(userId, async (tx, lockedHouseholdId) => {
    if (await tx.mediaItem.findUnique({ where: key(lockedHouseholdId) })) throw duplicate();
    return tx.mediaItem.create({
      data: {
        householdId: lockedHouseholdId,
        createdById: userId,
        tmdbId: dto.tmdbId,
        mediaType: dto.mediaType,
        title,
        posterPath,
        status: dto.status || 'to_watch',
      },
    });
  });
}

export async function getList(userId: string, filters: FilterMediaParams) {
  const householdId = await getHouseholdId(userId);
  return prisma.mediaItem.findMany({
    where: {
      householdId,
      ...(filters.status && { status: filters.status }),
      ...(filters.mediaType && { mediaType: filters.mediaType }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateStatus(userId: string, itemId: string, dto: UpdateMediaItemPayload) {
  return withHousehold(userId, async (tx, householdId) => {
    const item = await tx.mediaItem.findFirst({ where: { id: itemId, householdId } });
    if (!item) throw new HttpError(404, 'Elemento no encontrado');
    return tx.mediaItem.update({ where: { id: itemId }, data: { status: dto.status } });
  });
}

export async function removeFromList(userId: string, itemId: string): Promise<void> {
  await withHousehold(userId, async (tx, householdId) => {
    const { count } = await tx.mediaItem.deleteMany({ where: { id: itemId, householdId } });
    if (count === 0) throw new HttpError(404, 'Elemento no encontrado');
  });
}
