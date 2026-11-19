// Single source of truth for CRM account-attachment limits and the doc-type
// allow-list the backend's CRM_ACCOUNT EntityAttachmentPolicy enforces.
// Mirrors:
//   - comprint-erp-backend/app/shared/policies/attachment_policy.py
//       _DOCUMENT_MIMES + CRM_ACCOUNT_DOCUMENT_TYPES + CRM_ACCOUNT policy
//   - comprint-erp-backend/app/modules/crm/api/v1/endpoints.py
//       create_sales_order's `account_doc_*` File params (lead-branch only)
// When backend changes either, update here in the same PR.

export const ACCOUNT_DOC_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const ACCOUNT_DOC_ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const ACCOUNT_DOC_TYPES = [
  "pan_card",
  "gst_certificate",
  "aadhaar",
  "msme",
  "bank_statement",
] as const;

export type AccountDocumentType = (typeof ACCOUNT_DOC_TYPES)[number];

export const ACCOUNT_DOC_LABELS: Record<AccountDocumentType, string> = {
  pan_card: "PAN Card",
  gst_certificate: "GST Certificate",
  aadhaar: "Aadhaar",
  msme: "MSME Certificate",
  bank_statement: "Bank Statement",
};

// Tax-ID regexes — kept in sync with the validators on AccountInlineData /
// AccountCreate / AccountUpdate in comprint-erp-backend/app/modules/crm/schemas.
// PAN: 5 uppercase letters + 4 digits + 1 uppercase letter (e.g. ABCDE1234F)
export const ACCOUNT_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// GST: 2-digit state code + PAN + entity number + Z + check digit
// (e.g. 27ABCDE1234F1Z5)
export const ACCOUNT_GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const ACCOUNT_PAN_ERROR =
  "Invalid PAN format (expected e.g. ABCDE1234F)";
export const ACCOUNT_GST_ERROR =
  "Invalid GST format (expected e.g. 27ABCDE1234F1Z5)";
export const ACCOUNT_GST_REQUIRED = "GST number is required.";
