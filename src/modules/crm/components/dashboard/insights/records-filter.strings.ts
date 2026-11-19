// Copy for the records page's search input — the one control that sits above
// the drill-down table on `/crm/insights/records/:tile`. Centralised per §16.12
// (no naked strings).

import type { SummaryTileKey } from './InsightSummaryCard'

export const RECORDS_FILTER_STRINGS = {
  searchAriaLabel: 'Search records',
  // Placeholder is per-tile — the search targets a different id column per
  // record shape. Falls back to a generic prompt for tiles that don't map to
  // one of the known drill-downs.
  searchPlaceholderByTile: {
    'deals-won': 'Search by Deal / SO Number',
    'deals-closed': 'Search by Deal / SO Number',
    'leads-won': 'Search by SO / Deal / Lead Number',
    'lead-order-rate': 'Search by SO / Deal / Lead Number',
    'so-closed-value': 'Search by SO Number',
    'quotes-done': 'Search by Quote Number',
    'win-rate': 'Search by Quote Number',
    'deal-order-rate': 'Search by Deal / SO Number',
    leads: 'Search by Lead Number',
  } as Partial<Record<SummaryTileKey, string>>,
  /** Tiles whose records page carries no owner filter (the quote rows have no
   *  single owner the tile credits). */
  noOwnerTiles: ['win-rate'] as readonly string[],
  /** Tiles that rename the Owner facet — the SO panel's person is who RAISED
   *  the order (`created_by_name`), not an owner. */
  ownerLabelByTile: { 'so-closed-value': 'Created By' } as Record<string, string>,
  searchPlaceholderDefault: 'Search by number',
  /** Placeholder for the tile-drill-down page's account-body search — the
   *  rows there are accounts, so we prompt for the name column. */
  searchPlaceholderAccountName: 'Search account name',
  /** Placeholder for the tile-drill-down page's records-body search, by the
   *  record type the rows are — the search matches the number the row shows
   *  (a lead list shows the DEAL number once the lead has one). */
  searchPlaceholderByRecordType: {
    lead: 'Search by Lead / Deal Number',
    deal: 'Search by Deal / SO Number',
    quote: 'Search by Quote Number',
    sales_order: 'Search by SO Number',
  } as Record<string, string>,
  /** Label used in the "Filtered by" chip row for the active `q` value. */
  searchChipLabel: 'Search',
  // Static status facet — the SO panels' universe is Approved / PartiallyApproved.
  status: {
    label: 'Status',
    approved: 'Approved',
    partiallyApproved: 'Partially Approved',
    partiallyDispatched: 'Partially Dispatched',
    dispatched: 'Dispatched',
    partiallyReturned: 'Partially Returned',
  },
} as const
