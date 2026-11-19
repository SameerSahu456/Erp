/** Copy for the shared dispatch documents field (used by BOTH the create form
 *  and the detail page, so the two surfaces read identically). */
export const DISPATCH_DOCUMENTS_STRINGS = {
  docType: "Document Type",
  upload: "Upload",
  view: "View",
  remove: "Remove document",
  removeTitle: "Remove This Document?",
  removeDesc: (name: string) =>
    `“${name}” will be removed from the document list.`,
  removeConfirm: "Remove",
  cancel: "Cancel",
  noDocs: "No documents attached yet.",
  uploading: "Uploading…",
  badType: (name: string) => `“${name}” isn’t a PDF, JPG, or PNG.`,
  tooBig: (name: string) => `“${name}” exceeds the 20 MB limit.`,
  // Count-limit guards — every document_type on an entity shares one quota
  // (backend `_DISPATCH_DOC_BUCKET`, per-entity). Block before the doomed
  // per-file 422 instead of toasting once per rejected file.
  maxReached: (max: number) =>
    `You can attach at most ${max} documents here.`,
  limitPartial: (max: number, dropped: number) =>
    `Only ${max} documents are allowed here — ${dropped} file(s) were not added.`,
} as const;
