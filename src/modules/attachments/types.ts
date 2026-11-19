// Wire shape mirrors comprint-erp-backend/app/shared/schemas/attachment.py
// AttachmentResponse. Keep in lockstep with the backend; regenerate via
// `pnpm api:gen` if the schema drifts.
export interface AttachmentWire {
  id: string
  document_name: string
  /** Domain-specific kind tag, e.g. "pan_card", "gst_certificate", "image". */
  document_type: string
  /** MIME type (application/pdf, image/png, etc.). */
  content_type: string
  size_bytes: number
  /** Entity discriminator string — see EntityType below. */
  entity_type: string
  entity_id: string
  parent_id: string | null
  uploaded_by: string
  /** ISO-8601 UTC. Render with formatIST_date / DateDisplay. */
  created_at: string
  /**
   * Legacy alias — mirrors `download_url`. New code should pick `preview_url`
   * for inline display and `download_url` for save-as. Kept for callers that
   * predate the backend split (commit `12843c9`).
   */
  url: string
  /**
   * Direct-fetch URL for `<img src>` / `<embed>`. Presigned 24h on S3;
   * falls back to the auth-proxied `/download` endpoint on local-disk
   * storage (which the browser can't authenticate against from `<img>`).
   */
  preview_url: string
  /**
   * "Save as" URL with `Content-Disposition: attachment` baked in.
   * Same S3 vs local-disk split as preview_url.
   */
  download_url: string
}

/**
 * Entity-type discriminator strings accepted by the backend's attachment
 * router. The backend's KNOWN_ENTITY_TYPES set is the source of truth — keep
 * this union in lockstep when new entity types come online.
 */
export type EntityType =
  | "crm_account"
  | "crm_lead"
  | "crm_deal"
  | "ims_part"
  | "ims_part_variant"
  | "dispatch_requests"
  | "warehouse_operations"
  | "grn_batches"
  | "purchase_orders"
  // Paperwork that travels with a warehouse transfer: delivery_challan /
  // eway_bill / pod. No invoice slot — a transfer between our own warehouses
  // is not a sale (stock-transfer spec D15).
  | "warehouse_transfers"
  // The customer's shipping paperwork on a sales return they ship back.
  | "sales_return_requests"
  // Rentals — the countersigned rental agreement, filed against the
  // AGREEMENT row rather than a signature row: one scan carries every
  // party's signature, and each `rental_agreement_signatures` row points
  // its `attachment_id` at that same file.
  | "rental_agreements"
  // Rentals — the customer's PO document, one per PO row (the first PO and
  // every extension), so each PO keeps its own paper.
  | "rental_purchase_orders"
