// The one pagination contract every list endpoint uses (backend CLAUDE.md §14,
// enforced by comprint-erp-backend/tests/unit/test_pagination_contract.py).
//
// Request: `page` (from 1) + `page_size`. Never offset / limit / size.
// Response data: { items, total, page, page_size, has_next }.

export interface PageParams {
  page?: number;
  page_size?: number;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  // Whether a later page exists (`page * page_size < total`), computed by the server.
  has_next: boolean;
}

export const FIRST_PAGE = 1;

// `getNextPageParam` for useInfiniteQuery over a paged endpoint.
export function nextPage(last: PageResponse<unknown>): number | undefined {
  return last.has_next ? last.page + 1 : undefined;
}

// The largest page the backend serves by default (`PaginationParams` le=100).
export const MAX_PAGE_SIZE = 100;

// Every item of a paged endpoint, following `has_next`. For surfaces that need
// the whole set (a tree, a short history). `maxPages` stops a misbehaving
// backend from looping the client forever.
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PageResponse<T>>,
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = FIRST_PAGE; page <= maxPages; page += 1) {
    const res = await fetchPage(page);
    all.push(...res.items);
    if (!res.has_next) break;
  }
  return all;
}
