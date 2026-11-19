// User-facing copy for the WMS › devices › Inspection & QC (Checklist Runs) card.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the card title,
// button/aria labels, section labels, the run-title / file-kind fallbacks, and
// the canonical answer-value display words live here as one typed `as const`
// object instead of being hardcoded ("naked") in the component.
//
// NOT included (correctly sourced elsewhere): the OUTCOME_VARIANT / RESULT_VARIANT
// / GRADE_VARIANT badge-variant maps and their status keys (API values, not copy),
// className / variant / tone props, DOM ids, data-* attributes, and pure
// separator/placeholder glyphs (· / # — ,). The STAGE_LABEL / OUTCOME_LABEL /
// RESULT_LABEL enum→label maps now live below as their own exports.
export const CHECKLIST_RUNS_CARD_STRINGS = {
  card: {
    title: 'Operations',
  },

  // Run duration shown to the minute — a sub-minute run reads "<1m" rather than
  // a to-the-second "45s" (the completed-op line shows date + time, not seconds).
  subMinute: '<1m',

  // Photo/attachment file-card actions.
  photo: {
    view: 'View',
    download: 'Download',
  },

  // Section labels inside an expanded run.
  sections: {
    notes: 'Notes',
    stagePhotos: 'Stage photos',
    // Toggle shown under a long note that is clamped to a few lines.
    showMore: 'Show more',
    showLess: 'Show less',
  },

  // Prefix for the QC pass-tier badge shown beside the run's outcome (the tier
  // letter — A/B — is data, appended after this label: "Grade A").
  grade: 'Grade',

  // Fallbacks when the source data can't name the thing.
  fallback: {
    runTitle: 'Checklist',
    fileKind: 'File',
  },

  // Canonical boolean / select answer values rendered as readable words.
  answers: {
    yes: 'Yes',
    no: 'No',
    notApplicable: 'N/A',
  },
} as const

/** Stage → run-title label (§16.12 bucket 2). */
export const CHECKLIST_STAGE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  qc: 'QC',
  outward_qc: 'Outward QC',
  repair: 'Repair',
  paint: 'Paint',
  rack_assign: 'Rack Assign',
}

/** Operation outcome (the operator's real verdict) → badge label. */
export const CHECKLIST_OUTCOME_LABELS: Record<string, string> = {
  pass: 'Pass',
  fail: 'Failed',
  na: 'N/A',
}

/** Checklist-run result (fallback when the op has no outcome yet) → badge label. */
export const CHECKLIST_RESULT_LABELS: Record<string, string> = {
  PASS: 'Pass',
  FAIL: 'Failed',
  NEEDS_REWORK: 'Needs rework',
}
