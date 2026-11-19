import type { RentalDisplayStatus } from "../api/agreements"

// Where a rental order stands across the teams that move it — accounts
// (configure, approve), warehouse (dispatch), rentals (on rent, return).
// Pure: derived from the agreement's display status and its unit counts,
// so the order page and the agreement page can never disagree.
//
// The backend never STORES PartiallyReturned or Returned, but it DERIVES
// them: PartiallyReturned while some units are back and others still out,
// Returned once every unit is off rent but the final invoice is not yet
// raised (the billing run then closes the order). The unit counts stay as
// a fallback for a read that only carries the stored status.

export type AgreementStageId = "configure" | "approve" | "dispatch" | "onRent" | "return"
export type StageState = "completed" | "active" | "pending" | "failed"

export const AGREEMENT_STAGE_ORDER: readonly AgreementStageId[] = [
  "configure",
  "approve",
  "dispatch",
  "onRent",
  "return",
]

/** Which stage is current, and whether the whole flow has finished. */
export interface UnitCounts {
  /** Units still physically with the customer (on rent, held or
   *  mid-replacement — the API's `devices_out`). */
  out: number
  /** Units ever provisioned on the order. */
  total: number
}

interface StageAt {
  stage: AgreementStageId
  finished: boolean
  ended: boolean
}

const at = (stage: AgreementStageId, finished = false, ended = false): StageAt => ({ stage, finished, ended })

// PartiallyReturned / Returned: every unit back, final invoice not yet raised
// — still in progress until the billing run closes the order.
const STAGE_BY_STATUS: Record<RentalDisplayStatus, StageAt> = {
  Draft: at("configure"),
  PendingSignature: at("approve"),
  Active: at("dispatch"),
  PartiallyDispatched: at("dispatch"),
  Dispatched: at("onRent"),
  "On Rent": at("onRent"),
  Hold: at("onRent"),
  Alert: at("onRent"),
  Overdue: at("onRent"),
  PartiallyReturned: at("return"),
  Returned: at("return"),
  Closed: at("return", true),
  Terminated: at("return", true, true),
}

export function currentStage(status: RentalDisplayStatus | null | undefined, units: UnitCounts): StageAt {
  const found = status ? STAGE_BY_STATUS[status] : undefined
  if (!found) return at("configure")
  // On rent with every unit back: the final invoice is still to be raised.
  if (found.stage === "onRent" && units.total > 0 && units.out === 0) return at("return")
  return found
}

/** Each stage's state for the strip. */
export function stageStates(
  status: RentalDisplayStatus | null | undefined,
  units: UnitCounts,
): Record<AgreementStageId, StageState> {
  const { stage, finished, ended } = currentStage(status, units)
  const at = AGREEMENT_STAGE_ORDER.indexOf(stage)
  const out = {} as Record<AgreementStageId, StageState>
  AGREEMENT_STAGE_ORDER.forEach((id, i) => {
    if (i < at || (finished && i === at)) out[id] = "completed"
    else if (i === at) out[id] = "active"
    else out[id] = "pending"
  })
  if (ended) {
    out.return = "failed"
    // Terminated before anything shipped: dispatch and rent never happened,
    // so they must not read as done.
    if (units.total === 0) {
      out.dispatch = "pending"
      out.onRent = "pending"
    }
  }
  return out
}
