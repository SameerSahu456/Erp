import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

// Domain label maps (Coding-guideline §16.12 bucket 2): the single source for
// how a spare-request status wire value is shown to the user. Shared by the
// Spares worklist table and any future spares surfaces — kept here rather than
// inline in SparesBody so copy/variant changes happen in one place.

export const SPARE_REQUEST_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  in_stock: 'In Stock',
  ordered: 'Ordered',
  partially_fulfilled: 'Partially Fulfilled',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  // Synthetic display status: the wire status stays 'fulfilled' through a
  // return, so callers show this when quantity_returned > 0.
  returned: 'Spare Returned',
}

export const SPARE_REQUEST_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  requested: 'warning',
  in_stock: 'info',
  ordered: 'info',
  partially_fulfilled: 'warning',
  fulfilled: 'success',
  cancelled: 'error',
  // Settled/closed — stock went back on the rack. Grey so it reads as a
  // finished state, not an active one (blue clashed with in_stock/ordered).
  returned: 'neutral',
}
