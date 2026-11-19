// Single source of truth for Sales Order attachment types and limits.
// Mirrors:
//   - comprint-erp-backend/app/shared/policies/attachment_policy.py
//       _SO_ATTACHMENT_MIMES + _SO_ATTACHMENT_BUCKET +
//       SO_ATTACHMENT_DOCUMENT_TYPES + ATTACHMENT_LABEL_MAX_LEN
//   - comprint-erp-backend/app/modules/crm/schemas/sales_order.py
//       SalesOrderAttachmentMeta (`others` requires document_label)
// When backend changes either, update here in the same PR.

export const SO_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB per file
export const SO_ATTACHMENT_MAX_COUNT = 30; // per sales order, across all types
export const SO_ATTACHMENT_LABEL_MAX_LEN = 100;

export const SO_ATTACHMENT_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const SO_ATTACHMENT_TYPES = [
  "so",
  "po_upload",
  "screenshot",
  "contract",
  "proforma",
  "others",
] as const;

export type SoAttachmentType = (typeof SO_ATTACHMENT_TYPES)[number];

// `others` is the free-text slot — the user names it themselves and the name
// is carried in `document_label`, not here.
export const SO_ATTACHMENT_OTHERS: SoAttachmentType = "others";

export const SO_ATTACHMENT_LABELS: Record<SoAttachmentType, string> = {
  so: "SO",
  po_upload: "PO upload",
  screenshot: "Screenshot",
  contract: "Contract",
  proforma: "Proforma",
  others: "Others",
};
