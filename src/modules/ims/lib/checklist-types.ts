// The only checklist template types the product surfaces now: receiving-side
// (Inward QC) and dispatch-side (Outward QC). Inspection / Repair / Paint were
// retired (paint folded into vendor services), so they are hidden from every
// create Type dropdown (IMS Parts and WMS Checklist Management) and the WMS
// listing's type tabs — ONE list so those can't drift. Values are the exact
// backend type_codes (UPPERCASE) from GET /ims/checklist-types: they must match
// the `?type_code` filter and the list response's `type_counts` keys.
export const CHECKLIST_QC_TYPE_CODES = ["INWARD_QC", "OUTWARD_QC"] as const

export const isQcChecklistType = (code: string): boolean =>
  (CHECKLIST_QC_TYPE_CODES as readonly string[]).includes(code)
