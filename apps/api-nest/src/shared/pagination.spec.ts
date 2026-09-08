import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  buildPagination,
  offsetFor,
  paginated,
  paginationQuerySchema,
} from './pagination.js';

describe('paginationQuerySchema', () => {
  it('applies the documented defaults when query params are absent ({} -> page 1, limit 20)', () => {
    // api_spec.md: page default 1, limit default 20.
    expect(paginationQuerySchema.parse({})).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
    });
  });

  it('coerces string query params to integers ("3" -> 3)', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it('accepts limit at the documented maximum (100)', () => {
    expect(paginationQuerySchema.parse({ limit: MAX_LIMIT })).toMatchObject({
      limit: 100,
    });
  });

  it('rejects limit above the documented maximum (101 -> error)', () => {
    // Spec says "max: 100" — the schema rejects rather than clamps.
    expect(() => paginationQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it('rejects limit of 0 and negative values', () => {
    expect(() => paginationQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => paginationQuerySchema.parse({ page: 0 })).toThrow();
    expect(() => paginationQuerySchema.parse({ page: -1 })).toThrow();
  });

  it('rejects non-integer page/limit ("1.5")', () => {
    expect(() => paginationQuerySchema.parse({ page: '1.5' })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: 20.5 })).toThrow();
  });
});

describe('buildPagination', () => {
  it('computes total_pages as ceil(total / limit)', () => {
    expect(buildPagination(1, 20, 150)).toEqual({
      page: 1,
      limit: 20,
      total: 150,
      total_pages: 8,
    });
  });

  it('returns 0 total_pages for an empty result set', () => {
    expect(buildPagination(1, 20, 0).total_pages).toBe(0);
  });

  it('returns 1 total_pages when total exactly fits one page', () => {
    expect(buildPagination(1, 20, 20).total_pages).toBe(1);
  });

  it('rounds partial final pages up (total 41, limit 20 -> 3 pages)', () => {
    expect(buildPagination(3, 20, 41).total_pages).toBe(3);
  });

  it('guards against a zero limit (returns 0 pages, no division by zero)', () => {
    expect(buildPagination(1, 0, 10)).toEqual({
      page: 1,
      limit: 0,
      total: 10,
      total_pages: 0,
    });
  });
});

describe('paginated', () => {
  it('wraps rows in the { data, pagination } envelope from api_spec.md', () => {
    const result = paginated([{ id: 'a' }, { id: 'b' }], 2, 20, 22);
    expect(result).toEqual({
      data: [{ id: 'a' }, { id: 'b' }],
      pagination: { page: 2, limit: 20, total: 22, total_pages: 2 },
    });
  });

  it('preserves an empty data array (not undefined/null)', () => {
    const result = paginated([], 1, 20, 0);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe('offsetFor', () => {
  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 20, 40],
    [1, 100, 0],
    [5, 7, 28],
  ] as const)('page %i limit %i -> offset %i', (page, limit, expected) => {
    expect(offsetFor(page, limit)).toBe(expected);
  });
});
