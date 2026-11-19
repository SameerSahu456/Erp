import { Fragment } from "react"

import { TableCell, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { cn } from "@/lib/utils"

import { REPLACEMENT_GENERATION_LABEL } from "../../constants/replacement-request-status"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { type ReplacementRowUnit, unitDisplayName } from "./replacement-unit-table-helpers"
import { UnitDecisionCell, UnitSerialCell } from "./ReplacementUnitCells"

const U = S.form.units
const T = U.table

/** One physical unit (serial) as a selectable row. Its detail — whole device
 *  or its parts — is the ReplacementUnitDetailRow beneath it. */
export function ReplacementUnitRow({
  unit,
  pick,
  idx,
  blocked,
  hint,
  onToggle,
  onPatch,
}: {
  unit: ReplacementRowUnit
  pick: ReplacementUnitSelection | undefined
  idx: number
  /** Not pickable: already under replacement, or past this part's free slots. */
  blocked: boolean
  /** Shown once per part when only some of its units are free. */
  hint: string | null
  onToggle: (on: boolean) => void
  onPatch: (patch: Partial<ReplacementUnitSelection>) => void
}) {
  const selected = pick != null
  const showDetail = selected

  const name = unitDisplayName(unit)

  // The detail row visually belongs to its unit: same tint, no divider.
  const tint = selected ? "bg-primary/5 hover:bg-primary/5" : undefined

  return (
    <Fragment>
      <TableRow
        id={idx >= 0 ? `rr-unit-${idx}` : undefined}
        className={cn(blocked && "opacity-60", tint, showDetail && "border-b-0")}
      >
        <TableCell className="w-10 pl-4">
          <Checkbox
            checked={selected}
            disabled={blocked}
            onCheckedChange={(on) => onToggle(on === true)}
            aria-label={T.selectRowAria(unit.internal_serial ?? U.noSerial)}
          />
        </TableCell>

        <UnitSerialCell unit={unit} blocked={blocked} />

        <TableCell className="max-w-[16rem]">
          <TruncatedText value={name} className="block max-w-full" />
          <div className="mt-0.5 flex flex-wrap gap-1">
            <StatusBadge
              variant={unit.generation === "replacement" ? "info" : "neutral"}
            >
              {REPLACEMENT_GENERATION_LABEL[unit.generation]}
            </StatusBadge>
            {/* Migrated from the old rentals system: no dispatch record, so it
                is named by its rental unit and replaced with a chosen part. */}
            {unit.no_dispatch_record && (
              <StatusBadge variant="warning">{U.noDispatchRecord}</StatusBadge>
            )}
          </div>
          {/* Why the cap: only some units of this model are still free. */}
          {hint && (
            <Typography variant="caption" tone="muted" className="mt-1 block">
              {hint}
            </Typography>
          )}
        </TableCell>

        {/* Qty is always 1 — one row is one physical unit. */}
        <TableCell className="w-14 text-right">
          <Typography variant="body" tone={selected ? "default" : "muted"} numeric>
            {selected ? 1 : T.none}
          </Typography>
        </TableCell>

        <UnitDecisionCell pick={pick} onPatch={onPatch} />

        {/* Issue reason — per-line complaint (`issue_reason`), optional. A
            device whose parts are replaced asks it per part instead. */}
        <TableCell className="pr-4">
          {pick?.target === "component" ? null : <Input
            value={pick?.issueReason ?? ""}
            disabled={!selected}
            onChange={(e) => onPatch({ issueReason: e.target.value })}
            placeholder={T.issueReasonPlaceholder}
            aria-label={T.columns.issueReason}
            className="w-full min-w-0"
          />}
        </TableCell>
      </TableRow>

    </Fragment>
  )
}
