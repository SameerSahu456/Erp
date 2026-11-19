/**
 * Parses tab-separated rows copied out of Excel / Google Sheets into quote
 * line-item groups.
 *
 * Expected columns (header row optional, order fixed):
 *   part number | category | condition | description | quantity | price
 *
 * Grouping rule: the price column decides. A row WITH a price is a parent
 * line item; every following row WITHOUT a price is a component of the most
 * recent parent. Blank rows are ignored. A price-less row that appears before
 * any parent is kept as a parent with no price so nothing is silently lost.
 *
 * Component prices are intentionally dropped — the parent's price covers the
 * whole configuration, and component pricing is never shown on a quote.
 */
import { roundMoney } from "@/shared/lib/money"
import type { QueryClient } from "@tanstack/react-query"

import { fetchVariantsListPage, fetchAllCategoriesShort, fetchCategory } from "@modules/ims"
import type { Category, VariantListItem } from "@modules/ims"

export type PastedCondition = "New" | "Refurbished" | "New Pull"

export interface PastedRow {
  partNumber: string
  category?: string
  oem?: string
  condition?: PastedCondition
  /** Raw condition text when it didn't map to a known value. */
  conditionRaw?: string
  description: string
  qty: number
  price?: number
}

export interface PastedLineGroup {
  parent: PastedRow
  components: PastedRow[]
}

export interface PasteParseResult {
  groups: PastedLineGroup[]
  /** Rows that had no part number and no description — skipped, reported for transparency. */
  skippedRows: number
  /** Whether a header row was detected and dropped. */
  hadHeader: boolean
}

const HEADER_TOKENS = [
  "part number",
  "part no",
  "partnumber",
  "category",
  "description",
  "quantity",
  "qty",
  "price",
  "condition",
]

function isHeaderRow(cells: string[]): boolean {
  const lowered = cells.map((c) => c.toLowerCase().trim()).filter(Boolean)
  if (lowered.length < 2) return false
  const hits = lowered.filter((c) => HEADER_TOKENS.includes(c)).length
  return hits >= 2
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === "")
}

