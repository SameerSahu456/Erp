// Free-form attachment rules for CRM leads & deals. Mirrors the backend
// policy registered for entity_type `crm_lead` / `crm_deal`
// (app/shared/policies/attachment_policy.py → _CRM_DOC_BUCKET): PDF + images
// + Office docs, 20 MB per file, up to 20 files per entity. Keep these in
// lockstep with that bucket so client-side validation matches the server.

/** Max bytes per file — must equal the backend bucket's `max_bytes`. */
export const CRM_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024

/** Max files per lead/deal — must equal the backend bucket's `max_count`. */
export const CRM_ATTACHMENT_MAX_COUNT = 20

/** Allowed MIME types — must be a subset of the backend bucket's allowlist. */
export const CRM_ATTACHMENT_ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

/** `accept` attribute for the file <input> — extensions + MIME types. */
export const CRM_ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx," +
  CRM_ATTACHMENT_ALLOWED_MIMES.join(",")

/** Free-form attachments have no document slots; tag every upload with this. */
export const CRM_ATTACHMENT_DOCUMENT_TYPE = "attachment"
