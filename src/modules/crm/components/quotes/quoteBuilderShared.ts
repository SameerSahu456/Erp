

import { discountCapError, type BomChildRow } from '../line-items'
import { TAXES } from '../../constants/taxes'
import { useLeadsInfinite } from '../../hooks/leads/useLeads'
import { useDealsInfinite } from '../../hooks/deals/useDeals'
import { mockBOMs } from '@/modules/wms/data/boms'
import type { BOMItem } from '@modules/wms'

import type { QuoteRentalPeriod, QuoteWire } from '../../api'

// ── Types ──


export type LineItemType = 'ims_part' | 'description'
export type BOMComponentAction = 'INCLUDE' | 'EXCLUDE' | 'SWAP'

export interface BOMComponentConfig {
  bomItemId: string
  partId: string
  partName: string
  partSku: string
  quantity: number
  position?: string
  isOptional: boolean
  action: BOMComponentAction
  /** For SWAP: the replacement part */
  swapPartId?: string
  swapPartName?: string
  swapPartSku?: string
  notes?: string
}

export type AdditionalComponentType = 'ims_part' | 'description'

export interface AdditionalComponent {
  id: string
  type: AdditionalComponentType
  /** Server-assigned child id, preserved on edit-mode hydrate. Drives
   *  upsert dispatch on PATCH: present → update existing child (id-based),
   *  absent → create new child. Without this, sending a hydrated child
   *  back on PATCH would create a duplicate row because the backend
   *  treats id-less children as fresh inserts. */
  serverChildId?: string
  partId?: string
  partName: string
  partSku?: string
  description: string
  quantity: number
  rate: number
}

export interface QuoteBuilderLineItem {
  id: string
  type: LineItemType
  /** Server id once this row is saved on the backend; absent for new rows. */
  serverId?: string
  // Part Number fields
  partId?: string
  partName?: string
  partSku?: string
  category?: string                  // human-readable label; the chip
  /** UUID-shaped category id sent to backend (`category_id` in the API).
   *  Auto-filled from the picked part; user can override via the combobox. */
  category_id?: string
  brand?: string
  /** UUID of the OEM/brand picker's current selection (optional).
   *  Client-only on quote lines — the backend `quote_items` row doesn't
   *  carry `oem_id`, so this id is used purely to drive the inline OEM
   *  combobox's trigger label. Auto-filled from the picked variant's
   *  `oem_id`; user can override on a freeform row. */
  oemId?: string
  /** Mirrors the picked variant's `category.is_bom_eligible`. Client-only —
   *  the backend doesn't echo this on `QuoteItemResponse`, so edit-mode
   *  hydrate from an existing quote leaves it undefined. Drives whether
   *  the grid shows the "+ Add component" row under this parent. */
  is_bom_eligible?: boolean
  variantType?: string  // 'New' | 'Refurbished' | 'New Pull'
  /** Parent IMS Part UUID (VariantListItem.part_id). Stored so the
   *  VariantPicker can filter sibling variants without an extra round-trip. */
  partImsId?: string
  bomId?: string
  bomName?: string
  // Description-based fields
  itemName?: string
  itemDescription?: string
  // Common fields
  qty: number
  /** Draft text shown while the qty input is being edited. */
  qtyInput?: string
  rate: number
  /** Draft text shown while the rate input is being edited. */
  rateInput?: string
  /** Catalog list price of the picked variant (`VariantListItem.sell_price`).
   *  Client-only — not sent to the backend. Captured at part-pick time so the
   *  grid's "List Price" column shows the catalog price next to the actual
   *  (possibly discounted) `rate`. Unset for freeform rows and for lines
   *  hydrated from an existing quote until the user re-picks the variant. */
  list_price?: number
  /** Per-line discount in ₹; subtracted from qty*rate before tax. Defaults to 0. */
  discount_amount: number
  /** Draft text shown while the discount input is being edited. */
  discountAmountInput?: string
  /** Tax rate per line; empty on create, filled from the picked part's HSN
   *  GST rate or typed by the user. No default is applied. */
  tax_rate: number
  /** Draft text shown while the tax input is being edited. */
  taxRateInput?: string
  // Rental fields (per quote spec §B14). When `is_rental` is true the three
  // rental_* fields are required on save. The displayed `gross_amount` for
  // a rental row is qty * rate — the monthly rent, not × the tenure
  // (server-computed).
  is_rental: boolean
  rental_period?: QuoteRentalPeriod
  /** ISO "YYYY-MM-DD" — backend accepts a DATE only. */
  rental_start_date?: string
  rental_end_date?: string
  // BOM configuration
  bomComponents: BOMComponentConfig[]
  /** @deprecated — superseded by `bomChildren` (shared LineItemBomEditor).
   *  Field stays optional so the legacy handlers below still compile but
   *  no UI writes to it. Safe to delete once the dead handlers are
   *  removed. */
  additionalComponents?: AdditionalComponent[]
  configNotes?: string
  warrantyLevel?: string
  /** Free-form BOM child components (persisted as config_action='Add'
   *  children via the shared LineItemBomEditor). Single source of truth
   *  for BOM tree state — read by calc / save / dirty paths. */
  bomChildren?: BomChildRow[]
  /** UI state */
  isBomExpanded: boolean
}

