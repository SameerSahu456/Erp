import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";

import type { VariantListItem } from "../../api";
import { STOCK_STRINGS } from "./stock.strings";
import { CONDITION_DISPLAY } from "./stock-body-helpers";

const C = STOCK_STRINGS.columns;
const H = STOCK_STRINGS.columnHelp;

// BMT column key → /ims/variants sort field. Each entry sorts on exactly the
// value rendered in that column; unmapped keys are dropped, never sent (§11.1).
export const STOCK_SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  condition: "condition",
  price: "sell_price",
  inOps: "in_operations",
  allocated: "reserved",
  available: "available_net",
  expected: "expected",
  installed: "installed",
};

export const STOCK_CONDITION_FILTER_OPTIONS = Object.values(CONDITION_DISPLAY);

type NumericKey = keyof typeof H;
const numeric = (key: NumericKey, width: string, sortable = true): ColumnDef => ({
  key,
  label: C[key],
  sortable,
  align: "right",
  width,
  headerHelp: H[key],
});

/** Column set; Price hides when the payload omits `sell_price` (no ims:price_read). */
export function buildStockColumns(showPrice: boolean): ColumnDef[] {
  return [
    { key: "name", label: C.name, sortable: true, width: "220px" },
    { key: "description", label: C.description, width: "220px" },
    { key: "aliases", label: C.aliases, width: "180px" },
    { key: "oem", label: C.oem, filterable: true, width: "130px" },
    { key: "category", label: C.category, filterable: true, width: "140px" },
    { key: "condition", label: C.condition, sortable: true, filterable: true, width: "130px" },
    ...(showPrice
      ? [{ key: "price", label: C.price, sortable: true, align: "right" as const, width: "110px" }]
      : []),
    numeric("inOps", "100px"),
    numeric("allocated", "105px"),
    numeric("available", "110px"),
    numeric("expected", "100px"),
    // Not sortable: computed per page from rentals, no backend sort field.
    numeric("onRent", "95px", false),
    numeric("installed", "150px"),
  ];
}

/** One table row per variant (each row IS a variant with a stock_summary rollup). */
export function toStockRow(row: VariantListItem) {
  const summary = row.stock_summary;
  return {
    id: row.id,
    // Backend-built "<part_name> — <variant.name>".
    name: row.display_title,
    // Trim-check: the edit form stores "" for a blank variant description.
    description: (row.description?.trim() ? row.description : row.part_description) ?? null,
    // The variant's OWN aliases only — no fallback to the part's.
    aliases: row.aliases ?? [],
    oem: row.oem_name,
    category: row.category_name,
    condition: CONDITION_DISPLAY[row.condition] ?? row.condition,
    // Absent (not null) without ims:price_read; Number() is display-only.
    price: row.sell_price != null ? Number(row.sell_price) : null,
    inOps: summary.in_operations,
    allocated: summary.reserved,
    // Available-to-promise: net of commitments, never below 0 (same as the
    // variant detail page).
    available: Math.max(0, summary.available - summary.reserved),
    expected: row.expected_qty,
    onRent: row.on_rent_qty ?? 0,
    installed: summary.installed,
    _id: row.id,
    __variantId: row.id,
    __partId: row.part_id,
    __canEditPrice: row.can_edit_price,
    __previousPrice: row.previous_price,
    __priceChangedAt: row.price_changed_at,
  };
}

/** Variant detail (no stock-item detail page exists); `from` brings delete back here. */
export function stockRowHref(row: Record<string, unknown>): string | null {
  const variantId = row.__variantId as string | undefined;
  const partId = row.__partId as string | undefined;
  if (variantId && partId) return `/ims/parts/${partId}/variants/${variantId}?from=stock-items`;
  return partId ? `/ims/parts/${partId}?from=stock-items` : null;
}
