import { useSearchParams } from 'react-router-dom'

import { PAGINATION } from '@/shared/constants'

// Server-pagination state for the inner view's paged cells — page + page size,
// in the URL like the rest of the view state, so a paged view survives a
// refresh and a back-navigation.
//
// §16.7: the page owns `page`, resets to 1 on a filter change, and the footer
// fires `onPageChange` to refetch. Never `.slice()` a cached page.
//
// PER-CELL, not global. The `sales-team` inner view renders FIVE paged cells at
// once — the leaderboard, the revenue trend, and the Accounts / Category / OEM
// breakdowns. A single `?page` would page them in lockstep: clicking page 2 on
// Accounts would silently move the other four. Each cell therefore namespaces
// its own params via `key`; the leaderboard keeps the bare `?page` / `?pageSize`
// it already ships, so its existing URLs stay valid.

/** Every cell that pages on the insight board. `undefined` is the leaderboard
 *  (bare `?page`), which predates the namespacing.
 *
 *  A new paged cell MUST be added here — `ALL_PAGE_PARAMS` is what
 *  `useInsightView` clears when a filter change invalidates every page index.
 *  Miss it and that cell's page survives the change and points past the end of
 *  the new result set (§16.7). */
export const PAGING_KEYS = [
  undefined,
  'revenue',
  // The Avg Order Value trend cell — its own metric off `/crm/dashboard/revenue`,
  // so it pages independently of the Revenue Trend cell (same reasoning as the
  // funnel tiles below).
  'aov',
  // The Avg Order Value BY CATEGORY table. Its own key rather than sharing
  // `aov` above: the two render on the same view (the AOV trend directly above
  // this table), so one shared key would page both in lockstep — clicking page
  // 2 on the category table would silently move the trend.
  'aov-by-category',
  'accounts',
  'category',
  'oem',
  'condition',
  'account-type',
  'top-products',
  // The full-width Top Orders line-item table on its own insight page.
  'top-orders',
  // The Sales Funnel conversion table. Its endpoint is the one exception on this
  // list: it takes no `page` / `page_size` and returns its WHOLE result set
  // (four rows — Leads, Deals, Quotes, Demo Requests) in one response, so this
  // handle pages over rows already in hand rather than refetching.
  //
  // That is NOT the §16.7 anti-pattern. The rule forbids `.slice()`-ing a cached
  // fetch that is only PART of the data, because the rest then silently never
  // loads. Here there is no rest — four rows is the complete set by schema
  // contract. Keeping the handle means the card reads and behaves like every
  // other cell on the board, and if the endpoint ever grows more stages the
  // pager starts doing real work with no change here.
  'sales-funnel',
  // The period-wise breakdown table. Same exception as `sales-funnel` above:
  // its endpoint takes no `page` / `page_size` and returns its WHOLE result set
  // (one row per calendar bucket in the window), so this handle pages over rows
  // already in hand rather than refetching. Not the §16.7 anti-pattern — there
  // is no unfetched remainder. It earns a pager because `period=weekly` over a
  // year-to-date window is ~31 rows, which is a long table in a half-width card.
  'period-breakdown',
  // The two Growth-page reads of that same breakdown — the compact
  // bucket+change table and the full Growth Ledger under it. Same exception as
  // `period-breakdown` (rows already in hand), and their own keys because all
  // three can never page each other: on the Growth page the delta table and the
  // ledger sit one above the other.
  'period-delta',
  'growth-ledger',
  // The condition-mix cross-tab. Same exception as `period-breakdown` above —
  // its endpoint takes no `page` / `page_size` and returns every bucket in one
  // response, so this handle pages rows already in hand rather than refetching.
  // Not the §16.7 anti-pattern: there is no unfetched remainder. It gets its
  // OWN key rather than sharing `period-breakdown`'s so paging one table cannot
  // silently move the other — they sit on the same page.
  'condition-mix',
  // The vertical-mix cross-tab. Same exception and same reasoning as
  // `condition-mix` directly above — its endpoint returns every bucket in one
  // response, so this pages rows in hand. Its own key so the two mixes and the
  // period breakdown never page each other.
  'vertical-mix',
  // The three funnel-trend tiles. They render side by side in one row and each
  // runs its own `metric` off `/crm/dashboard/revenue`, so they need three
  // separate page indices — one shared key would page all three in lockstep.
  'funnel-leads',
  'funnel-deals',
  'funnel-orders',
  // The summary-tile drill-down records page (`/crm/insights/records/:tile`).
  // Listed here so a filter change on that page clears `?recordsPage` — without
  // it a stale index survives and points past the end of a smaller result set.
  'records',
  // The KPI-tile drill-down page (`/crm/insights/tile/:reportType/:slot`) — the
  // account breakdown behind a Total Revenue / Peak tile. Its own key, not
  // `accounts`: that one belongs to the accounts CELL on the board, and the two
  // are different tables on different routes.
  'tile-accounts',
  // The Top Products table on the account detail page's 360° tab. Its own key
  // so paging it does not collide with any other cell on any other page — the
  // account 360° tab is a dedicated context, not part of the insight board.
  'account-360-top-products',
  // Revenue trend on the same 360° tab. Sits above Top Products; separate key
  // so pagers on the two cells do not lockstep.
  'account-360-revenue',
  // Category / OEM breakdowns on the 360° tab. Both share the same endpoint as
  // Top Products (`/dashboard/revenue/by-source`, different `report_type`) but
  // sit side by side, so they need distinct pagers or clicking page 2 on one
  // would silently move the other.
  'account-360-category',
  'account-360-oem',
  'account-360-category-oem',
  // The Category × OEM pivot widget on the CRM dashboard. Its own key so the
  // pager on the pivot's category axis is independent of the sibling
  // by-source `category` / `oem` cells directly below it — those still page
  // their own flat rows, this one pages the pivot's row axis.
  'category-oem-mix',
  'category-period-comparison',
  // The All Accounts — Movement table on the account-movement insight page.
  // Server-paginated (`movement=all`); its own key so paging it never moves
  // the breakdown tables under it.
  'account-movement',
  // The two seeded series on the New Accounts insight page. Both page rows
  // already in hand (the whole series is the result set — the same exception
  // `period-breakdown` documents) and sit on one page, so each needs its own
  // key or clicking page 2 on one would move the other.
  'new-accounts-by-period',
  'new-vs-repeat',
  // The New Accounts ranked list — server-paginated (`/new-accounts` in its
  // drill-down mode). Its own key so paging it never moves the two series
  // above it or the pivot below.
  'new-accounts-list',
  'inactive-accounts-win-back',
  'inactive-accounts-by-period',
] as const

