// User-facing copy for the IMS › pm-assignments sub-feature form body.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy).
export const PM_ASSIGNMENT_STRINGS = {
  form: {
    productManagerLabel: "Product manager",
    categoryLabel: "Category",
    oemLabel: "Brand/OEM",
    conditionLabel: "Condition",
    notesLabel: "Notes",
    placeholders: {
      pm: "Select PM…",
      allCategories: "All categories (global PM)",
      allBrandOems: "All Brand/OEMs",
      notes: "Optional context, handover instructions, etc.",
    },
  },
} as const
