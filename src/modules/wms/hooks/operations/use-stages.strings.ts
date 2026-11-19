// User-facing toast copy for the WMS stage-operation mutation hooks (§16.12).
//
// One typed source for the success-toast strings fired by the stage hooks
// (repair / QC / scrap / spare mutations), so the copy lives in a
// centralized constant instead of naked string literals at each toast site.
export const USE_STAGES_STRINGS = {
  repair: {
    started: 'Repair started',
    completed: 'Repair completed',
    cancelled: 'Repair cancelled',
  },
  qc: {
    started: 'QC started',
    completed: 'QC completed',
    cancelled: 'QC cancelled',
  },
  scrap: {
    done: 'Device scrapped',
    placed: 'Scrapped device placed',
    reversed: 'Scrap reversed',
    disposed: 'Device disposed',
  },
  spare: {
    created: 'Spare request created',
    fulfilled: 'Spare request fulfilled',
    cancelled: 'Spare request cancelled',
  },
} as const
