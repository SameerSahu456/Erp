// User-facing copy for the WMS › operations checklist-fields component.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): field labels,
// button labels, and input placeholders live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX. The component imports
// this single source so copy stays consistent and is edited in one place.
export const CHECKLIST_FIELDS_STRINGS = {
  // Canonical Pass/Fail button labels (header). N/A was removed per CP-462.
  passFailNa: {
    pass: 'Pass',
    fail: 'Fail',
  },

  // Note field shown for a failed canonical item
  failNotePlaceholder: 'What failed? (optional note)',
  failNoteCounter: (n: number, max: number) => `${n}/${max}`,

  // Evidence photo box shown for a failed canonical item (optional)
  failPhotoLabel: 'Evidence photo',

  // Per-kind input controls
  booleanYes: 'Yes',
  textPlaceholder: 'Enter a response…',
  numericPlaceholder: 'Enter a number…',
  selectPlaceholder: 'Select an option…',
  searchOptions: 'Search options…',
} as const
