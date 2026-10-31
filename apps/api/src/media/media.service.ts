import type { AddMediaItemPayload, FilterMediaParams, UpdateMediaItemPayload } from '@omni/shared/media';

import { prisma } from '../common/db';
import * as tmdbService from './tmdb.service';
import { HttpError } from '../common/http';
import { getHouseholdId } from '../household/household.service';

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
  const householdId = await getHouseholdId(userId);
  const existing = await prisma.mediaItem.findUnique({
    where: {
      householdId_tmdbId_mediaType: {
        householdId,
        tmdbId: dto.tmdbId,
        mediaType: dto.mediaType,
      },
    },
  });

  if (existing) {
    throw new HttpError(409, 'Este elemento ya está en tu lista');
  }

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

  const item = await prisma.mediaItem.create({
    data: {
      householdId,
      createdById: userId,
      tmdbId: dto.tmdbId,
      mediaType: dto.mediaType,
      title,
      posterPath,
      status: dto.status || 'to_watch',
    },
  });

  return item;
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
  const householdId = await getHouseholdId(userId);
  const item = await prisma.mediaItem.findFirst({
    where: { id: itemId, householdId },
  });

  if (!item) {
    throw new HttpError(404, 'Elemento no encontrado');
  }

  const updated = await prisma.mediaItem.update({
    where: { id: itemId },
    data: { status: dto.status },
  });

  return updated;
}

export async function removeFromList(userId: string, itemId: string): Promise<void> {
  const householdId = await getHouseholdId(userId);
  const item = await prisma.mediaItem.findFirst({
    where: { id: itemId, householdId },
  });

  if (!item) {
    throw new HttpError(404, 'Elemento no encontrado');
  }

  await prisma.mediaItem.delete({ where: { id: itemId } });
}
