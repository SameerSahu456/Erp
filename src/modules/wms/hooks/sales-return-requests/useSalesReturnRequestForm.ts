import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { usePermission } from "@shared/rbac"
import { todayDateParam } from "@shared/lib/date"
import {
  useCreateSalesReturnRequest,
  useSalesReturnEligibleUnits,
  type SalesReturnEligibleUnitWire,
} from "@modules/crm"

import { wmsCan } from "../../permissions"
import type { SalesReturnReason } from "../../constants/sales-return-status"
import {
  makeSalesReturnFormSchema,
  type SalesReturnFormInput,
  type SalesReturnUnitSelection,
} from "../../components/sales-return-requests/sales-return-form.schema"
import { LIST_ROUTE } from "../../components/sales-return-requests/sales-return-request-form-helpers"
import { useSalesOrderPrefill } from "../shared/useSalesOrderPrefill"
import { useSalesReturnStagedDocs } from "./useSalesReturnStagedDocs"

/** The API body for a raised return: one line per physical unit. */
function toCreateBody(values: SalesReturnFormInput) {
  // API needs a header `reason`: take the first unit's, else the form default.
  const pickedReasons = values.units
    .map((u) => u.itemReason)
    .filter(Boolean) as SalesReturnReason[]
  const headerReason: SalesReturnReason = pickedReasons[0] ?? values.reason
  return {
    entity_type: "sales_orders" as const,
    entity_id: values.salesOrderId,
    reason: headerReason,
    description: values.description?.trim() || null,
    notes: values.notes?.trim() || null,
    pickup_by: values.pickupBy ?? null,
    courier_name: values.courierName?.trim() || null,
    awb_number: values.awbNumber?.trim() || null,
    expected_arrival_date: values.expectedArrivalDate || null,
    // No control sets a return warehouse, so it is always unassigned.
    return_to_warehouse_id: null,
    // One line per physical unit — never `quantity: N`.
    items: values.units.map((u) => ({
      sales_order_item_id: u.salesOrderItemId,
      part_variant_id: u.partVariantId,
      // Advisory: records the unit sales expects, does not bind the
      // warehouse to it.
      pinned_dispatch_request_item_id: u.dispatchRequestItemId,
      // Per-unit reason + note; sent as null when the operator left the
      // reason unpicked (the API accepts a null item_reason).
      item_reason: u.itemReason || null,
      notes: u.notes.trim() || null,
    })),
  }
}

