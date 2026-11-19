// User-facing copy for DocumentUploadField.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const DOCUMENT_UPLOAD_FIELD_STRINGS = {
  // "required" asterisk accessible label.
  requiredAriaLabel: "required",
  // Empty (no-file) state button text.
  chooseFile: "Choose file",
  // Card variant: visible "Remove" label next to the X icon.
  remove: "Remove",
  // "Remove <filename>" — dynamic accessible label and aria-label.
  removeAriaLabel: (name: string) => `Remove ${name}`,
} as const
