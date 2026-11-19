import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

// Customer-deficiency display maps (return-by-count §9.4), keyed on the
// backend's DEFICIENCY_* literals.

export type DeficiencyType =
  | "missing_accessory"
  | "accessory_not_working"
  | "physical_damage"
  | "component_missing"
  | "locked_device"
  | "return_courier"
  | "device_not_returned"
  | "returned_after_loss_charge"
  | "other"

export const DEFICIENCY_TYPE_LABEL: Record<DeficiencyType, string> = {
  missing_accessory: "Accessory missing",
  accessory_not_working: "Accessory not working",
  physical_damage: "Physical damage",
  component_missing: "Component missing",
  locked_device: "Device locked",
  return_courier: "Return courier",
  device_not_returned: "Device not returned",
  returned_after_loss_charge: "Came back after a loss charge (credit)",
  other: "Other",
}

export const DEFICIENCY_TYPE_OPTIONS = (Object.keys(DEFICIENCY_TYPE_LABEL) as DeficiencyType[]).map(
  (value) => ({ value, label: DEFICIENCY_TYPE_LABEL[value] }),
)

export type DeficiencyStatus =
  | "open"
  | "charge_order_raised"
  | "invoiced"
  | "closed"
  | "waiver_pending"
  | "waived"
  | "recovered"

export const DEFICIENCY_STATUS_LABEL: Record<DeficiencyStatus, string> = {
  open: "Open",
  charge_order_raised: "Charge order raised",
  invoiced: "Invoiced",
  closed: "Closed",
  waiver_pending: "Waiver pending",
  waived: "Waived",
  recovered: "Recovered",
}

export const DEFICIENCY_STATUS_VARIANT: Record<DeficiencyStatus, StatusBadgeVariant> = {
  open: "warning",
  charge_order_raised: "info",
  invoiced: "success",
  closed: "neutral",
  waiver_pending: "warning",
  waived: "neutral",
  recovered: "success",
}
