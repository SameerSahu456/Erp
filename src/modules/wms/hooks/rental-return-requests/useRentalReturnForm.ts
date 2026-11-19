import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import {
  useAccount,
  useCreateRentalReturnRequest,
  useRentalReturnEligibleUnits,
  useRentalReturnEligibleVariants,
  useSalesOrder,
  type RentalReturnEligibleUnitWire,
} from "@modules/crm"

import { UI } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { asUuid } from "@shared/lib/validation"

import {
  rentalReturnFormSchema,
  returnBeforeTerminationMessage,
  type RentalReturnFormInput,
} from "../../components/rental-return-requests/rental-return-form.schema"
import { rentalReturnDetailPath } from "../../components/rental-return-requests/rental-return-request-detail-helpers"
import {
  deepLinkPicks,
  hasSerial,
  holdingOrders,
  toRequestItems,
  toUnitPick,
  unitKey,
} from "../../components/rental-return-requests/rental-return-request-form-helpers"

export interface PickedAccount {
  id: string
  label: string
}

const EMPTY_FORM: RentalReturnFormInput = {
  accountId: "",
  declaredSalesOrderId: "",
  reason: "tenure_over",
  description: "",
  notes: "",
  courierName: "",
  awbNumber: "",
  expectedArrivalDate: "",
  units: [],
}

/**
 * Deep links (§11.1, parsed not trusted): `?sales_order_id=` resolves the
 * order's customer and picks the order. What gets ticked on top of that:
 * `?line=` (that line's units), `?serial=` (one unit, from a device's
 * Return) or `?all=1` (every unit, from the order's Return / Terminate).
 */
function useDeepLink() {
  const [params] = useSearchParams()
  const salesOrderId = asUuid(params.get("sales_order_id"))
  const lineId = asUuid(params.get("line"))
  const serial = params.get("serial")?.trim().slice(0, UI.SEARCH_MAX_LENGTH) || null
  const all = params.get("all") === "1"
  const order = useSalesOrder(salesOrderId)
  // The order carries only the account id; the picker trigger needs a name.
  const account = useAccount(order.data?.account_id)
  return { salesOrderId, lineId, serial, all, order: order.data, account: account.data }
}

/** The ticked-unit set: toggle one, or tick / untick a visible batch. */
function useUnitPicks(form: ReturnType<typeof useForm<RentalReturnFormInput>>) {
  const picks = useWatch({ control: form.control, name: "units" })
  const selected = useMemo(() => new Set(picks.map((p) => p.key)), [picks])
  const write = (next: RentalReturnFormInput["units"]) =>
    form.setValue("units", next, { shouldDirty: true, shouldValidate: next.length > 0 })
  const toggleUnit = (unit: RentalReturnEligibleUnitWire) => {
    const key = unitKey(unit)
    write(selected.has(key) ? picks.filter((p) => p.key !== key) : [...picks, toUnitPick(unit)])
  }
  const setManyUnits = (units: RentalReturnEligibleUnitWire[], on: boolean) => {
    const keys = new Set(units.map(unitKey))
    const rest = picks.filter((p) => !keys.has(p.key))
    write(on ? [...rest, ...units.map(toUnitPick)] : rest)
  }
  return { picks, selected, toggleUnit, setManyUnits }
}

