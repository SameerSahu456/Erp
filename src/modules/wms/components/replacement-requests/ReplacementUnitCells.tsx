import { TableCell } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"

import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import {
  DECISIONS,
  DECISION_LABEL,
  decisionPatch,
  type Decision,
  type ReplacementRowUnit,
} from "./replacement-unit-table-helpers"

const U = S.form.units

/** Serial cell; a blocked unit says why it's spoken for so same-model units
 *  can be told apart and none is picked twice. */
export function UnitSerialCell({ unit, blocked }: { unit: ReplacementRowUnit; blocked: boolean }) {
  return (
    <TableCell className="max-w-[12rem] font-medium">
      <TruncatedSerial value={unit.internal_serial ?? U.noSerial} />
      {blocked && (
        <Typography variant="caption" tone="muted" className="block">
          {unit.already_under_replacement ? U.alreadyUnderReplacement : U.noFreeSlots}
        </Typography>
      )}
    </TableCell>
  )
}

/** Send back — a fixed two-way enum, so a Select (§3.2). */
export function UnitDecisionCell({
  pick,
  onPatch,
}: {
  pick: ReplacementUnitSelection | undefined
  onPatch: (patch: Partial<ReplacementUnitSelection>) => void
}) {
  // A device whose parts are replaced chooses per part (spec D14).
  return (
    <TableCell className="w-48">
      {pick?.target === "component" ? null : <DecisionSelect pick={pick} onPatch={onPatch} />}
    </TableCell>
  )
}

/** The Send back select on its own — also used by a device's further parts. */
export function DecisionSelect({
  pick,
  onPatch,
}: {
  pick: ReplacementUnitSelection | undefined
  onPatch: (patch: Partial<ReplacementUnitSelection>) => void
}) {
  return (
      <Select
        value={pick?.decision ?? null}
        disabled={pick == null}
        onValueChange={(v) => v && onPatch(decisionPatch(v as Decision))}
      >
        <SelectTrigger className="w-full" clearable={false} aria-label={U.decisionLabel}>
          <SelectValue placeholder={U.decisionLabel}>
            {pick ? DECISION_LABEL[pick.decision] : U.decisionLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DECISIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {DECISION_LABEL[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  )
}
