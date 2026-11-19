export const DISPOSE_DEVICE_DIALOG_STRINGS = {
  title: 'Dispose this device?',
  titleFor: (serial: string) => `Dispose ${serial}?`,
  // Disposal is the ONE irreversible step in device scrap (D2), which is
  // invisible unless the copy says so.
  description:
    'This permanently writes the unit off the books and frees its shelf slot. The manufacturer serial can NEVER be re-inwarded after this — there is no undo.',
  reasonLabel: 'Reason',
  reasonPlaceholder: 'e.g. Sent to e-waste recycler',
  reasonHelp: 'Required. Recorded on the device history because disposal cannot be undone.',
  cancel: 'Keep it',
  submit: 'Dispose device',
  saving: 'Disposing…',
} as const
