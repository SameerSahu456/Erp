export const USE_STOCK_TRANSFER_STRINGS = {
  relocateSuccess: (count: number, location: string) =>
    `${count} unit${count === 1 ? "" : "s"} moved to ${location}`,
  transferSentSuccess: (count: number, warehouse: string) =>
    `${count} unit${count === 1 ? "" : "s"} sent to ${warehouse}`,
  unitPlaced: "Unit received",
  unitFlagged: "Unit sent to inspection",
  unitLost: "Unit written off as lost in transit",
  unitReturned: "Unit returned to source",
  unitRemoved: "Unit removed from the transfer",
  errorFallback: "Could not complete that stock move.",
} as const;
