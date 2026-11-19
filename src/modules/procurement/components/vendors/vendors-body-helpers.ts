import type { VendorSortField } from "../../api"


export const ALL = "__all__"

// Table column key → API sort field. Columns without an entry aren't sortable
// server-side (the vendor list endpoint only orders by these).
export const SORT_FIELD_MAP: Record<string, VendorSortField> = {
  code: "code",
  name: "name",
  created_at: "created_at",
}
