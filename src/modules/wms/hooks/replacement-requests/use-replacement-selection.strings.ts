// Toast copy for the bulk decisions on the replacement-request detail page.
export const REPLACEMENT_SELECTION_STRINGS = {
  rejected: (n: number) => `${n} unit${n === 1 ? "" : "s"} rejected`,
  partlyRejected: (done: number, total: number) =>
    `${done} of ${total} units rejected. The rest are still selected.`,
} as const
