// Copy for the shared device-queue filter controls (§16.12).
export const DEVICE_QUEUE_FILTER_STRINGS = {
  placeholders: {
    allCategories: 'All Categories',
    allStatuses: 'All Statuses',
    searchStatus: 'Search status…',
    allGrades: 'All Grades',
    // Not a stock status: devices with a component still waiting to be checked.
    uncheckedComponents: 'Unchecked components',
    allEngineers: 'All Engineers',
    searchEngineer: 'Search engineer…',
    allBatches: 'All Batches',
    searchBatch: 'Search batch…',
    allVariants: 'All Variants',
    searchVariant: 'Search variant…',
  },
  gradeOption: (grade: string) => `Grade ${grade}`,
  selected: {
    /** Shown in the chip while the selected value's name loads. */
    resolving: '…',
    /** Shown when the selected value's name can't be resolved (e.g. 403). */
    engineer: 'Selected engineer',
    batch: 'Selected batch',
    variant: 'Selected variant',
  },
} as const