export function useRentalReturnForm() {
  const navigate = useNavigate()
  const createMutation = useCreateRentalReturnRequest()
  const form = useForm<RentalReturnFormInput>({
    resolver: zodResolver(rentalReturnFormSchema),
    defaultValues: EMPTY_FORM,
  })
  const guard = useUnsavedChangesGuard({ isDirty: form.formState.isDirty })
  // The picked customer — local state so the trigger keeps its name after
  // the row scrolls off the loaded pages (§16.11 #5).
  const [account, setAccount] = useState<PickedAccount | null>(null)
  const accountId = useWatch({ control: form.control, name: "accountId" })
  const orderId = useWatch({ control: form.control, name: "declaredSalesOrderId" })

  // The order picker offers every order the customer holds units on.
  const variantsQuery = useRentalReturnEligibleVariants(accountId || null)
  const orders = useMemo(() => holdingOrders(variantsQuery.data ?? []), [variantsQuery.data])
  const unitsQuery = useRentalReturnEligibleUnits(orderId || null)
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data])
  // A terminated order's units come back no earlier than its termination
  // date (2026-11-15). ISO dates, so the latest is the largest string.
  const returnDateFloor = units.reduce<string | null>(
    (latest, unit) =>
      unit.terminated_on && (!latest || unit.terminated_on > latest) ? unit.terminated_on : latest,
    null,
  )
  const { picks, selected, toggleUnit, setManyUnits } = useUnitPicks(form)

  const link = useDeepLink()
  // The picker's label is React state: adopt the deep-linked customer during
  // render, once its name has loaded (no setState in an effect).
  const [linkAdopted, setLinkAdopted] = useState(false)
  if (!linkAdopted && link.order && link.account) {
    setLinkAdopted(true)
    setAccount({ id: link.account.id, label: link.account.name })
  }
  // The form is an external store, so its fields are synced in effects.
  const linkApplied = useRef(false)
  useEffect(() => {
    if (linkApplied.current || !link.order || !link.account) return
    form.setValue("accountId", link.order.account_id)
    form.setValue("declaredSalesOrderId", link.order.id)
    linkApplied.current = true
  }, [link.order, link.account, form])
  // Once, when the linked order's units have loaded.
  const linkTicked = useRef(false)
  useEffect(() => {
    if (linkTicked.current || !link.salesOrderId || orderId !== link.salesOrderId) return
    if (!unitsQuery.isSuccess) return
    linkTicked.current = true
    const next = deepLinkPicks(units, link)
    if (next) form.setValue("units", next, { shouldDirty: true })
  }, [link, orderId, units, unitsQuery.isSuccess, form])

  // Raised from ONE device (`?serial=`): the unit is already chosen, so the
  // form shows it instead of asking again (2026-11-16). "Choose other units"
  // drops back to the full list. Null when not from a device, the unit is
  // not on this order's list, or the user unlocked it.
  const [unitsUnlocked, setUnitsUnlocked] = useState(false)
  const wantedSerial = link.serial?.toLowerCase() ?? null
  const lockedUnit =
    !unitsUnlocked && wantedSerial && orderId === link.salesOrderId
      ? (units.find((u) => hasSerial(u, wantedSerial)) ?? null)
      : null

  const pickAccount = (next: PickedAccount | null) => {
    setAccount(next)
    form.setValue("accountId", next?.id ?? "", { shouldDirty: true, shouldValidate: true })
    // Another customer's order and units would be asked of the wrong one.
    form.setValue("declaredSalesOrderId", "", { shouldDirty: true })
    form.setValue("units", [])
  }

  const pickOrder = (next: string) => {
    form.setValue("declaredSalesOrderId", next, { shouldDirty: true, shouldValidate: true })
    // Ticks belong to the order they were made on.
    form.setValue("units", [])
  }

  const submit = form.handleSubmit(async (values) => {
    // The schema refuses a missing return method or return date, so this only
    // narrows the types (both are optional in the form type so the form can
    // start empty).
    if (!values.pickupBy || !values.expectedArrivalDate) return
    // Picked before the order was, the date can sit under its floor.
    if (returnDateFloor && values.expectedArrivalDate < returnDateFloor) {
      form.setError("expectedArrivalDate", {
        message: returnBeforeTerminationMessage(formatIST_date(returnDateFloor)),
      })
      return
    }
    // The hook's onError already toasts; a failed save just stays on the form
    // (and never escapes as an unhandled rejection from `void submit()`).
    const created = await createMutation.mutateAsync({
      account_id: values.accountId,
      declared_sales_order_id: values.declaredSalesOrderId,
      reason: values.reason,
      description: values.description?.trim() || null,
      notes: values.notes?.trim() || null,
      pickup_by: values.pickupBy,
      courier_name: values.courierName?.trim() || null,
      awb_number: values.awbNumber?.trim() || null,
      expected_arrival_date: values.expectedArrivalDate,
      return_to_warehouse_id: null,
      items: toRequestItems(values.units),
    }).catch(() => null)
    if (!created) return
    // Flip the guard clean BEFORE navigating away from a successful save,
    // or the popstate listener sees a stale dirty ref and prompts.
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    navigate(rentalReturnDetailPath(created.id), { replace: true })
  })

  return {
    form,
    guard,
    account,
    pickAccount,
    orders,
    orderId,
    pickOrder,
    units,
    unitsQuery,
    returnDateFloor,
    selected,
    selectedCount: picks.length,
    lockedUnit,
    unlockUnits: () => setUnitsUnlocked(true),
    toggleUnit,
    setManyUnits,
    submit,
    saving: createMutation.isPending,
  }
}

export type RentalReturnFormState = ReturnType<typeof useRentalReturnForm>
