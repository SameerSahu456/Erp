export const SCRAP_DEVICE_DIALOG_STRINGS = {
  title: 'Scrap this device?',
  titleFor: (serial: string) => `Scrap ${serial}?`,
  // Plain about BOTH halves (device-scrap D1/D9): it leaves sellable stock
  // right away, but it is NOT the irreversible step — a store manager can
  // reverse it any time before disposal.
  description:
    'This takes the device out of sellable stock immediately. It stays exactly where it is — placing or disposing of it is a separate step. A store manager can reverse this at any time before it is disposed.',
  reasonLabel: 'Reason',
  reasonPlaceholder: 'e.g. Motherboard fried — unrepairable',
  reasonHelp: 'Required. The store manager sees this when deciding whether to reverse it.',
  cancel: 'Cancel',
  submit: 'Scrap device',
  saving: 'Scrapping…',
} as const
