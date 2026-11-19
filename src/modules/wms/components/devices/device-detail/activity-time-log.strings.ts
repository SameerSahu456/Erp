// User-facing copy for the WMS › devices › Activity / Time Log card.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the card title,
// error/empty text, summary-stat labels, table column headers, in-row status
// annotations, and the footnote live here as one typed `as const` object
// instead of being hardcoded ("naked") in the component.
//
// NOT included (correctly sourced elsewhere): the `vs_avg` / `status` API enum
// values used in comparisons, and pure placeholder/separator glyphs (— / etc.).
// The STAGE_LABEL enum→label map now lives below as its own export.
export const ACTIVITY_TIME_LOG_STRINGS = {
  card: {
    title: 'Activity / Time Log',
  },

  // Error / empty states.
  error: 'Couldn’t load the time log.',
  retryLabel: 'Retry',
  empty: 'No stages recorded yet.',

  // Summary-strip stat labels.
  summary: {
    totalHandling: 'Total Handling',
    fleetAvgDevice: 'Fleet Avg / Device',
    stagesCompleted: 'Stages Completed',
  },

  // Table column headers (rendered in order).
  table: {
    columns: ['Stage', 'Operator', 'Completed', 'Time Taken'],
  },

  // In-row status annotations.
  status: {
    cancelled: '(cancelled)',
    inProgress: 'In progress',
  },

  footnote: 'Stage time is measured between device status transitions.',
} as const

/** Operation-type → stage display label (§16.12 bucket 2). A vendor-service row
 *  overrides this with its section name (every section shares `vendor_service`). */
export const ACTIVITY_TIME_LOG_STAGE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  repair: 'Repair',
  qc: 'Quality Control',
  vendor_service: 'Vendor Service',
  rack_assign: 'Rack Assign',
}
