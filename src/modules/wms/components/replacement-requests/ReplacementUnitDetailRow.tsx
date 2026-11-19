import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TableCell, TableRow } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"

import { LegacyUnitPartField } from "./LegacyUnitPartField"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { ReplacementPartsEditor } from "./ReplacementPartsEditor"
import { ReplacementSubstituteFields } from "./ReplacementSubstituteFields"

const U = S.form.units

type Target = ReplacementUnitSelection["target"]
const TARGET_LABEL: Record<Target, string> = { unit: U.wholeDevice, component: U.partsInside }

/** Clearing the part fields when a device goes back to the whole device — the
 *  schema (and the API) reject a whole-device line that carries them. */
const targetPatch = (target: Target): Partial<ReplacementUnitSelection> =>
  target === "unit"
    ? {
        target,
        swapLocation: undefined,
        stockItemComponentId: undefined,
        componentLabel: undefined,
        componentDescription: undefined,
        componentPartNumber: undefined,
      }
    : { target }

type Errors = { variant?: string; component?: string; swap?: string } | undefined

/** A ticked device's detail: what needs replacing, then either the whole
 *  device's substitute or its parts (component spec §3.1). */
export function ReplacementUnitDetailRow({
  salesOrderId,
  parts,
  tint,
  errorsOf,
  indexOf,
  onPatch,
  onAddPart,
  onRemovePart,
}: {
  salesOrderId: string
  /** The device's first pick, then its further parts. */
  parts: ReplacementUnitSelection[]
  tint: string | undefined
  errorsOf: (rowKey: string) => Errors
  indexOf: (rowKey: string) => number
  onPatch: (rowKey: string, patch: Partial<ReplacementUnitSelection>) => void
  onAddPart: () => void
  onRemovePart: (rowKey: string) => void
}) {
  const pick = parts[0]
  if (!pick) return null
  return (
    <TableRow className={tint}>
      <TableCell />
      <TableCell colSpan={5} className="whitespace-normal pb-4 pr-4 pt-0">
        <div className="flex flex-col gap-4 rounded-md border bg-card p-3">
          {/* A unit with no dispatch record (migrated from the old rentals
              system) has no recorded parts: it is always the whole device. */}
          {pick.rentalDeviceId ? (
            <Typography variant="helper" tone="muted">
              {U.noDispatchRecordHelp}
            </Typography>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>{U.targetLabel}</Label>
              <RadioGroup
                value={pick.target}
                onValueChange={(v) => onPatch(pick.rowKey, targetPatch(v as Target))}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                {(Object.keys(TARGET_LABEL) as Target[]).map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <RadioGroupItem value={t} />
                    <Typography variant="body">{TARGET_LABEL[t]}</Typography>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {pick.target === "component" ? (
            <ReplacementPartsEditor
              salesOrderId={salesOrderId}
              parts={parts}
              errorsOf={errorsOf}
              indexOf={indexOf}
              onPatch={onPatch}
              onAddPart={onAddPart}
              onRemovePart={onRemovePart}
            />
          ) : pick.decision === "different_part" ? (
            <ReplacementSubstituteFields
              pick={pick}
              error={errorsOf(pick.rowKey)?.variant}
              onPatch={(patch) => onPatch(pick.rowKey, patch)}
            />
          ) : (
            pick.rentalDeviceId && (
              <LegacyUnitPartField
                pick={pick}
                error={errorsOf(pick.rowKey)?.variant}
                onPatch={(patch) => onPatch(pick.rowKey, patch)}
              />
            )
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
