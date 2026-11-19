import { type AttachmentWire } from "@modules/attachments"

export const PO_ENTITY_TYPE = "purchase_orders"
export const INVOICE_DOC_TYPE = "supplier_invoice"
export const PO_DOC_MIMES = ["application/pdf", "image/jpeg", "image/png"] as const
// Mirrors the backend document bucket (attachment_policy.py): 20 MB per file.
export const PO_DOC_MAX_BYTES = 20 * 1024 * 1024
// Human-readable supported-formats + size hint shown next to the uploader.
export const PO_DOC_HINT = "PDF, JPG or PNG · up to 20 MB per file"
// Approx height of one document row (li p-3 + size-9 icon) plus the space-y-2
// gap, so `visibleRows` maps to a max-height that shows that many rows.
export const DOC_ROW_REM = 4.25

/** One document, normalised across the live (uploaded) and staged (File) cases
 *  so the list renders identically in both. */
export interface DocRow {
  id: string
  name: string
  type: string
  wire?: AttachmentWire
  file?: File
  index?: number
}
