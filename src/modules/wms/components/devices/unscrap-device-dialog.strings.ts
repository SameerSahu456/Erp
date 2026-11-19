export const UNSCRAP_DEVICE_DIALOG_STRINGS = {
  title: 'Reverse this scrap?',
  titleFor: (serial: string) => `Reverse scrap on ${serial}?`,
  description:
    'Overrules the engineer who condemned this device. Choose where it goes back to — the choice is limited to what is legal for this unit.',
  targetLabel: 'Restore to',
  targetPlaceholder: 'Select a destination',
  // Shown instead of the picker when scrap_prior_status is unknown/null —
  // D9's defensive fallback. Never render a broken/empty dialog.
  unknownStateTitle: 'No recorded pre-scrap state',
  unknownStateBody:
    'This device has no recorded pre-scrap state, so there is nothing safe to restore it to — a unit condemned mid-pipeline must not become sellable. Dispose of it, or ask a warehouse manager to review it.',
  cancel: 'Cancel',
  submit: 'Reverse scrap',
  saving: 'Reversing…',
  // Trigger tooltip when the action is disabled entirely (same copy as the
  // dialog's own fallback, so the two never disagree).
  disabledTooltip: 'No recorded pre-scrap state, so there is nothing safe to restore this device to.',
  targets: {
    available: 'Available (sellable)',
    inspection: 'Inspection',
    repair: 'Repair',
  },
} as const
