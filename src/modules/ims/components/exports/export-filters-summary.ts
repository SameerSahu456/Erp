import { humanizeEnum } from "@shared/lib/humanize-enum";

import { STOCK_STATUS_LABELS } from "../../constants";
import { EXPORT_CONDITION_LABEL } from "../../lib/export-labels";
import type { ExportFilters } from "../../lib/export-types";
import { EXPORTS_STRINGS as S } from "./exports.strings";

const F = S.filters;

/** How many ids a single + list filter pair names. */
const idCount = (single: string | null | undefined, list: string[] | null | undefined) =>
  (list?.length ?? 0) + (single ? 1 : 0);

/** "Category" for one, "3 categories" for several, null for none. */
const counted = (count: number, one: string, many: (n: number) => string) =>
  count === 0 ? null : count > 1 ? many(count) : one;

/** One-line summary of an export's filter snapshot. Id filters (category,
 *  OEM, warehouse) are named, not printed — the snapshot carries no labels,
 *  and a raw UUID is never shown. */
export function exportFiltersSummary(filters: ExportFilters): string {
  const parts: string[] = [];
  for (const label of [
    counted(idCount(filters.category_id, filters.category_ids), F.category, F.categories),
    counted(idCount(filters.oem_id, filters.oem_ids), F.oem, F.oems),
  ]) {
    if (label) parts.push(label);
  }
  if (filters.warehouse_id) parts.push(F.warehouse);
  if (filters.condition) {
    parts.push(`${F.condition}: ${EXPORT_CONDITION_LABEL[filters.condition] ?? humanizeEnum(filters.condition)}`);
  }
  if (filters.status) {
    parts.push(`${F.status}: ${STOCK_STATUS_LABELS[filters.status] ?? humanizeEnum(filters.status)}`);
  }
  if (filters.search) parts.push(`${F.search}: "${filters.search}"`);
  return parts.length > 0 ? parts.join(" · ") : F.none;
}
