import { z } from 'zod';

import { PAGE_MAX } from './limits';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(PAGE_MAX).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function paginationSkipTake(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}