export function normalizeCondition(raw: string | undefined): PastedCondition | undefined {
  const v = (raw ?? "").trim().toLowerCase()
  if (!v) return undefined
  if (v === "new pull" || v === "newpull" || v === "pull" || v === "np") return "New Pull"
  if (v === "new" || v === "n" || v === "brand new") return "New"
  if (v.startsWith("ref") || v === "used" || v === "r" || v === "refurb" || v === "refurbished")
    return "Refurbished"
  return undefined
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const cleaned = raw.replace(/[₹$€£,\s]/g, "").replace(/^Rs\.?/i, "")
  if (cleaned === "") return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function splitCells(line: string): string[] {
  // Excel copies as TSV. Fall back to comma separation only when the line has
  // no tabs at all (e.g. the user pasted from a CSV editor).
  if (line.includes("\t")) return line.split("\t")
  if (line.includes(",") && line.split(",").length >= 5) return line.split(",")
  return [line]
}

function rowFromCells(cells: string[]): PastedRow | null {
  // Column order: part number | description | quantity | price | category | condition
  const [pn = "", desc = "", qtyRaw = "", priceRaw = "", cat = "", cond = ""] = cells.map((c) =>
    c.trim(),
  )
  if (!pn && !desc) return null
  const qty = parseNumber(qtyRaw)
  const condition = normalizeCondition(cond)
  return {
    partNumber: pn,
    category: cat || undefined,
    condition,
    conditionRaw: condition ? undefined : cond || undefined,
    description: desc,
    qty: qty && qty > 0 ? qty : 1,
    // Excel shows 2 dp but the clipboard carries full precision; the backend
    // rejects a 3rd decimal, so the sheet's value is rounded on the way in.
    price: roundOptionalMoney(parseNumber(priceRaw)),
  }
}

function roundOptionalMoney(n: number | undefined): number | undefined {
  return n === undefined ? undefined : roundMoney(n)
}

/** Split raw clipboard text into a grid of trimmed-on-use cells. A trailing newline (as Excel adds) is dropped. */
export function parsePastedCells(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  while (lines.length > 0 && (lines[lines.length - 1] ?? "").trim() === "") lines.pop()
  return lines.map((l) => splitCells(l))
}

/**
 * Detect and extract a leading P/C role-indicator column.
 *
 * Used when the source sheet (or the dialog grid itself) has an explicit P/C
 * column as its first column.  Only activates when every non-blank row's first
 * cell is "P", "C", or empty AND the total width is exactly 7 (one more than
 * the expected 6 data columns).
 *
 * Returns the stripped data rows PLUS the per-row role array so callers can
 * honour the explicit grouping instead of falling back to the price heuristic.
 * Returns null when no P/C column was detected.
 */
export function extractPcColumn(
  rows: string[][],
): { cells: string[][]; pcRoles: Array<PastedRowRole | null> } | null {
  const nonBlank = rows.filter((r) => !isBlankRow(r))
  if (nonBlank.length === 0) return null
  const maxWidth = Math.max(...rows.map((r) => r.length))
  if (maxWidth !== 7) return null
  const pc = new Set(["P", "C", ""])
  if (!nonBlank.every((r) => pc.has((r[0] ?? "").trim().toUpperCase()))) return null
  const pcRoles: Array<PastedRowRole | null> = rows.map((r) => {
    const v = (r[0] ?? "").trim().toUpperCase()
    if (v === "P") return "parent"
    if (v === "C") return "component"
    return null
  })
  return { cells: rows.map((r) => r.slice(1)), pcRoles }
}

/** True when a row of cells looks like the column header line of the sheet. */
export function isHeaderCells(cells: string[]): boolean {
  return isHeaderRow(cells)
}

/** True when every cell in the row is empty — the separator between parent blocks. */
export function isBlankCells(cells: string[]): boolean {
  return isBlankRow(cells)
}

/** Role of each row in a grid: parent (has a price), component (no price, under a parent) or blank. */
export type PastedRowRole = "parent" | "component" | "blank"

/** Price cell index in the fixed column order (PN | Desc | Qty | Price | Cat | Cond). */
const PRICE_COL = 3

function hasPrice(row: string[]): boolean {
  return parseNumber(row[PRICE_COL]) !== undefined
}

/**
 * @param pcRoles  Optional per-row explicit role array from `extractPcColumn`.
 *                 When provided, explicit "parent"/"component" values take
 *                 precedence over the price heuristic for that row.
 */
export function rowRoles(
  cells: string[][],
  pcRoles?: Array<PastedRowRole | null>,
): PastedRowRole[] {
  const roles: PastedRowRole[] = []
  let haveParent = false
  for (let i = 0; i < cells.length; i++) {
    const row = cells[i]!
    if (isBlankRow(row)) {
      roles.push("blank")
      continue
    }
    const explicit = pcRoles?.[i]
    if (explicit === "parent") {
      roles.push("parent")
      haveParent = true
    } else if (explicit === "component" && haveParent) {
      roles.push("component")
    } else if (hasPrice(row) || !haveParent) {
      roles.push("parent")
      haveParent = true
    } else {
      roles.push("component")
    }
  }
  return roles
}

/** Build parent/component groups from a grid of cells (header row already removed). */
export function buildLineGroups(
  cells: string[][],
  pcRoles?: Array<PastedRowRole | null>,
): PasteParseResult {
  const groups: PastedLineGroup[] = []
  let current: PastedLineGroup | null = null
  let skippedRows = 0
  const roles = rowRoles(cells, pcRoles)

  for (let i = 0; i < cells.length; i++) {
    const row = cells[i]!
    if (isBlankRow(row)) continue
    const parsed = rowFromCells(row)
    if (!parsed) {
      skippedRows++
      continue
    }
    if (roles[i] === "parent" || current === null) {
      current = { parent: parsed, components: [] }
      groups.push(current)
    } else {
      // Components never carry their own price on the quote.
      current.components.push({ ...parsed, price: undefined })
    }
  }

  return { groups, skippedRows, hadHeader: false }
}

export function parsePastedLineItems(text: string): PasteParseResult {
  const cells = parsePastedCells(text)
  const first = cells[0]
  const hadHeader = !!first && isHeaderRow(first)
  const result = buildLineGroups(hadHeader ? cells.slice(1) : cells)
  return { ...result, hadHeader }
}

// ── Validation ──

export type GridIssueLevel = "error" | "warning"

export interface GridIssue {
  /** Zero-based row index in the grid. */
  row: number
  /** Zero-based column index (part number 0, category 1 … price 5); undefined for whole-row issues. */
  col?: number
  level: GridIssueLevel
  message: string
}

// Column order: part number | description | quantity | price | category | condition
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COL_PART = 0
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COL_DESC = 1
const COL_QTY  = 2
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COL_CAT  = 4
const COL_COND = 5

/**
 * Check a grid for mistakes a wrong paste typically produces: columns shifted,
 * text in the number cells, a block that starts without a parent price, rows
 * with no part number. Errors block the import; warnings are advisory.
 *
 * @param knownCategories  Optional set of lowercase active category names
 *   loaded from IMS. When provided, a non-empty category cell that doesn't
 *   match any known name is flagged as a warning.
 */
export function validateCells(
  cells: string[][],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  knownCategories?: Set<string>,
  pcRoles?: Array<PastedRowRole | null>,
): GridIssue[] {
  const issues: GridIssue[] = []
  const roles = rowRoles(cells, pcRoles)


  cells.forEach((row, i) => {
    if (isBlankRow(row)) return
    // Column order: part number | description | quantity | price | category | condition
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_pn = "", desc = "", qtyRaw = "", priceRaw = "", _cat = "", cond = ""] = row.map((c) => c.trim())

    if (isHeaderRow(row)) {
      issues.push({
        row: i,
        level: "error",
        message: "This looks like the sheet header row — remove it.",
      })
      return
    }
    // Part number required-check commented out per user request —
    // part_variant_id is optional on quote/SO lines (description substitutes).
    // if (!pn) {
    //   issues.push({
    //     row: i,
    //     col: COL_PART,
    //     level: "error",
    //     message: "Part number is missing.",
    //   })
    // }
    // Category warnings commented out — category_id is now optional on
    // quote line items (DB column nullable since migration 202610211400).
    // if (!cat) {
    //   issues.push({
    //     row: i,
    //     col: COL_CAT,
    //     level: "warning",
    //     message: "Category is empty — assign it in the quote builder after importing.",
    //   })
    // } else if (knownCategories && !knownCategories.has(cat.toLowerCase())) {
    //   issues.push({
    //     row: i,
    //     col: COL_CAT,
    //     level: "warning",
    //     message: `Category "${cat}" not found in the system.`,
    //   })
    // }
    // Description empty warning commented out — description is now optional
    // on quote and sales-order line items per user request.
    // if (!desc) {
    //   issues.push({
    //     row: i,
    //     col: COL_DESC,
    //     level: "warning",
    //     message: "Description is empty.",
    //   })
    // }
    if (qtyRaw !== "") {
      const q = parseNumber(qtyRaw)
      if (q === undefined) {
        issues.push({
          row: i,
          col: COL_QTY,
          level: "error",
          message: `Quantity "${qtyRaw}" is not a number.`,
        })
      } else if (q <= 0 || !Number.isInteger(q)) {
        issues.push({
          row: i,
          col: COL_QTY,
          level: "error",
          message: "Quantity must be a whole number greater than zero.",
        })
      }
    } else {
      issues.push({
        row: i,
        col: COL_QTY,
        level: "warning",
        message: "Quantity is empty — 1 will be used.",
      })
    }
    if (priceRaw !== "") {
      const p = parseNumber(priceRaw)
      if (p === undefined) {
        issues.push({
          row: i,
          col: PRICE_COL,
          level: "error",
          message: `Price "${priceRaw}" is not a number.`,
        })
      } else if (p <= 0) {
        issues.push({
          row: i,
          col: PRICE_COL,
          level: "error",
          message: "Price must be greater than zero.",
        })
      }
    }
    if (cond && !normalizeCondition(cond)) {
      issues.push({
        row: i,
        col: COL_COND,
        level: "warning",
        message: `Condition "${cond}" not recognised — use new, ref or new pull.`,
      })
    }
    // Columns shifted: a numeric part number with a text description in the qty cell, etc.
    if (desc && parseNumber(desc) !== undefined && qtyRaw && parseNumber(qtyRaw) === undefined) {
      issues.push({
        row: i,
        level: "error",
        message:
          "Columns look shifted — check the order: part number, description, quantity, price, category, condition.",
      })
    }
    if (roles[i] === "parent" && priceRaw === "") {
      issues.push({
        row: i,
        col: PRICE_COL,
        level: "error",
        message: "Price is required for parent line items.",
      })
    }
  })

  return issues
}

