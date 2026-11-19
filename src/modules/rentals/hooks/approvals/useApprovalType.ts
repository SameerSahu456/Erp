import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { usePermission } from "@shared/rbac"

import { rentalsCan } from "../../permissions"

// Early exit holds terminations too: early exit IS the end of a contract
// (2026-11-15), so there is no separate termination queue.
export const APPROVAL_TYPES = ["early-exit", "po", "rate-change", "invoice-delete", "agreements"] as const
export type ApprovalType = (typeof APPROVAL_TYPES)[number]

const PARAM = "type"
const DEFAULT: ApprovalType = "early-exit"

/** Which approval queue the Approvals page shows, read from `?type=`.
 *
 *  Early exit (waivers and terminations) is offered to everyone who reads
 *  rentals. Each other queue is offered only to whoever acts on it: PO, rate
 *  change and new agreements to their deciders; invoice deletion to its deciders AND
 *  requesters, who follow their own requests there.
 *  The URL is untrusted input (§11.1): an unknown or unavailable value falls
 *  back to the early-exit queue and the URL is rewritten to match what
 *  rendered. A clean URL is left untouched. */
export function useApprovalType() {
  const [params, setParams] = useSearchParams()
  const { can, canAny } = usePermission()
  const offered: Record<ApprovalType, boolean> = {
    "early-exit": true,
    po: can([...rentalsCan.approvePurchaseOrders]),
    "rate-change": can([...rentalsCan.approveExtend]),
    "invoice-delete": canAny([...rentalsCan.approveInvoiceDelete, ...rentalsCan.deleteInvoice]),
    agreements: can([...rentalsCan.approveAgreement]),
  }
  const types: readonly ApprovalType[] = APPROVAL_TYPES.filter((t) => offered[t])

  const raw = params.get(PARAM)
  const type: ApprovalType = types.includes(raw as ApprovalType) ? (raw as ApprovalType) : DEFAULT

  useEffect(() => {
    if (raw !== null && raw !== type) {
      const next = new URLSearchParams(params)
      if (type === DEFAULT) next.delete(PARAM)
      else next.set(PARAM, type)
      setParams(next, { replace: true })
    }
  }, [raw, type, params, setParams])

  const setType = (next: ApprovalType) => {
    const updated = new URLSearchParams(params)
    if (next === DEFAULT) updated.delete(PARAM)
    else updated.set(PARAM, next)
    setParams(updated)
  }

  return { type, types, setType }
}
