import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";
import { EMPTY_VALUE } from "@/shared/constants";

import type { FlatPartRow } from "../../api";
import { PARTS_STRINGS } from "./parts.strings";
import { CONDITION_DISPLAY } from "./parts-body-helpers";

const C = PARTS_STRINGS.list.columns;

export const PARTS_NEW_PATH = "/ims/parts/new";

// BMT column key → backend sort field. The backend `sort` is a Literal, so only
// columns mapped here are `sortable`; unknown keys are dropped (§11.1).
export const PARTS_SORT_FIELD_MAP: Record<string, string> = {
  sku: "part_number",
  qty: "available_stock_qty",
};

// Condition uses BMT's stock dropdown, so its display options live here.
export const PARTS_CONDITION_FILTER_OPTIONS = Object.values(CONDITION_DISPLAY);

/** Column set; Price hides when the payload omits it, Actions for read-only users. */
export function buildPartsColumns(opts: { showPrice: boolean; canWrite: boolean }): ColumnDef[] {
  return [
    { key: "sku", label: C.partNo, sortable: true },
    { key: "description", label: C.description },
    { key: "type", label: C.type },
    { key: "condition", label: C.condition, filterable: true },
    { key: "aliases", label: C.alias },
    { key: "category", label: C.category, filterable: true },
    { key: "brand", label: C.brand, filterable: true },
    { key: "qty", label: C.qty, sortable: true, align: "right" },
    // Not sortable: read from the stock_summary JSONB, outside the backend sort set.
    { key: "installedQty", label: C.installedQty, align: "right" },
    // The row's price edits the default variant only — the header help says so.
    ...(opts.showPrice
      ? [{ key: "price", label: C.price, align: "right" as const, headerHelp: C.priceHelp }]
      : []),
    ...(opts.canWrite ? [{ key: "actions", label: C.actions, align: "right" as const }] : []),
  ];
}

function conditionLabel(r: FlatPartRow): string {
  if (r.row_type !== "variant") return PARTS_STRINGS.list.dash;
  return CONDITION_DISPLAY[r.condition ?? ""] ?? r.condition ?? EMPTY_VALUE;
}

/** One table row per flat API row; `_id` is the variant id on variant rows. */
export function toPartRow(r: FlatPartRow) {
  const isVariant = r.row_type === "variant";
  return {
    sku: r.code,
    description: r.description ?? EMPTY_VALUE,
    type: isVariant ? PARTS_STRINGS.list.rowType.variant : PARTS_STRINGS.list.rowType.parent,
    aliases: r.aliases ?? [],
    category: r.category ?? EMPTY_VALUE,
    brand: r.oem ?? EMPTY_VALUE,
    condition: conditionLabel(r),
    qty: Number(r.qty ?? 0),
    installedQty: Number(r.installed_qty ?? 0),
    price: r.price != null ? Number(r.price) : null,
    _id: isVariant ? (r.variant_id as string) : r.part_id,
    _kind: isVariant ? "variant" : "part",
    _partId: r.part_id,
    _label: r.description ?? r.code,
  };
}

/** Detail route for a table row (variant rows open the variant under its part). */
export function partRowHref(row: Record<string, unknown>): string {
  const id = row._id as string;
  const partId = (row._partId as string | undefined) ?? id;
  return row._kind === "variant" ? `/ims/parts/${partId}/variants/${id}` : `/ims/parts/${id}`;
}
