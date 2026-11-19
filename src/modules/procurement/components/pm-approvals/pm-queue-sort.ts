/**
 * Server sort for the PM Approvals queue tabs: table column key → the
 * endpoint's allow-listed `sort` field. Only these columns are clickable, and
 * the URL `<tab>_sort` is validated against the same keys (§11.1). Kept out of
 * the component files so they only export components (fast refresh).
 */
export const PO_SORT: Record<string, string> = {
  po_number: "po_number",
  grand_total: "grand_total",
  created_at: "created_at",
}
export const PO_SORT_KEYS = Object.keys(PO_SORT)
