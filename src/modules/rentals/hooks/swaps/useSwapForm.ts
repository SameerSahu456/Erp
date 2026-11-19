import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { AsyncSelectOption } from "@/components/ui/async-select"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { asUuid } from "@shared/lib/validation"
import { useAccount } from "@modules/crm"

import { useRentalDevice } from "../devices/useRentalDevices"
import { useProposeSwap } from "./useSwaps"

export interface PairDraft {
  key: string
  returned: AsyncSelectOption | null
  staying: AsyncSelectOption | null
}

const newPair = (): PairDraft => ({ key: crypto.randomUUID(), returned: null, staying: null })

export function deviceLabel(d: { serial_number?: string | null; part_number?: string | null; sales_order_number?: string | null }) {
  return [d.serial_number, d.part_number, d.sales_order_number].filter(Boolean).join(" · ")
}

/**
 * The swap form's state. Deep link from the rental-return scan screen
 * (§11.1, parsed not trusted): `account_id`, `returned_device_id` (the unit
 * that came back) and `declared_sales_order_id` (narrows the staying-unit
 * picker to the order the customer meant).
 */
export function useSwapForm() {
  const navigate = useNavigate()
  const propose = useProposeSwap()
  const [params] = useSearchParams()
  const linkAccount = asUuid(params.get("account_id"))
  const linkReturned = asUuid(params.get("returned_device_id"))
  const linkedOrderId = asUuid(params.get("declared_sales_order_id")) ?? undefined

  const [account, setAccount] = useState<AsyncSelectOption | null>(null)
  const [pairs, setPairs] = useState<PairDraft[]>([newPair()])
  const [reason, setReason] = useState("")
  const dirty = !!reason || pairs.some((p) => p.returned || p.staying)
  const guard = useUnsavedChangesGuard({ isDirty: dirty })

  const linkedAccount = useAccount(linkAccount).data
  const linkedDevice = useRentalDevice(linkReturned ?? undefined).data
  // Pre-fill once from the deep link, during render (no effect): wait for
  // the device too when one was named, so the first pair lands filled.
  const [applied, setApplied] = useState(false)
  if (!applied && linkedAccount && (!linkReturned || linkedDevice)) {
    setApplied(true)
    setAccount({ id: linkedAccount.id, label: linkedAccount.name })
    if (linkedDevice) setPairs([{ ...newPair(), returned: { id: linkedDevice.id, label: deviceLabel(linkedDevice) } }])
  }

  // The declared order narrows the staying picker only for the customer the
  // link came with; any other customer's units are not on it.
  const declaredOrderId = account?.id === linkAccount ? linkedOrderId : undefined

  const pickAccount = (next: AsyncSelectOption | null) => {
    setAccount(next)
    // Units belong to the customer; a new customer starts the pairs over.
    setPairs([newPair()])
  }
  const patchPair = (key: string, part: Partial<PairDraft>) =>
    setPairs((prev) => prev.map((p) => (p.key === key ? { ...p, ...part } : p)))
  const addPair = () => setPairs((prev) => [...prev, newPair()])
  const removePair = (key: string) => setPairs((prev) => (prev.length > 1 ? prev.filter((p) => p.key !== key) : prev))

  const complete = pairs.every((p) => p.returned && p.staying)
  const canSubmit = !!account && complete && !!reason.trim() && !propose.isPending

  const submit = async () => {
    if (!account || !complete) return
    let swap
    try {
      swap = await propose.mutateAsync({
        account_id: account.id,
        reason: reason.trim(),
        pairs: pairs.map((p) => ({
          returned_device_id: (p.returned as AsyncSelectOption).id,
          staying_device_id: (p.staying as AsyncSelectOption).id,
        })),
      })
    } catch {
      return // the hook toasts the failure; stay on the form
    }
    guard.bypassOnce()
    await guard.popSentinelIfPresent()
    navigate(`/rentals/swaps/${swap.id}`, { replace: true })
  }

  return {
    guard,
    account,
    pickAccount,
    declaredOrderId,
    pairs,
    patchPair,
    addPair,
    removePair,
    reason,
    setReason,
    complete,
    canSubmit,
    submit,
    saving: propose.isPending,
  }
}

