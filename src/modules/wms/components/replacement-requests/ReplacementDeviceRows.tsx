import { Fragment } from "react"

import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import type { ReplacementRowUnit } from "./replacement-unit-table-helpers"
import { ReplacementUnitDetailRow } from "./ReplacementUnitDetailRow"
import { ReplacementUnitRow } from "./ReplacementUnitRow"

type Errors = { variant?: string; component?: string; swap?: string } | undefined

/** One device in the units table: its selectable row, then — once ticked —
 *  what needs replacing and, for parts, one row per part (component spec §3.1). */
export function ReplacementDeviceRows({
  unit,
  pick,
  extras,
  blocked,
  hint,
  salesOrderId,
  errorsOf,
  indexOf,
  onToggle,
  onPatch,
  onAddPart,
  onRemovePart,
}: {
  unit: ReplacementRowUnit
  pick: ReplacementUnitSelection | undefined
  extras: ReplacementUnitSelection[]
  blocked: boolean
  hint: string | null
  salesOrderId: string
  errorsOf: (rowKey: string) => Errors
  indexOf: (rowKey: string) => number
  onToggle: (on: boolean) => void
  onPatch: (rowKey: string, patch: Partial<ReplacementUnitSelection>) => void
  onAddPart: () => void
  onRemovePart: (rowKey: string) => void
}) {
  const driId = unit.unitKey
  const tint = pick ? "bg-primary/5 hover:bg-primary/5" : undefined
  return (
    <Fragment>
      <ReplacementUnitRow
        unit={unit}
        pick={pick}
        idx={pick?.target === "component" ? -1 : indexOf(driId)}
        blocked={blocked}
        hint={hint}
        onToggle={onToggle}
        onPatch={(patch) => onPatch(driId, patch)}
      />
      {pick && (
        <ReplacementUnitDetailRow
          salesOrderId={salesOrderId}
          parts={[pick, ...extras]}
          tint={tint}
          errorsOf={errorsOf}
          indexOf={indexOf}
          onPatch={onPatch}
          onAddPart={onAddPart}
          onRemovePart={onRemovePart}
        />
      )}
    </Fragment>
  )
}
