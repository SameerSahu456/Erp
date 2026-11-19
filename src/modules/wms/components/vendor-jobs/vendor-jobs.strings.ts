/** User-facing copy for the vendor-jobs queue (Coding-guideline §16.12 — no
 *  naked strings in components). Nothing here names a section: section labels
 *  come from `service_sections` rows. */
export const VENDOR_JOBS_STRINGS = {
  allSectionsTitle: "All Vendor Jobs",
  allSectionsSubtitle: "Every item currently with an outside vendor, across all sections",
  sectionSubtitle: (name: string) => `Items sent out to ${name} vendors`,
  sectionNotFound: {
    title: "Service section not found",
    description: "This section does not exist or is no longer active. Pick one from the sidebar.",
  },
  tabs: {
    awaiting_vendor: "Awaiting Vendor",
    with_vendor: "With Vendor",
    returned: "Returned",
    not_ok: "Returned — not OK",
    cancelled: "Cancelled",
    all: "All",
  },
  columns: {
    device: "Device",
    section: "Section",
    item: "Item",
    partNo: "Part No",
    serial: "Serial No",
    vendor: "Vendor",
    sent: "Sent",
    returned: "Returned",
    outcome: "Outcome",
    disposition: "Disposition",
    replacementSerial: "Replacement Serial",
    trip: "Trip",
    actions: "Actions",
  },
  outcome: { pass: "Pass", fail: "Not OK" },
  // Per-row queue actions, offered by the job's current stage (mirrors the
  // device-detail vendor-service cards).
  rowActions: {
    send: "Send to vendor",
    receive: "Receive",
    sendAgain: "Send again",
    cancel: "Cancel",
  },
  disposition: { repaired: "Repaired", replaced: "Replaced" },
  empty: {
    title: "Nothing here",
    body: "No vendor-service jobs match the current filters.",
  },
  error: {
    title: "Could not load vendor jobs",
    body: "Something went wrong fetching this list. Try again.",
    retry: "Retry",
  },
  searchPlaceholder: "Search device, item or serial…",
  vendorFilter: {
    label: "Vendor",
    all: "All vendors",
    search: "Search vendors…",
  },
} as const;
