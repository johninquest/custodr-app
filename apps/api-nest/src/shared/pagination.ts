import { z } from 'zod';

/** Defaults from `docs/api_spec.md`. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** The pagination envelope from `docs/api_spec.md`. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Query schema for paginated list endpoints.
 *
 * Coerces strings to numbers and clamps `limit` to the documented maximum,
 * so controllers receive validated integers.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Build the pagination envelope for a page of results. */
export function buildPagination(
  page: number,
  limit: number,
  total: number,
): Pagination {
  return {
    page,
    limit,
    total,
    total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

/** Wrap a page of rows in the `{ data, pagination }` envelope. */
export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): Paginated<T> {
  return { data, pagination: buildPagination(page, limit, total) };
}

/** Translate a page/limit pair into SQL OFFSET/LIMIT. */
export function offsetFor(page: number, limit: number): number {
  return (page - 1) * limit;
}
