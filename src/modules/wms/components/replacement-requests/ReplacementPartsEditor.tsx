import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"

import {
  REPLACEMENT_SWAP_LOCATION_LABEL,
  type ReplacementInHouseReturn,
  type ReplacementSwapLocation,
} from "../../constants/replacement-request-status"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { ReplacementPartRow } from "./ReplacementPartRow"

const U = S.form.units
const T = U.table
const SWAPS = Object.keys(REPLACEMENT_SWAP_LOCATION_LABEL) as ReplacementSwapLocation[]
const COMES_IN: { value: ReplacementInHouseReturn; label: string }[] = [
  { value: "device", label: U.comesInDevice },
  { value: "part", label: U.comesInPart },
]

type Errors = { variant?: string; component?: string; swap?: string } | undefined

/** The parts of one device being replaced: where it is repaired (asked once),
 *  then one identical row per part (component spec D10a, D14). */
export function ReplacementPartsEditor({
  salesOrderId,
  parts,
  errorsOf,
  indexOf,
  onPatch,
  onAddPart,
  onRemovePart,
}: {
  salesOrderId: string
  /** The device's first part, then any others. */
  parts: ReplacementUnitSelection[]
  errorsOf: (rowKey: string) => Errors
  indexOf: (rowKey: string) => number
  onPatch: (rowKey: string, patch: Partial<ReplacementUnitSelection>) => void
  onAddPart: () => void
  onRemovePart: (rowKey: string) => void
}) {
  const first = parts[0]
  if (!first) return null
  const where = first.swapLocation
  const takenBy = (rowKey: string) =>
    parts
      .filter((p) => p.rowKey !== rowKey && p.stockItemComponentId)
      .map((p) => p.stockItemComponentId as string)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label required>{U.swapLabel}</Label>
        <RadioGroup
          value={where ?? ""}
          onValueChange={(v) => onPatch(first.rowKey, { swapLocation: v as ReplacementSwapLocation })}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {SWAPS.map((loc) => (
            <label key={loc} className="flex items-center gap-2">
              <RadioGroupItem value={loc} />
              <Typography variant="body">{REPLACEMENT_SWAP_LOCATION_LABEL[loc]}</Typography>
            </label>
          ))}
        </RadioGroup>
        {where && (
          <Typography variant="helper" tone="muted">
            {where === "in_house" ? U.swapHelpInHouse : U.swapHelpOnSite}
          </Typography>
        )}
        <FieldError message={errorsOf(first.rowKey)?.swap} />
      </div>

      {where === "in_house" && (
        <div className="flex flex-col gap-1.5">
          <Label>{U.comesInLabel}</Label>
          <RadioGroup
            value={first.inHouseReturn ?? "device"}
            onValueChange={(v) =>
              onPatch(first.rowKey, { inHouseReturn: v as ReplacementInHouseReturn })
            }
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {COMES_IN.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} />
                <Typography variant="body">{o.label}</Typography>
              </label>
            ))}
          </RadioGroup>
          <Typography variant="helper" tone="muted">
            {first.inHouseReturn === "part" ? U.comesInHelpPart : U.comesInHelpDevice}
          </Typography>
        </div>
      )}

      <div className="hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_7rem_minmax(0,1fr)_2rem]">
        <Label>{U.partLabel}</Label>
        <Label>{U.newPartLabel}</Label>
        <Label>{U.rateLabel}</Label>
        <Label>{T.columns.issueReason}</Label>
      </div>
      {parts.map((part) => (
        <ReplacementPartRow
          key={part.rowKey}
          salesOrderId={salesOrderId}
          part={part}
          idx={indexOf(part.rowKey)}
          takenIds={takenBy(part.rowKey)}
          errors={errorsOf(part.rowKey)}
          canRemove={parts.length > 1}
          onPatch={(patch) => onPatch(part.rowKey, patch)}
          onRemove={() => onRemovePart(part.rowKey)}
        />
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={onAddPart}>
          <Plus data-icon="inline-start" />
          {U.addPart}
        </Button>
      </div>
    </div>
  )
}
