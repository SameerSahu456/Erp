// User-facing copy for the WMS › operations stage-photo-upload component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the default
// field label, status line, button labels, and aria labels live here as one
// typed `as const` object instead of being hardcoded ("naked") in JSX. The
// component imports this single source so copy stays consistent and is edited
// in one place.
export const STAGE_PHOTO_UPLOAD_STRINGS = {
  // Default label when the parent doesn't pass one via the `label` prop
  defaultLabel: 'Photo evidence',

  // Status line beside the field label
  atLeastOneRequired: 'At least 1 required',
  // Shown in place of atLeastOneRequired when the field is optional
  optional: 'Optional',
  countAdded: (count: number) => `${count} added`,

  // Per-photo (buffered file) row
  fileSize: (kilobytes: string) => `${kilobytes} KB`,
  viewPhoto: 'View',
  removePhotoAria: 'Remove photo',

  // Count-limit guards — the buffered photos all upload to one operation, which
  // shares a single quota (backend `_WMS_OPS_DOC_BUCKET`, per-entity). Cap the
  // buffer so the operator can't stage more than the server will accept.
  maxReached: (max: number) => `You can attach at most ${max} photos.`,
  limitPartial: (max: number, dropped: number) =>
    `Only ${max} photos are allowed — ${dropped} file(s) were not added.`,
  // Per-file size cap (when the parent passes `maxSizeMb`).
  tooLarge: (max: number, dropped: number) =>
    `${dropped} file(s) over ${max} MB were not added.`,
} as const
