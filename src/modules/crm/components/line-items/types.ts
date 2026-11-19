// Canonical line-item model shared by Sales Quote (QuoteBuilderPanel),
// Sales Order (SalesOrderFormPage) and Closed Won (ClosedWonPage).
//
// One row component (`LineItemRow`) + one BOM child editor
// (`LineItemBomEditor`) render this shape across all three surfaces. Each
// consumer hydrates its own API rows into `BuilderLineItem[]` and maps back
// out via `lineItemMappers`.
//
// BOM model (API-correct): the Comprint backend has NO master-BOM/template
// API, so the only persistable shape is a free-form list of `Add` children
// (`config_action='Add'`). Each `BomChildRow` becomes one backend child via
// the parent item's inline `children[]` array. There is no Swap (the backend
// config_action set is Standard/Add/Remove only) and Remove is unused here
// because there is no standard component list to remove from.

export type LineItemType = "ims_part" | "description"

export type RentalPeriod = "day" | "month"

// Numeric inputs share a "draft string while focused, committed number on
// blur" pattern. Kept on both the headline line and each BOM child so the
// shared draft helpers in lineItemMappers work on either.
export interface LineDraftNums {
  qty: number
  /** Draft text shown while the qty input is being edited. */
  qtyInput?: string
  rate: number
  /** Draft text shown while the rate input is being edited. */
  rateInput?: string
  /** Per-line discount in ₹; subtracted from qty*rate before tax. */
  discountAmount: number
  /** Draft text shown while the discount input is being edited. */
  discountAmountInput?: string
  /** Tax rate per line, in percent (0–100). */
  taxRate: number
  /** Draft text shown while the tax input is being edited. */
  taxRateInput?: string
}

// One BOM child component under a headline line. Persists as a single
// `config_action='Add'` backend child. `categoryId` is required by the
// backend on every child (catalog OR freeform).
export interface BomChildRow extends LineDraftNums {
  id: string
  /** Server-assigned child id, preserved on edit-mode hydrate. Drives the
   *  PATCH upsert dispatch: present → update existing child by id, absent
   *  → create new. Without this, hydrated children would be re-sent as
   *  inserts on every save and the backend would duplicate them. */
  serverChildId?: string
  /** Catalog component → part_variant_id set. Freeform → undefined. */
  partId?: string
  partSku?: string
  /** Catalog sell_price snapshot of the picked variant — same contract as
   *  `BuilderLineItem.listPrice`. Undefined for freeform children and for
   *  children saved before the snapshot shipped. */
  listPrice?: number
  /** Display name (mirrors partName for catalog, user text for freeform). */
  itemName: string
  categoryId?: string
  /** Human-readable category label for the chip; not sent to the API. */
  category?: string
  /** Per-child Brand/OEM (optional). FK id to /ims/oems. Catalog → snapshot
   *  of the variant's OEM (the backend rejects a conflicting value);
   *  freeform → user's pick, or unset. */
  oemId?: string
  /** Per-child condition (optional) — the variant's own condition
   *  (new / refurbished / new_pull), NOT the header order type. Same
   *  catalog-snapshot rule as `oemId`. Plain string here so the shared model
   *  stays decoupled from the SO enum; consumers constrain the value. */
  condition?: string
  description?: string
  /** Per-component warranty (free text) — forwarded into the child's
   *  `warranty_level` on save. */
  warrantyLevel?: string
  /** Parent IMS Part UUID — mirrors BuilderLineItem.partImsId. Stored so
   *  the VariantPicker can filter sibling variants on component rows. */
  partImsId?: string
}

export interface BuilderLineItem extends LineDraftNums {
  id: string
  type: LineItemType
  /** Backend item id once saved; absent for new rows. */
  serverId?: string
  /** Source quote-item id when this row was seeded from a won/selected
   *  quote (SO / Closed Won lineage). */
  quoteItemId?: string
  // Catalog (part) fields
  partId?: string
  partSku?: string
  partName?: string
  brand?: string
  variantType?: string
  /** Parent IMS Part UUID (VariantListItem.part_id). Stored so the
   *  VariantPicker can filter sibling variants without an extra round-trip. */
  partImsId?: string
  // Freeform name (mirrors partName; both kept so callers can read either)
  itemName?: string
  // Common
  categoryId?: string
  /** Human-readable category label for the chip; not sent to the API. */
  category?: string
  /** Per-line Brand/OEM (optional). FK id to /ims/oems. */
  oemId?: string
  /** Per-line condition (optional) — the variant's own condition
   *  (new / refurbished / new_pull), NOT the header order type. Carried as a
   *  plain string here so the shared model stays decoupled from the SO enum;
   *  consumers constrain the value. */
  condition?: string
  /** Rich-text (HTML) description. */
  description?: string
  /** Per-line warranty (free text) — forwarded into the item's
   *  `warranty_level` on save. Shown as a dedicated grid column. */
  warrantyLevel?: string
  // Rental. Both a quote and a sales order can be rental now — the SO
  // path has shipped (so_configure + the §5 billing engine run on it),
  // so the old "Sales Quote only / SO rejects rental" note was wrong.
  // The shared row still exposes no rental UI of its own: each surface
  // renders its own billing-period control through `belowContent`.
  isRental?: boolean
  rentalPeriod?: RentalPeriod
  rentalStartDate?: string
  rentalEndDate?: string
  /** Catalog list price of the picked variant (`VariantListItem.sell_price`).
   *  Captured at pick time so the "List Price" column on the parent row shows
   *  the catalog price alongside the (possibly discounted) actual Price. Unset
   *  for freeform rows and for hydrated lines until the user re-picks. */
  listPrice?: number
  /** Whether the category supports BOM components (mirrors
   *  VariantListItem.is_bom_eligible). Gates "Add component" in grid + stacked
   *  views without a separate /ims/categories round-trip. */
  isBomEligible?: boolean
  // BOM children (free-form Add components)
  bomChildren: BomChildRow[]
  /** UI state — whether the "View BOM / Hide BOM" panel is open. */
  isBomExpanded: boolean
}

// Per-field validation messages a consumer can pass down for one row.
export interface LineRowErrors {
  name?: string
  /** "Add a part number or description" — the row carries neither. Rendered
   *  in the collected error block below the row. */
  identity?: string
  /** Description is mandatory when the row has no part number (SO). */
  description?: string
  category?: string
  /** Brand/OEM and Condition — only set by a surface that passes
   *  `oemConditionRequired` (SO form, Closed Won). */
  oem?: string
  condition?: string
  qty?: string
  rate?: string
  /** Rendered live under the Disc input (not in the collected block). */
  discount?: string
  /** Extra surface-specific messages appended to the collected block —
   *  e.g. the SO form's BOM component_identity / component_rate errors. */
  extra?: string[]
}