// ── Props ──

export interface QuoteBuilderPanelProps {
  leadId?: string
  dealId?: string
  accountId?: string
  accountName?: string
  /** `embedded` is the CRM inline variant used in lead/deal flows.
   *  `sales-order-embedded` stays minimal because the SO form already
   *  owns the surrounding header/notes UI. */
  mode?: 'standalone' | 'embedded' | 'sales-order-embedded'
  /** Edit mode: hydrate the form from an existing quote returned by `GET /quotes/{id}`. */
  existing?: QuoteWire
  /** Amend mode: the form is editing a (not-yet-created) new version of a
   *  Rejected source quote. Save fires `POST /version` then `PATCH` on the
   *  fresh draft, all in one user action. */
  amendMode?: boolean
  /** Called after a successful amend or to cancel out of amend mode. */
  onCancelAmend?: () => void
  /** Read-only mode — every input is disabled and Save is hidden.
   *  Drives the `/crm/quotes/:id` (no /edit) view route. */
  viewOnly?: boolean
  /** Called after a successful save (create / edit / amend) instead of
   *  navigating to the read-only view page. Used by embedded callers
   *  (Lead/Deal detail Quotes tab) so the user stays on the parent page
   *  and the section can flip back to list mode. */
  onSaved?: (saved: QuoteWire) => void
  /** Called when the user clicks Cancel in the footer. When provided, a
   *  Cancel button renders next to Save in editable modes. Standalone
   *  callers don't need this — the page-level back button covers the
   *  bail-out — so the prop is opt-in. */
  onCancel?: () => void
  /** Called with `true` whenever the user has made unsaved edits, and `false`
   *  when the form returns to a pristine state or finishes saving. The parent
   *  uses this to drive `FormPageShell`'s unsaved-changes guard. */
  onDirtyChange?: (dirty: boolean) => void
}

// ── Helpers ──

export function genId(prefix = 'qb'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// AsyncSelect calls `useOptions(search, { enabled })`. Bridge the existing
// infinite-paginated hooks into that shape so the Lead and Deal pickers
// honour `loadOnOpen` (first fetch waits for popover open) per §16.11.
export function useLeadPickerOptions(search: string, options?: { enabled?: boolean }) {
  return useLeadsInfinite({ search: search || undefined }, options)
}

export function useDealPickerOptions(search: string, options?: { enabled?: boolean }) {
  return useDealsInfinite(
    { search: search || undefined, sort: '-created_at' },
    options,
  )
}

export function fmt(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Pull the file name out of a (possibly query-stringed) PDF URL — the last
// non-empty path segment, URL-decoded. Returns `fallback` when the URL has no
// usable trailing segment.
export function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const { pathname } = new URL(url, window.location.origin)
    const last = pathname.split('/').filter(Boolean).pop()
    if (!last) return fallback
    return decodeURIComponent(last)
  } catch {
    return fallback
  }
}

// Per-line discount guard. The backend enforces `discount_amount <=
// gross_amount` (CHECK `ck_quote_items_discount_le_gross`) and 422s the
// WHOLE /calculate call when any line breaks it. We mirror the rule on
// standard lines (gross = qty × rate) so the offending line can be (a) kept
// out of the calc payload — no 422, every other line keeps pricing — and
// (b) flagged inline under its Disc input. Rentals included: a rental
// line's gross is qty × rate too — its rate is the rent per period, not
// multiplied by the tenure (`compute_line_amounts`, since 2026-11-02).
export function lineDiscountError(li: QuoteBuilderLineItem): string | null {
  return discountCapError(li.discount_amount, li.qty * li.rate)
}

/** Build BOM component configs from a BOM's items */
export function buildBomConfigs(bomItems: BOMItem[]): BOMComponentConfig[] {
  return bomItems.map((item) => ({
    bomItemId: item.id,
    partId: item.partId,
    partName: item.partName,
    partSku: item.partSku,
    quantity: item.quantity,
    position: item.position,
    isOptional: item.isOptional,
    action: 'INCLUDE' as BOMComponentAction,
    notes: item.notes,
  }))
}