/** Maximum data rows accepted in a single paste. Pastes larger than this are
 *  rejected whole so the user splits the sheet into batches — importing a
 *  thousand-row paste blows up the grid validation + API resolve step and is
 *  never what the user intended on a quote/SO. */
export const MAX_PASTE_ROWS = 100

/** Problems with the raw clipboard text itself, before it lands in the grid. An error means the paste is not applied. */
export function validatePasteText(
  text: string,
): { level: GridIssueLevel; message: string } | null {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "")
  if (lines.length === 0) return { level: "error", message: "Nothing was pasted." }
  const tabbed = lines.filter((l) => l.includes("\t")).length
  if (lines.length > 1 && tabbed === 0) {
    return {
      level: "error",
      message:
        "The pasted text has no columns. Copy the cells from Excel (not from a PDF or email) so the columns are tab-separated.",
    }
  }
  if (lines.length > 1 && tabbed < lines.length / 2) {
    return {
      level: "error",
      message:
        "Most pasted rows have no columns — make sure you copied the whole table from Excel.",
    }
  }
  // Exclude a detected header row from the data-row count so a 100-row paste
  // with its header still fits exactly.
  const firstCells = lines[0]?.split("\t").map((c) => c.trim()) ?? []
  const hasHeader = isHeaderRow(firstCells)
  const dataRows = lines.length - (hasHeader ? 1 : 0)
  if (dataRows > MAX_PASTE_ROWS) {
    return {
      level: "error",
      message: `Too many rows — you pasted ${dataRows}, but only ${MAX_PASTE_ROWS} rows are allowed per paste. Split the sheet into smaller batches and paste each separately.`,
    }
  }
  const widest = Math.max(...lines.map((l) => l.split("\t").length))
  if (widest > 6) {
    return {
      level: "warning",
      message: `The paste has ${widest} columns but only 6 are expected (part number, description, quantity, price, category, condition). Extra columns were ignored — check the column order.`,
    }
  }
  return null
}