/** Form state for raising a sales return; the body only lays it out. */
export function useSalesReturnRequestForm() {
  const navigate = useNavigate()
  // Cancel / back return to where the operator came from (§10).
  const navigateBack = useNavigateBack(LIST_ROUTE)
  const createMutation = useCreateSalesReturnRequest()
  // Deep-link prefill from the SO page's Sales Returns tab (`?sales_order_id=&so_number=`).
  const prefilledOrder = useSalesOrderPrefill()
  // Keep the picked order locally so its label survives page reloads in the picker (§16.11 #5).
  const [order, setOrder] = useState<{ id: string; label: string } | null>(prefilledOrder)
  // Arrival can't be in the past (§9). Local day, not UTC (UTC lags IST until 05:30).
  const today = todayDateParam()

  // Only WMS returns users see Logistics, so the schema requires it only for them.
  const canSeeLogistics = usePermission().can(wmsCan.returnsView)
  const resolver = useMemo(
    () => zodResolver(makeSalesReturnFormSchema(canSeeLogistics)),
    [canSeeLogistics],
  )

  const form = useForm<SalesReturnFormInput>({
    resolver,
    defaultValues: {
      salesOrderId: prefilledOrder?.id ?? "",
      reason: "customer_return",
      description: "",
      notes: "",
      courierName: "",
      awbNumber: "",
      expectedArrivalDate: "",
      units: [],
    },
  })

  const salesOrderId = useWatch({ control: form.control, name: "salesOrderId" })
  const selectedUnits = useWatch({ control: form.control, name: "units" })
  const expectedArrivalDate = useWatch({
    control: form.control,
    name: "expectedArrivalDate",
  })
  const pickupBy = useWatch({ control: form.control, name: "pickupBy" })
  // Only offered when the customer ships it, so only sent then.
  const docs = useSalesReturnStagedDocs()
  const guard = useUnsavedChangesGuard({ isDirty: form.formState.isDirty || docs.stagedDocs.length > 0 })

  // Units are bounded by what one order shipped, so the operator sees the
  // whole checklist at once rather than paging it.
  const unitsQuery = useSalesReturnEligibleUnits(salesOrderId || null)
  const availableUnits = useMemo(
    () => unitsQuery.data ?? [],
    [unitsQuery.data],
  )

  const selectionMap = useMemo(
    () => new Map(selectedUnits.map((u) => [u.dispatchRequestItemId, u])),
    [selectedUnits],
  )

  // A new unit starts with no reason; never preselected.
  const toSelection = (
    unit: SalesReturnEligibleUnitWire,
  ): SalesReturnUnitSelection => ({
    dispatchRequestItemId: unit.dispatch_request_item_id,
    salesOrderItemId: unit.sales_order_item_id,
    partVariantId: unit.part_variant_id,
    internalSerial: unit.internal_serial,
    label: `${unit.part_name} · ${unit.variant_name}`,
    itemReason: "",
    notes: "",
  })

  const setUnits = (next: SalesReturnUnitSelection[]) =>
    form.setValue("units", next, { shouldDirty: true, shouldValidate: true })

  const toggleUnit = (unit: SalesReturnEligibleUnitWire) => {
    setUnits(
      selectionMap.has(unit.dispatch_request_item_id)
        ? selectedUnits.filter(
            (u) => u.dispatchRequestItemId !== unit.dispatch_request_item_id,
          )
        : [...selectedUnits, toSelection(unit)],
    )
  }

  // Bulk select / clear over the units the table hands us (the visible,
  // searched set) — already-picked rows keep their reason and notes.
  const setManyUnits = (
    units: SalesReturnEligibleUnitWire[],
    selected: boolean,
  ) => {
    const ids = new Set(units.map((u) => u.dispatch_request_item_id))
    setUnits(
      selected
        ? [
            ...selectedUnits,
            ...units
              .filter((u) => !selectionMap.has(u.dispatch_request_item_id))
              .map(toSelection),
          ]
        : selectedUnits.filter((u) => !ids.has(u.dispatchRequestItemId)),
    )
  }

  const updateUnit = (
    driId: string,
    patch: Partial<Pick<SalesReturnUnitSelection, "itemReason" | "notes">>,
  ) =>
    setUnits(
      selectedUnits.map((u) =>
        u.dispatchRequestItemId === driId ? { ...u, ...patch } : u,
      ),
    )

  // The bulk bar: stamp every selected unit with the chosen reason AND the
  // note, and record the return's overall reason + note. "Apply notes
  // globally" means the note lands on every selected line item, not only the
  // header (CP-325 #1). A single unit can still override its own reason/note
  // in its row afterward.
  const applyBulk = (reason: SalesReturnReason, notes: string) => {
    form.setValue("reason", reason, { shouldDirty: true, shouldValidate: true })
    form.setValue("notes", notes, { shouldDirty: true })
    setUnits(selectedUnits.map((u) => ({ ...u, itemReason: reason, notes })))
  }

  const submit = form.handleSubmit(async (values) => {
    const created = await createMutation.mutateAsync(toCreateBody(values))
    if (values.pickupBy === "customer") await docs.uploadTo(created.id)
    // Flip the guard clean BEFORE navigating away from a successful save,
    // or the popstate listener sees a stale dirty ref and prompts.
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    // `replace` so Back from the new detail doesn't return to the stale,
    // just-submitted form (§10).
    navigate(`${LIST_ROUTE}/${created.id}`, { replace: true })
  })

  // Read errors here, in the useForm owner: memoized children reading formState
  // themselves would keep stale errors.
  const { errors } = form.formState
  const orderError = errors.salesOrderId?.message
  const unitsError = errors.units?.message
  const pickupByError = errors.pickupBy?.message

  return {
    form,
    orderError,
    unitsError,
    pickupByError,
    guard,
    navigateBack,
    createMutation,
    order,
    setOrder,
    today,
    canSeeLogistics,
    pickupBy,
    docs,
    salesOrderId,
    selectedUnits,
    expectedArrivalDate,
    unitsQuery,
    availableUnits,
    selectionMap,
    toggleUnit,
    setManyUnits,
    updateUnit,
    applyBulk,
    submit,
  }
}

export type SalesReturnRequestFormState = ReturnType<
  typeof useSalesReturnRequestForm
>