/** Sales or Rental. A quote has no `sellable_type` column of its own —
 *  this is written down onto every line's `is_rental`, and read back by
 *  asking whether the saved items are rental. */
export type QuoteOrderType = 'Sales' | 'Rental'

/** Base UI's `Select.Value` prints the raw VALUE unless the root is
 *  handed this map, which is how the closed trigger ends up showing the
 *  label rather than the key. */
export const QUOTE_ORDER_TYPE_LABELS: Record<QuoteOrderType, string> = {
  Sales: 'Sales',
  Rental: 'Rental',
}

/** A blank quote line.
 *
 *  `isRental` follows the QUOTE's type. A quote has no `sellable_type`
 *  column — rental-ness lives per item on `quote_items.is_rental` — so
 *  the quote type is a UI-level choice that writes down onto every line,
 *  and is read back by asking whether any item is rental. */
export function createEmptyLineItem(isRental = false): QuoteBuilderLineItem {
  return {
    id: genId(),
    type: 'ims_part',
    qty: 1,
    rate: 0,
    discount_amount: 0,
    // Default tax is 18% (TAXES.DEFAULT_TAX_RATE). A picked part's HSN GST
    // rate overrides it (see applyLineItemPartChange); the user can still
    // type any rate. `taxRateInput: undefined` makes the field render the
    // numeric tax_rate.
    tax_rate: TAXES.DEFAULT_TAX_RATE,
    taxRateInput: undefined,
    is_rental: isRental,
    bomComponents: [],
    additionalComponents: [],
    bomChildren: [],
    isBomExpanded: false,
  }
}

// Build a form line item from a saved server item (edit mode hydration).
// QUOTE-4: also hydrate `additionalComponents` from the server-side
// `item.children` array (Add-action rows; Remove-action rows are surfaced
// in the same list with a tag so the user can re-toggle them) and
// `configNotes` from `item.configuration_notes`.
export function lineItemFromServer(item: QuoteWire['items'][number]): QuoteBuilderLineItem {
  const children = item.children ?? []
  return {
    id: genId(),
    serverId: item.id,
    type: item.part_variant_id ? 'ims_part' : 'description',
    partId: item.part_variant_id ?? undefined,
    partName: item.item_name,
    itemName: item.item_name,
    itemDescription: item.description ?? undefined,
    category_id: item.category_id ?? undefined,
    variantType: item.condition ?? undefined,
    oemId: item.oem_id ?? undefined,
    qty: item.qty,
    rate: item.rate,
    // Snapshot of IMS sell_price at pick time; survives sell_price changes.
    list_price: item.list_price ?? undefined,
    discount_amount: item.discount_amount ?? 0,
    tax_rate: item.tax_rate,
    is_rental: item.is_rental,
    rental_period: item.rental_period ?? undefined,
    rental_start_date: item.rental_start_date ?? undefined,
    rental_end_date: item.rental_end_date ?? undefined,
    bomComponents: [],
    additionalComponents: [],
    // Hydrate the shared `bomChildren` array (what `LineItemBomSection`
    // reads) directly from the server-side tree. `serverChildId` keeps
    // the backend id so PATCH dispatches as an id-based update instead
    // of inserting duplicates. Remove rows are skipped today (no UI
    // toggle); when that ships, surface them with an action field.
    bomChildren: children
      .filter((c) => c.config_action !== 'Remove')
      .map((child) => ({
        id: genId('ac'),
        serverChildId: child.id,
        partId: child.part_variant_id ?? undefined,
        partSku: undefined,
        itemName: child.item_name,
        categoryId: child.category_id ?? undefined,
        oemId: child.oem_id ?? undefined,
        condition: child.condition ?? undefined,
        description: child.description ?? undefined,
        qty: Number(child.qty),
        rate: Number(child.rate),
        listPrice: child.list_price ?? undefined,
        taxRate: Number(child.tax_rate ?? 0),
        discountAmount: Number(child.discount_amount ?? 0),
        warrantyLevel: child.warranty_level ?? undefined,
      })),
    configNotes: item.configuration_notes ?? undefined,
    warrantyLevel: item.warranty_level ?? undefined,
    isBomExpanded: children.length > 0,
  }
}

/** Parts that have an active assembly BOM */
export const partsWithBOM = mockBOMs
  .filter((b) => b.type === 'ASSEMBLY' && b.status === 'Active')
  .map((b) => ({
    bomId: b.id,
    bomName: b.name,
    partId: b.parentPartId,
    partName: b.parentPartName,
    partSku: b.parentPartSku,
    items: b.items,
  }))


// ── Main Component ──

