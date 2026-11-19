import type { FieldErrors, UseFormSetValue } from "react-hook-form"

import type {
  ReplacementRequestFormInput,
  ReplacementUnitSelection,
} from "../../components/replacement-requests/replacement-request-form.schema"
import {
  normalizePick,
  type ReplacementRowUnit,
} from "../../components/replacement-requests/replacement-unit-table-helpers"

function newPick(u: ReplacementRowUnit): ReplacementUnitSelection {
  return {
    rowKey: u.unitKey,
    unitKey: u.unitKey,
    dispatchRequestItemId: u.dispatch_request_item_id,
    rentalDeviceId: u.no_dispatch_record ? (u.rental_device_id ?? null) : null,
    salesOrderItemId: u.sales_order_item_id ?? "",
    replacedVariantId: u.part_variant_id,
    generation: u.generation,
    serial: u.internal_serial ?? "",
    label:
      u.variant_name && u.variant_name !== u.part_name
        ? `${u.part_name} · ${u.variant_name}`
        : u.part_name,
    decision: "same_part" as const,
    issueReason: "",
    returnOwed: true,
    target: "unit" as const,
  }
}

/** Another part of the same device: same device and swap place, its own part. */
function newExtraPart(first: ReplacementUnitSelection): ReplacementUnitSelection {
  return {
    rowKey: crypto.randomUUID(),
    unitKey: first.unitKey,
    dispatchRequestItemId: first.dispatchRequestItemId,
    rentalDeviceId: first.rentalDeviceId,
    salesOrderItemId: first.salesOrderItemId,
    replacedVariantId: first.replacedVariantId,
    generation: first.generation,
    serial: first.serial,
    label: first.label,
    decision: first.swapLocation === "on_site" ? "same_part" : "to_be_decided",
    issueReason: "",
    returnOwed: first.returnOwed,
    returnWaivedReason: first.returnWaivedReason,
    target: "component",
    swapLocation: first.swapLocation,
    inHouseReturn: first.inHouseReturn,
  }
}

const isFirst = (u: ReplacementUnitSelection) => u.rowKey === u.unitKey

/** What a device's first part passes on to its other parts: they are swapped
 *  in the same place and owe back the same way. */
function sharedWithParts(patch: Partial<ReplacementUnitSelection>) {
  const shared: Partial<ReplacementUnitSelection> = {}
  if ("swapLocation" in patch) shared.swapLocation = patch.swapLocation
  if ("inHouseReturn" in patch) shared.inHouseReturn = patch.inHouseReturn
  if ("returnOwed" in patch) shared.returnOwed = patch.returnOwed
  if ("returnWaivedReason" in patch) shared.returnWaivedReason = patch.returnWaivedReason
  return shared
}

interface UnitPicksArgs {
  units: ReplacementUnitSelection[]
  setValue: UseFormSetValue<ReplacementRequestFormInput>
  errors: FieldErrors<ReplacementRequestFormInput>
}

/** Picked-line list ops (toggle / select-all / patch / extra parts) and
 *  per-line error lookup. A device's first pick is keyed by its `unitKey`. */
export function useReplacementUnitPicks({ units, setValue, errors }: UnitPicksArgs) {
  const write = (next: ReplacementUnitSelection[]) =>
    setValue("units", next, { shouldValidate: true })
  // Each ticked device's first pick, keyed on its unit key.
  const picks = new Map(units.filter(isFirst).map((u) => [u.unitKey, u]))

  const extrasOf = (unitKey: string) =>
    units.filter((u) => u.unitKey === unitKey && !isFirst(u))

  // Unticking a device drops every part picked on it.
  const toggleUnit = (u: ReplacementRowUnit, on: boolean) =>
    write(on ? [...units, newPick(u)] : units.filter((s) => s.unitKey !== u.unitKey))

  // Header select-all: pick every free visible unit in, or clear them.
  const setManyUnits = (us: ReplacementRowUnit[], on: boolean) => {
    const keys = new Set(us.map((u) => u.unitKey))
    write(
      on
        ? [...units, ...us.filter((u) => !picks.has(u.unitKey)).map(newPick)]
        : units.filter((s) => !keys.has(s.unitKey)),
    )
  }

  const patchUnit = (rowKey: string, patch: Partial<ReplacementUnitSelection>) => {
    const first = units.find((u) => u.rowKey === rowKey)
    const deviceKey = first && isFirst(first) ? first.unitKey : null
    // Back to the whole device: the other parts no longer apply.
    const kept =
      deviceKey && patch.target === "unit"
        ? units.filter((u) => u.unitKey !== deviceKey || isFirst(u))
        : units
    const shared = deviceKey ? sharedWithParts(patch) : {}
    write(
      kept.map((u) => {
        if (u.rowKey === rowKey) return normalizePick({ ...u, ...patch })
        if (deviceKey && u.unitKey === deviceKey) return normalizePick({ ...u, ...shared })
        return u
      }),
    )
  }

  const addPart = (unitKey: string) => {
    const first = picks.get(unitKey)
    if (first) write([...units, normalizePick(newExtraPart(first))])
  }

  // Removing a device's first part promotes its next part into the first
  // slot, which carries the device's own choices (what / where).
  const removePart = (rowKey: string) => {
    const gone = units.find((u) => u.rowKey === rowKey)
    if (!gone) return
    if (!isFirst(gone)) return write(units.filter((u) => u.rowKey !== rowKey))
    const next = extrasOf(gone.unitKey)[0]
    if (!next) return
    write(
      units
        .filter((u) => u.rowKey !== next.rowKey)
        .map((u) => (u.rowKey === rowKey ? normalizePick({ ...next, rowKey }) : u)),
    )
  }

  // Bulk bar: one patch onto every part of several devices in a single
  // setValue — looping `patchUnit` would drop all but the last.
  const patchMany = (unitKeys: string[], patch: Partial<ReplacementUnitSelection>) => {
    const set = new Set(unitKeys)
    write(units.map((u) => (set.has(u.unitKey) ? { ...u, ...patch } : u)))
  }

  const indexOfUnit = (rowKey: string) => units.findIndex((u) => u.rowKey === rowKey)

  const unitErrorsOf = (rowKey: string) => {
    // Per-line errors surface under the offending cell (§3/§14).
    const i = indexOfUnit(rowKey)
    const e = i >= 0 ? errors.units?.[i] : undefined
    return e
      ? {
          variant: e.replacementVariantId?.message ?? e.replacedVariantId?.message,
          component: e.componentDescription?.message ?? e.stockItemComponentId?.message,
          swap: e.swapLocation?.message,
        }
      : undefined
  }

  return {
    picks,
    extrasOf,
    toggleUnit,
    setManyUnits,
    patchUnit,
    addPart,
    removePart,
    patchMany,
    indexOfUnit,
    unitErrorsOf,
  }
}
