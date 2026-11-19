import type { ReplacementUnitSelection } from "../../components/replacement-requests/replacement-request-form.schema"

/** One row is one physical unit → one line item, pinned to that unit's DRI —
 *  or, for a legacy unit with no dispatch record, to its rental device. */
export function toReplacementLineItems(units: ReplacementUnitSelection[]) {
  return units.map((u) => ({
    sales_order_item_id: u.salesOrderItemId,
    // A component line takes its replaced part from the device's contents.
    // A legacy unit's line has no variant; it names the rental device, and
    // the catalog part it is when the operator chose one.
    ...(u.target === "unit"
      ? u.rentalDeviceId
        ? {
            original_rental_device_id: u.rentalDeviceId,
            ...(u.replacedVariantId ? { replaced_variant_id: u.replacedVariantId } : {}),
          }
        : { replaced_variant_id: u.replacedVariantId }
      : {
          target: "component" as const,
          swap_location: u.swapLocation,
          ...(u.swapLocation === "in_house"
            ? { in_house_return: u.inHouseReturn ?? ("device" as const) }
            : {}),
          stock_item_component_id: u.stockItemComponentId ?? null,
          component_description: u.componentDescription?.trim() || null,
          component_part_number: u.componentPartNumber?.trim() || null,
        }),
    quantity: 1 as const,
    ...(u.dispatchRequestItemId
      ? { original_dispatch_request_item_id: u.dispatchRequestItemId }
      : {}),
    generation: u.generation,
    replacement_decision: u.decision,
    ...(u.decision === "different_part"
      ? {
          replacement_part_variant_id: u.replacementVariantId,
          replacement_rate: u.replacementRate,
        }
      : {}),
    // Per-line complaint.
    issue_reason: u.issueReason.trim() || null,
    return_owed: u.returnOwed,
    ...(u.returnOwed ? {} : { return_waived_reason: u.returnWaivedReason }),
  }))
}

/** Id of the first invalid field, in on-screen order (§14.5 — no nested ternary). */
export function firstReplacementErrorTarget(
  formErrors: { salesOrderId?: unknown; units?: unknown; reason?: unknown },
  firstBadUnit: number,
): string | null {
  return (
    [
      formErrors.salesOrderId && "rr-field-order",
      firstBadUnit >= 0 && `rr-unit-${firstBadUnit}`,
      formErrors.units && "rr-units-card",
      formErrors.reason && "reason",
    ].find((t): t is string => typeof t === "string") ?? null
  )
}