export type PagingKey = (typeof PAGING_KEYS)[number]

export const pageParam = (key?: PagingKey) => (key ? `${key}Page` : 'page')
export const sizeParam = (key?: PagingKey) => (key ? `${key}Size` : 'pageSize')

/** Every page param on the board, derived from ONE list so the reset in
 *  `useInsightView` can never drift out of sync with the cells that page. */
export const ALL_PAGE_PARAMS: string[] = PAGING_KEYS.map((k) => pageParam(k))

export interface InsightPaging {
  page: number
  pageSize: number
  setPage: (p: number) => void
  setPageSize: (s: number) => void
}

export function useInsightPaging(key?: PagingKey): InsightPaging {
  const [params, setParams] = useSearchParams()

  const pageKey = pageParam(key)
  const sizeKey = sizeParam(key)

  const page = Math.max(1, Number(params.get(pageKey) ?? '1') || 1)
  const rawSize = Number(params.get(sizeKey) ?? '') || PAGINATION.DEFAULT_PAGE_SIZE
  // The API caps `page_size` at 100; an out-of-range URL would 422 the request.
  const pageSize = PAGINATION.PAGE_SIZE_OPTIONS.includes(
    rawSize as (typeof PAGINATION.PAGE_SIZE_OPTIONS)[number],
  )
    ? rawSize
    : PAGINATION.DEFAULT_PAGE_SIZE

  const patch = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    mutate(next)
    setParams(next, { replace: true })
  }

  return {
    page,
    pageSize,
    setPage: (p) =>
      patch((next) => {
        if (p <= 1) next.delete(pageKey)
        else next.set(pageKey, String(p))
      }),
    setPageSize: (s) =>
      patch((next) => {
        if (s === PAGINATION.DEFAULT_PAGE_SIZE) next.delete(sizeKey)
        else next.set(sizeKey, String(s))
        // A new size renumbers every page — the old page index is meaningless
        // and could land past the end. Only THIS cell's page: the others'
        // result sets have not changed.
        next.delete(pageKey)
      }),
  }
}
