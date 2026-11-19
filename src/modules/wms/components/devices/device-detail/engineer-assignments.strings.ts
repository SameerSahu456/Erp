// User-facing copy for the WMS › devices › Engineer Assignments sub-section.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): the sub-section
// heading, per-stage slot field labels, assign-dropdown placeholders, and the
// "not ready to assign yet" helper texts live here as one typed `as const`
// object instead of being hardcoded ("naked") in the component.
//
// NOT included (correctly sourced elsewhere): the stage codes
// ('inspection' | 'qc' | 'repair') — API enum values used in comparisons, not
// display copy — plus className strings and Typography variant/tone prop values.
export const ENGINEER_ASSIGNMENTS_STRINGS = {
  // Sub-section heading.
  sectionTitle: 'Engineer Assignments',

  // Per-stage slot field labels. Stage-based (not level-based): under dynamic
  // assignment any engineer level can fill any stage, so the slot names the
  // STAGE and the engineer's level shows as a badge in the dropdown.
  labels: {
    inspection: 'Inspection Engineer',
    qc: 'QC Engineer',
    repair: 'Repair Engineer',
  },

  // Assign-dropdown placeholders.
  placeholders: {
    inspection: 'Assign engineer…',
    qc: 'Assign QC engineer…',
    repair: 'Assign repair engineer…',
  },

  // "Not ready to assign yet" helper texts.
  notReady: {
    repairStage: 'Not at repair yet',
    qcStage: 'Assignable at QC stage',
    fallback: 'Not at this stage yet',
    // Shown on a read-only earlier-stage slot (e.g. L1/L2 while under QC) when
    // no engineer was ever recorded for that stage.
    notRecorded: 'Not recorded',
  },
} as const