// ── Shared variant-resolution utility ────────────────────────────────────────
//
// Used by both Quote (useQuoteBuilder) and SO (useSalesOrderForm) paste flows
// so the IMS lookup + TanStack cache pre-seeding + category map live in one place.

export interface ResolvedPasteData {
  variantMap: Map<string, VariantListItem | null>
  categoryNameToId: Map<string, string>
}

export interface VariantLookupFilters {
  /** Pasted category name (mandatory in the paste format). Variants whose
   *  `category_name` doesn't match (case-insensitive) are rejected. */
  category?: string
  /** Pasted OEM name (optional). When present, variants with a different
   *  `oem_name` are rejected; when absent, OEM is not used as a filter. */
  oem?: string
  /** Canonical condition (`new` / `refurbished` / `new_pull`, optional). When
   *  present, variants with a different `condition` are rejected; when absent,
   *  condition is not used as a filter. */
  condition?: string
}

/** Composite key for `variantMap` — a pasted part number only identifies a
 *  variant together with its category/OEM/condition triple, since the same
 *  part number repeats across (potentially many) variants. */
export function variantKey(partNumber: string, filters: VariantLookupFilters = {}): string {
  return [
    partNumber.toLowerCase(),
    (filters.category ?? "").toLowerCase(),
    (filters.oem ?? "").toLowerCase(),
    filters.condition ?? "",
  ].join("|")
}

