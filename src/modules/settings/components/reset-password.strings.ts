// User-facing copy for the Settings › Reset Password dialog.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): dialog titles,
// field labels, placeholders, button labels, and validation/toast messages live
// here as one typed `as const` object instead of being hardcoded ("naked") in
// JSX/logic. The component imports this via a relative path.
//
// Dynamic copy is expressed as a function member (see `descriptionFor`).
export const RESET_PASSWORD_STRINGS = {
  dialogTitle: "Reset password",
  // Body text wraps the user name inline, so it is split into before/after
  // segments rather than a single string.
  descriptionBefore: "Set a new password for ",
  descriptionAfter:
    ". This signs them out of all active sessions and they must log in again with the new password.",
  newPasswordLabel: "New password *",
  newPasswordPlaceholder: "Min 8 chars",
  confirmPasswordLabel: "Confirm new password *",
  confirmPasswordPlaceholder: "Re-enter password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  cancelButton: "Cancel",
  resetPendingButton: "Resetting...",
  resetButton: "Reset password",
  validation: {
    passwordRequired: "New password is required.",
    passwordTooShort: (min: number) => `Password must be at least ${min} characters.`,
    passwordsMismatch: "Passwords do not match.",
  },
  toast: {
    fixHighlighted: "Please fix the highlighted fields.",
  },
} as const
