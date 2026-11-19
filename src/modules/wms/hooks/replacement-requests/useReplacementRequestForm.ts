/** State + derivations for the new-replacement-request form. */
import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useCreateReplacementRequest } from "@modules/crm"
import { UI } from "@/shared/constants"
import { asUuid } from "@shared/lib/validation"

import {
  replacementRequestFormSchema,
  type ReplacementRequestFormInput,
} from "../../components/replacement-requests/replacement-request-form.schema"
import { LIST_ROUTE } from "../../components/replacement-requests/replacement-request-form-helpers"
import type { ReplacementRowUnit } from "../../components/replacement-requests/replacement-unit-table-helpers"
import { useSalesOrderPrefill } from "../shared/useSalesOrderPrefill"
import { useReplacementEligibleRows } from "./useReplacementEligibleRows"
import { useReplacementUnitPicks } from "./useReplacementUnitPicks"
import {
  firstReplacementErrorTarget,
  toReplacementLineItems,
} from "./replacement-request-submit-helpers"

export type ReplacementOrderPick = { id: string; label: string }

type LinkedDevice = { serial: string | null; deviceId: string | null }

/** `?serial=` / `?device=` from a device's Replace action — parsed, not
 *  trusted (§11.1): the serial is capped, the device id UUID-checked. */
function useLinkedDevice(): LinkedDevice | null {
  const [params] = useSearchParams()
  const serial = params.get("serial")?.trim().slice(0, UI.SEARCH_MAX_LENGTH).toLowerCase() || null
  const deviceId = asUuid(params.get("device"))
  return serial || deviceId ? { serial, deviceId } : null
}

function matchesLinkedDevice(u: ReplacementRowUnit, link: LinkedDevice): boolean {
  if (link.deviceId && u.rental_device_id === link.deviceId) return true
  if (!link.serial) return false
  return [u.internal_serial, u.manufacturer_serial].some((s) => s?.toLowerCase() === link.serial)
}

export function useReplacementRequestForm() {
  const navigate = useNavigate()
  // Cancel / back return to where the operator came from (the list with its
  // state), not a hard-coded jump to the list root (§10).
  const navigateBack = useNavigateBack(LIST_ROUTE)
  const createRequest = useCreateReplacementRequest()

  // Deep-link prefill from CRM (`?sales_order_id=&so_number=`).
  const prefilledOrder = useSalesOrderPrefill()

  const [order, setOrder] = useState<ReplacementOrderPick | null>(
    prefilledOrder,
  )

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReplacementRequestFormInput>({
    resolver: zodResolver(replacementRequestFormSchema),
    defaultValues: {
      salesOrderId: prefilledOrder?.id ?? "",
      replacementMode: "normal",
      priority: undefined,
      reason: "",
      units: [],
    },
  })

  const formValues = useWatch({ control })
  const units = useWatch({ control, name: "units" })
  // The form opens empty, so the first-render snapshot is the dirty baseline.
  const snapshot = JSON.stringify(formValues)
  const [baseline] = useState(snapshot)
  const isDirty = snapshot !== baseline
  const guard = useUnsavedChangesGuard({ isDirty })

  // An in-house part ships the customer's own device or part back, so nothing
  // can ship ahead of it: advance is off while any part comes in to us.
  const replacementMode = useWatch({ control, name: "replacementMode" })
  const partComesIn = units.some(
    (u) => u.target === "component" && u.swapLocation === "in_house",
  )
  useEffect(() => {
    if (partComesIn && replacementMode === "advance") {
      setValue("replacementMode", "normal", { shouldValidate: true })
    }
  }, [partComesIn, replacementMode, setValue])

  const { rowUnits: allRowUnits, loading } = useReplacementEligibleRows(order?.id)
  const unitPicks = useReplacementUnitPicks({ units, setValue, errors })

  // Raised from ONE device (`?serial=` / `?device=`): that unit is already
  // chosen — ticked once, and the table shows only its row so the operator
  // fills in the swap details instead of picking the unit again
  // (2026-11-16). "Choose other units" brings the whole order back.
  const linkedUnit = useLinkedDevice()
  const [unitsUnlocked, setUnitsUnlocked] = useState(false)
  const lockedUnit =
    !unitsUnlocked && linkedUnit && order?.id === prefilledOrder?.id
      ? (allRowUnits.find((u) => matchesLinkedDevice(u, linkedUnit)) ?? null)
      : null
  const autoPicked = useRef(false)
  useEffect(() => {
    if (autoPicked.current || !lockedUnit) return
    autoPicked.current = true
    if (!unitPicks.picks.has(lockedUnit.unitKey)) unitPicks.toggleUnit(lockedUnit, true)
  }, [lockedUnit, unitPicks])
  const rowUnits = lockedUnit ? [lockedUnit] : allRowUnits

  const changeOrder = (next: ReplacementOrderPick | null) => {
    setOrder(next)
    setValue("salesOrderId", next?.id ?? "", { shouldValidate: true })
    // A different order invalidates every chosen unit.
    setValue("units", [], { shouldValidate: true })
  }

  const submit = handleSubmit(async (values) => {
    const line_items = toReplacementLineItems(values.units)

    const created = await createRequest.mutateAsync({
      entity_type: "sales_orders",
      entity_id: values.salesOrderId,
      replacement_mode: values.replacementMode,
      priority: values.priority,
      reason: values.reason,
      description: values.description || null,
      external_ticket_no: values.externalTicketNo || null,
      issue_date: values.issueDate || null,
      engineer_id: values.engineerId || null,
      line_items,
    } as Parameters<typeof createRequest.mutateAsync>[0])

    // The save just persisted, so leaving is intentional — clear the guard so it
    // does not prompt on the way to the new request's detail page.
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    navigate(`/wms/replacements/${created.id}`, { replace: true })
  }, (formErrors) => {
    // Unit controls aren't RHF-registered, so scroll to the first error manually (§3).
    const firstBadUnit = units.findIndex((_, i) => formErrors.units?.[i])
    const targetId = firstReplacementErrorTarget(formErrors, firstBadUnit)
    if (!targetId) return
    const el = document.getElementById(targetId)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    ;(el?.querySelector("input, textarea, button") as HTMLElement | null)?.focus?.()
  })

  return {
    control,
    errors,
    isSubmitting,
    guard,
    navigateBack,
    submit,
    order,
    changeOrder,
    loading,
    rowUnits,
    lockedUnit,
    unlockUnits: () => setUnitsUnlocked(true),
    ...unitPicks,
    totalLines: units.length,
    partComesIn,
  }
}

export type ReplacementRequestFormState = ReturnType<
  typeof useReplacementRequestForm
>