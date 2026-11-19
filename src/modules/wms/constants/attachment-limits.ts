// Client-side attachment count caps for WMS upload surfaces.
//
// Mirrors the backend attachment policy (comprint-erp-backend
// `app/shared/policies/attachment_policy.py`). Each WMS entity declares exactly
// ONE MIME bucket, so every document_type slot on that entity shares a single
// quota, counted PER-BUCKET-PER-ENTITY across all slots — NOT per document_type
// (`attachment_service.py` counts `count_for_entity(...)` against
// `bucket.max_count`; the 422's "…already has N attachments of this type"
// means the MIME class, not the slot).
//
// We pre-check on the client so a batch never fires a doomed POST that 422s once
// per file (each of which the shared upload hook toasts). The backend stays the
// source of truth; these are a UX guard,
// so if a value drifts the server still rejects — it just does so less kindly.
export const WMS_ATTACHMENT_MAX = {
  /** grn_batches / dispatch_requests / warehouse_transfers → `_DISPATCH_DOC_BUCKET`
   *  (image + PDF, 20 files). Challan + invoice + inspection/eway/POD combined. */
  dispatchDoc: 20,
  /** warehouse_operations stage evidence + checklist photos → `_WMS_OPS_DOC_BUCKET`
   *  (image + PDF, 50 files). Every stage/checklist photo on the op combined. */
  operationPhoto: 50,
} as const