async function lookupVariant(
  pn: string,
  filters: VariantLookupFilters = {},
): Promise<VariantListItem | null> {
  if (!pn || pn.length < 2) return null
  try {
    const page = await fetchVariantsListPage({ search: pn, is_active: true, page_size: 20 })
    // Every variant the search returned is a candidate. The pasted category,
    // OEM and condition are only PREFERENCES applied after the part number
    // matches (see below) — a wrong/missing category in the sheet must never
    // stop a real part number from binding; the row then takes its category,
    // OEM and condition from the catalog variant.
    const candidates = page.items
    const low = pn.toLowerCase()
    // Require an EXACT match on an identifier field. The /ims/variants?search=…
    // endpoint is a loose text search (hits name/description too), so without a
    // strict exact-field match we'd latch onto any row whose description just
    // mentions the search term — e.g. pasting "Intel CPU" would bind to
    // whichever variant has "Intel CPU" anywhere in its text. We accept a
    // match on any of the canonical identifier/name fields so a paste that
    // uses the part name (e.g. "DL360 GEN11") resolves the same way as a
    // paste that uses the SKU; aliases are included so an operator-maintained
    // alternate name also binds. If none match, the row stays freeform.
    const matchesIdentity = (v: VariantListItem): boolean => {
      if (v.part_name.toLowerCase() === low) return true
      if (v.sku_code.toLowerCase() === low) return true
      if (v.part_number.toLowerCase() === low) return true
      if (v.name.toLowerCase() === low) return true
      if (v.display_title.toLowerCase() === low) return true
      if ((v.aliases ?? []).some((a) => a.toLowerCase() === low)) return true
      if ((v.part_aliases ?? []).some((a) => a.toLowerCase() === low)) return true
      return false
    }
    const identityMatches = candidates.filter(matchesIdentity)
    if (identityMatches.length === 0) return null
    // Narrow by preference, never reject: pasted category first (same part
    // number can exist under several categories), then pasted condition. If
    // the exact condition has no variant (e.g. "New Pull" pasted but only
    // `new` exists), fall back to the `new` variant, else the first match —
    // the catalog's category/condition win over the sheet's.
    const cat = filters.category?.toLowerCase()
    const byCategory = cat
      ? identityMatches.filter((v) => v.category_name.toLowerCase() === cat)
      : []
    const pool = byCategory.length > 0 ? byCategory : identityMatches
    if (filters.condition) {
      const exact = pool.find((v) => v.condition === filters.condition)
      if (exact) return exact
    }
    return pool.find((v) => v.condition === "new") ?? pool[0] ?? null
  } catch {
    return null
  }
}

/**
 * Look up all part numbers in a paste, pre-seed the TanStack Query cache for
 * matched variants' categories/OEMs, and build a category name→id map for
 * fallback resolution on unmatched rows.
 *
 * Shared by Quote and SO paste flows — surface-agnostic (no QuoteBuilderLineItem
 * or LocalLine types referenced here).
 */
