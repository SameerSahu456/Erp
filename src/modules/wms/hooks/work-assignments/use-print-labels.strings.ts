/** Copy for the label-print hook (§16.12) — hook copy lives beside the hook,
 *  not in a component strings file. */
export const USE_PRINT_LABELS_STRINGS = {
  nothingToPrint: 'Nothing to print — every device in this lot is already labelled',
  failed: 'Could not print labels',
  /** Download file names for the generated PDFs. */
  fileName: {
    lot: (id: string) => `labels-${id}.pdf`,
    /** Fallback name before a lot-specific one is known. */
    default: 'labels.pdf',
  },
} as const
