import { z } from "zod";

import { IMS_SEARCH_MAX_LEN } from "../constants";
import { compactExportFilters } from "./export-jobs";
import { STOCK_EXPORT_TYPES } from "./export-labels";
import type { ExportRequest } from "./export-types";

const pickedOption = z.object({ id: z.string(), label: z.string() });

/** "New export" dialog — search capped at the IMS backend `search` limit. */
export const newExportSchema = z.object({
  exportType: z.enum(["catalog", "stock_units", "stock_summary"]),
  format: z.enum(["xlsx", "csv"]),
  categoryIds: z.array(z.string()),
  oems: z.array(pickedOption),
  condition: z.enum(["new", "refurbished", "new_pull", ""]),
  warehouse: z.object({ id: z.string(), name: z.string() }),
  search: z
    .string()
    .trim()
    .max(IMS_SEARCH_MAX_LEN, `Search can be at most ${IMS_SEARCH_MAX_LEN} characters`),
});

export type NewExportValues = z.infer<typeof newExportSchema>;

export const NEW_EXPORT_DEFAULTS: NewExportValues = {
  exportType: "catalog",
  format: "xlsx",
  categoryIds: [],
  oems: [],
  condition: "",
  warehouse: { id: "", name: "" },
  search: "",
};

/** Form values → the request body; the warehouse applies to stock exports only. */
export function toExportRequest(values: NewExportValues): ExportRequest {
  const isStock = STOCK_EXPORT_TYPES.includes(values.exportType);
  return {
    export_type: values.exportType,
    format: values.format,
    filters: compactExportFilters({
      category_ids: values.categoryIds,
      oem_ids: values.oems.map((o) => o.id),
      condition: values.condition || null,
      warehouse_id: isStock ? values.warehouse.id : null,
      search: values.search,
    }),
  };
}
