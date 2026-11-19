// User-facing copy for the WMS › warehouses › assignment form dialog.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the dialog
// title, field labels, select/input placeholders, field-help copy, footer
// button labels, and the save-failure toast live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX. The component imports
// this single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `capabilitiesFixed`).
// The assignment role / level / capability enum→label maps stay in the
// component's ROLE_LABELS / LEVEL_LABELS / CAP_LABELS records (API-value
// keys), not here.
export const ASSIGNMENT_FORM_DIALOG_STRINGS = {
  // Dialog title — add vs edit.
  titleAdd: "Add Team Member",
  titleEdit: "Edit team member",

  // One-line context under the dialog title.
  descriptionAdd: (warehouse: string) => `Add a member who works with stock in ${warehouse}.`,
  descriptionEdit: "Update the level and notes for this person.",

  // Field labels (the required-marker "*" glyph stays inline in JSX).
  fields: {
    role: "Role",
    user: "User",
    level: "Level",
    notes: "Notes",
  },

  // Select / input placeholders.
  placeholders: {
    role: "Pick a role",
    user: "Select user…",
    userSearch: "Search users…",
    level: "Pick a level",
    notes: "Optional notes for the team.",
  },

  // Role field help — differs between edit (role is immutable) and add.
  roleHelpEdit: "Role can't be changed — remove and re-add to switch role.",
  roleHelpAdd: "Decides what this person can do with stock here.",

  // User field help — picked on add, locked on edit.
  userHelpAdd: "Only active users with this role appear here.",
  userHelpEdit: "Email cannot be changed from here.",

  // Footer buttons.
  cancel: "Cancel",
  saving: "Saving…",
  saveChanges: "Save changes",
  addMember: "Add Member",

  // Save-failure toast fallback (used when the thrown error has no message).
  saveError: "Failed to save assignment",
} as const;
