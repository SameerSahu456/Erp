import type { DispatchedUnitWire } from "@modules/crm"

import type { ReplacementGeneration } from "../../constants/replacement-request-status"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const U = S.form.units

/** A dispatched unit enriched with the fields the row needs. */
export type ReplacementRowUnit = DispatchedUnitWire & {
  /** The device's identity in the form: its DRI, or `legacy:<rental device>`
   *  for a unit migrated with no dispatch record. Never null. */
  unitKey: string
  generation: ReplacementGeneration
  /** `${so_item}:${variant}:${generation}` — the grain the backend caps. */
  bucketKey: string
  /** How many more units of this bucket may still be claimed. */
  bucketAvailable: number
  /** Free to pick — not already claimed and its bucket has a free slot. */
  selectable: boolean
}

export type Decision = ReplacementUnitSelection["decision"]
/** The choices a whole-device line offers; a component's is worked out. */
export const DECISIONS: Decision[] = ["same_part", "different_part"]
export const DECISION_LABEL: Record<Decision, string> = {
  same_part: U.samePart,
  different_part: U.differentPart,
  to_be_decided: U.engineerDecides,
  repair: U.repairOption,
}

/** A component part's "send back", from what is filled in (spec D14): a
 *  replacement part chosen → a different part; none, but the part was picked
 *  from the device → the same part; none and only described → the engineer
 *  decides (in house only — the schema refuses it on site). */
export function componentDecision(p: ReplacementUnitSelection): Decision {
  // Repair is offered only when the part alone comes to us (spec D15).
  if (p.repair && p.swapLocation === "in_house" && p.inHouseReturn === "part") return "repair"
  if (p.replacementVariantId) return "different_part"
  if (p.stockItemComponentId) return "same_part"
  return "to_be_decided"
}

/** Keep a line's decision and rate consistent with its fields. A component's
 *  decision follows its fields; a chosen part starts at the 0 rate its input
 *  shows. A whole-device line can never wait for the engineer. */
export function normalizePick(p: ReplacementUnitSelection): ReplacementUnitSelection {
  if (p.target === "unit") {
    return p.decision === "to_be_decided" ? { ...p, ...decisionPatch("same_part") } : p
  }
  const decision = componentDecision(p)
  return {
    ...p,
    decision,
    replacementRate: decision === "different_part" ? (p.replacementRate ?? 0) : undefined,
  }
}

/** Clearing a substitute when a unit goes back to "The same part" — the schema
 *  (and the API) reject a same-part line that still carries one. A different
 *  part starts at the 0 rate its input shows, so an untouched rate is not
 *  reported missing. */
export const decisionPatch = (d: Decision): Partial<ReplacementUnitSelection> =>
  d === "same_part"
    ? {
        decision: "same_part",
        replacementVariantId: undefined,
        replacementVariantLabel: undefined,
        replacementRate: undefined,
      }
    : { decision: "different_part", replacementRate: 0 }

/** "Part · Variant", or just the part when the variant adds nothing. */
export function unitDisplayName(unit: Pick<ReplacementRowUnit, "part_name" | "variant_name">): string {
  return unit.variant_name && unit.variant_name !== unit.part_name
    ? `${unit.part_name} · ${unit.variant_name}`
    : unit.part_name
}
