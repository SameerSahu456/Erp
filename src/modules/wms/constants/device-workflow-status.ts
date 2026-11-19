// `stock_items.workflow_status` — a device's pipeline stage, in pipeline order.
// The DB CHECK's values minus `inspected`, which is never stored: a passed
// inspection goes straight to `pending_qc`. The Devices list Status filter sends
// one of these as `workflow_status`; any other pick is a stock status sent as
// `device_status`.
export const DEVICE_WORKFLOW_STATUSES = [
  'pending_inspection',
  'under_inspection',
  'in_repair',
  'at_external_vendor',
  'waiting_for_spares',
  'pending_qc',
  'under_qc',
  'awaiting_rack',
  'pending_return',
  'returned_to_vendor',
] as const

export const isWorkflowStatus = (value: string): boolean =>
  (DEVICE_WORKFLOW_STATUSES as readonly string[]).includes(value)