export async function resolvePasteVariants(
  groups: PastedLineGroup[],
  qc: QueryClient,
): Promise<ResolvedPasteData> {
  // (partNumber, category, oem, condition) tuples — the same pn can appear
  // with different filter triples in one paste, and each tuple resolves
  // independently against the catalog.
  function rowFilters(r: PastedRow): VariantLookupFilters {
    return {
      category: r.category || undefined,
      oem: r.oem || undefined,
      condition: pastedConditionToCondition(r.condition),
    }
  }
  const pairs: Array<{ pn: string; filters: VariantLookupFilters }> = []
  for (const g of groups) {
    if (g.parent.partNumber) {
      pairs.push({ pn: g.parent.partNumber, filters: rowFilters(g.parent) })
    }
    for (const c of g.components) {
      if (c.partNumber) {
        pairs.push({ pn: c.partNumber, filters: rowFilters(c) })
      }
    }
  }
  const seen = new Set<string>()
  const uniquePairs = pairs.filter((p) => {
    const k = variantKey(p.pn, p.filters)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const variantMap = new Map<string, VariantListItem | null>()
  await Promise.all(
    uniquePairs.map(async ({ pn, filters }) => {
      variantMap.set(variantKey(pn, filters), await lookupVariant(pn, filters))
    }),
  )

  for (const v of variantMap.values()) {
    if (!v) continue
    if (v.category_id) {
      // Carry the BOM flag so the grid's "Add component" gate (which reads
      // the same category query) sees the right value without a refetch.
      qc.setQueryData(["ims", "categories", v.category_id], {
        id: v.category_id,
        name: v.category_name,
        is_bom_eligible: v.is_bom_eligible,
      })
    }
    if (v.oem_id) {
      qc.setQueryData(["ims", "oems", v.oem_id], {
        id: v.oem_id,
        name: v.oem_name,
      })
    }
  }

  const categoryNameToId = new Map<string, string>()
  try {
    const cats = await fetchAllCategoriesShort()
    for (const c of cats) categoryNameToId.set(c.name.toLowerCase(), c.id)
  } catch {
    // Non-fatal — category_id stays unset for this paste.
  }

  return { variantMap, categoryNameToId }
}

/**
 * Enforce "components only under a BOM-eligible category" on pasted groups.
 *
 * A pasted group is parent + the price-less rows beneath it. When the parent's
 * category is not BOM-eligible (or the parent has no resolvable category),
 * those rows must not become BOM children — each is promoted to its own
 * parent line instead. Eligibility comes from the matched variant when the
 * parent is a catalog part, else from the category record resolved by name
 * (fetched through the QueryClient so the grid's category query is warmed).
 *
 * Used by the Quote, Sales Order, and Close-Won paste flows — the rule is
 * identical across the three so a paste never produces a BOM under a part
 * that can't legitimately have one.
 */
export async function promoteComponentsOfNonBomParents(
  groups: PastedLineGroup[],
  resolved: ResolvedPasteData,
  qc: QueryClient,
): Promise<PastedLineGroup[]> {
  const { variantMap, categoryNameToId } = resolved

  async function parentIsBomEligible(parent: PastedRow): Promise<boolean> {
    const v = variantMap.get(
      variantKey(parent.partNumber, {
        category: parent.category || undefined,
        oem: parent.oem || undefined,
        condition: pastedConditionToCondition(parent.condition),
      }),
    ) ?? null
    if (v) return v.is_bom_eligible === true
    const catId = parent.category
      ? categoryNameToId.get(parent.category.toLowerCase())
      : undefined
    if (!catId) return false
    try {
      const cat = await qc.fetchQuery<Category>({
        queryKey: ["ims", "categories", catId],
        queryFn: () => fetchCategory(catId),
      })
      return cat.is_bom_eligible === true
    } catch {
      return false
    }
  }

  const out: PastedLineGroup[] = []
  for (const g of groups) {
    if (g.components.length === 0 || (await parentIsBomEligible(g.parent))) {
      out.push(g)
      continue
    }
    out.push({ parent: g.parent, components: [] })
    for (const c of g.components) out.push({ parent: c, components: [] })
  }
  return out
}

/** Maps a pasted condition string to the internal IMS condition value. */
export function pastedConditionToCondition(
  c: PastedCondition | undefined,
): string | undefined {
  if (!c) return undefined
  if (c === "New") return "new"
  if (c === "Refurbished") return "refurbished"
  if (c === "New Pull") return "new_pull"
  return undefined
}
