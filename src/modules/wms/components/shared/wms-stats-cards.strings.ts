/** Copy for <WmsStatsCards />.
 *
 * The stat-card labels shown atop each WMS page, grouped by the scope they
 * belong to (matching STAT_CONFIG). Only the visible label wording lives here —
 * the card `key` values are API lookup keys (backend /wms/stats/{scope}), not
 * user-facing copy, so they stay in the component.
 */
export const WMS_STATS_CARDS_STRINGS = {
  inward: {
    draft: "Draft",
    completed: "Completed",
    cancelled: "Cancelled",
    total: "Total Batches",
  },
  devices: {
    in_inspection: "In Inspection",
    in_repair: "In Repair",
    in_qc: "In QC",
    total: "Total Devices",
  },
  inspection: {
    pending: "Pending",
    under_inspection: "Under Inspection",
    completed: "Completed",
  },
  repair: {
    in_repair: "In Repair",
    completed: "Completed",
    total: "Total Repairs",
  },
  spares: {
    open_requests: "Open Requests",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  },
  paint: {
    in_paint: "In Paint",
    at_vendor: "At Vendor",
    completed: "Completed",
    total: "Total",
  },
  qc: {
    pending_qc: "Pending QC",
    under_qc: "Under QC",
    completed: "Completed",
    passed: "Passed",
    failed: "Failed",
  },
  material_issue: {
    issued: "Issued",
    ready_for_dispatch: "Ready for Dispatch",
    returned: "Returned",
    total: "Total",
  },
  dispatch: {
    draft: "Draft",
    dispatched: "Dispatched",
    delivered: "Delivered",
    total: "Total",
  },
} as const;
