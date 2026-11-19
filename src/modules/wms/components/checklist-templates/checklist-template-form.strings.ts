// User-facing copy for the WMS › checklist-templates form body.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the naked strings
// left over in ChecklistTemplateFormBody — the assign-to-level option labels,
// the preview-dialog fallback name, and the edit-mode heading — live here as one
// typed `as const` object. The component imports via a relative path.
//
// Dynamic copy is expressed as a function member (see `editHeading`).
export const CHECKLIST_TEMPLATE_FORM_STRINGS = {
  // Assign-to-level select option labels (value → label).
  levelOptions: {
    category: "Category",
    part: "Part",
  },

  // Fallback name shown in the preview dialog when the form has no name yet.
  untitledChecklist: "Untitled checklist",

  // Edit-mode page heading; `nameFallback` fills in when the loaded template
  // has no name.
  editHeading: (name: string) => `Edit ${name}`,
  nameFallback: "Checklist",
} as const
