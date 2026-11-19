/** Copy for the device-detail vendor-service cards (§16.12 — no naked strings).
 *  Nothing here names a section; section labels come from the master row. */
export const VENDOR_SERVICE_CARD_STRINGS = {
  raise: "Raise Vendor Request",
  // One consolidated card for every vendor-service job type.
  cardTitle: "Vendor Service",
  emptyAll: "No service requests for this unit.",
  loadFailed: "Couldn't load this unit's service requests.",
  emptyForSection: (name: string) => `No ${name} requests for this unit.`,
  trip: (n: number) => `Trip ${n}`,
  actions: {
    send: "Send to vendor",
    receive: "Receive",
    sendAgain: "Send again",
    cancel: "Cancel",
  },
  stage: {
    awaiting_vendor: "Awaiting Vendor",
    with_vendor: "With Vendor",
    returned: "Returned",
    cancelled: "Cancelled",
  },
  outcome: { pass: "Pass", fail: "Not OK" },
  disposition: { repaired: "Repaired", replaced: "Replaced" },
  raisedBy: (who: string, when: string) => `Raised by ${who} · ${when}`,
  raisedOn: (when: string) => `Raised ${when}`,
  cancelledReason: (why: string) => `Cancelled — ${why}`,
  instructionsLabel: "Instructions",
  sentOn: "Sent",
  returnedOn: "Returned",
  replacementSerial: "New serial",
  readOnlyNote: "Read-only — raise and dispatch happen on the Repair page.",
} as const
