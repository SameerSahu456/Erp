// User-facing copy for the WMS › operations checklist photo-field component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): empty-state copy,
// button labels, aria labels, dialog copy, and toast messages live here as one
// typed `as const` object instead of being hardcoded ("naked") in JSX. The
// component imports this single source so copy stays consistent and is edited
// in one place.
export const CHECKLIST_PHOTO_FIELD_STRINGS = {
  // Hint shown when the field renders on an op that never opened a run (no opId)
  noOpHint: 'File upload isn’t available for this operation.',

  // Inline indicator while a file upload is in flight
  uploading: 'Uploading…',

  // Per-photo row actions
  viewPhoto: 'View',
  removePhotoAria: 'Remove file',

  // Toast when a photo blob can't be opened
  openPhotoError: 'Could not open the file',

  // Count-limit guards — every checklist photo item on one operation shares a
  // single quota (backend `_WMS_OPS_DOC_BUCKET`, per-entity). Block before the
  // doomed per-file 422 instead of toasting once per rejected file.
  maxReached: (max: number) =>
    `You can attach at most ${max} files to this operation.`,
  limitPartial: (max: number, dropped: number) =>
    `Only ${max} files are allowed on this operation — ${dropped} file(s) were not added.`,

  // Per-field guards (e.g. a failed-check evidence field capped tighter than
  // the operation bucket): max count for this field, and max size per file.
  fieldMaxReached: (max: number) =>
    `You can attach at most ${max} files here.`,
  fieldLimitPartial: (max: number, dropped: number) =>
    `Only ${max} files are allowed here — ${dropped} file(s) were not added.`,
  // Count limit shown under the dropzone.
  countHint: (max: number) => `Up to ${max} files.`,

  // One summary toast after a batch upload (per-file success is silenced;
  // per-file errors still surface individually).
  photosUploaded: (n: number) =>
    n === 1 ? 'File uploaded' : `${n} files uploaded`,

  // Remove-photo confirmation dialog
  removeDialog: {
    title: 'Remove File?',
    confirmLabel: 'Remove',
    description: (documentName: string) =>
      `“${documentName}” will be removed from this checklist item.`,
  },
} as const
