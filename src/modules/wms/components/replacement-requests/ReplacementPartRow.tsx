import { Trash2 } from "lucide-react"
import { partOptionDescription } from '@modules/ims'

import { AsyncSelect } from "@/components/ui/async-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/common/forms/FieldError"
import { useNumberField } from "@/hooks/use-number-field"

import {
  ENGINEER_DECIDES,
  REPAIR_PART,
  SAME_PART,
  TYPED_PREFIX,
  useDevicePartOptions,
  useReplacementPartOptions,
  type PartOption,
} from "../../hooks/replacement-requests/useReplacementPartOptions"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const U = S.form.units
const T = U.table
const SAME: PartOption = { id: SAME_PART, label: U.samePartOption }
const ENGINEER: PartOption = { id: ENGINEER_DECIDES, label: U.engineerDecides }
const REPAIR: PartOption = { id: REPAIR_PART, label: U.repairOption }

type Patch = (patch: Partial<ReplacementUnitSelection>) => void

/** Repair is offered only when the part alone comes to us (spec D15). */
const canRepair = (part: ReplacementUnitSelection) =>
  part.swapLocation === "in_house" && part.inHouseReturn === "part"

/** The replacement part's default when none is chosen (component spec D14). */
function defaultFor(part: ReplacementUnitSelection): PartOption | null {
  if (part.stockItemComponentId) return SAME
  return part.swapLocation === "in_house" ? ENGINEER : null
}

function partValue(part: ReplacementUnitSelection): PartOption | null {
  if (part.stockItemComponentId) {
    return { id: part.stockItemComponentId, label: part.componentLabel ?? "" }
  }
  const text = part.componentDescription?.trim()
  return text ? { id: `${TYPED_PREFIX}${text}`, label: U.typedValue(text) } : null
}

function partPatch(next: PartOption | null): Partial<ReplacementUnitSelection> {
  if (next?.id.startsWith(TYPED_PREFIX)) {
    return {
      stockItemComponentId: undefined,
      componentLabel: undefined,
      componentDescription: next.id.slice(TYPED_PREFIX.length),
    }
  }
  return {
    stockItemComponentId: next?.id,
    componentLabel: next?.label,
    componentDescription: undefined,
  }
}

function newPartPatch(next: PartOption | null): Partial<ReplacementUnitSelection> {
  if (next?.id === REPAIR_PART) {
    return { repair: true, replacementVariantId: undefined, replacementVariantLabel: undefined }
  }
  if (!next || next.id === SAME_PART || next.id === ENGINEER_DECIDES) {
    return { repair: false, replacementVariantId: undefined, replacementVariantLabel: undefined }
  }
  return { repair: false, replacementVariantId: next.id, replacementVariantLabel: next.label }
}

function RateField({ part, onPatch }: { part: ReplacementUnitSelection; onPatch: Patch }) {
  const rate = useNumberField(part.replacementRate ?? 0, (n) => onPatch({ replacementRate: n }), {
    decimal: true,
  })
  return <Input {...rate} aria-label={U.rateLabel} className="w-full text-right" />
}

/** One part of a device being replaced: which part, what goes in, the rate
 *  when that is a different part, and the complaint (component spec D14). */
export function ReplacementPartRow({
  salesOrderId,
  part,
  idx,
  takenIds,
  errors,
  canRemove,
  onPatch,
  onRemove,
}: {
  salesOrderId: string
  part: ReplacementUnitSelection
  idx: number
  takenIds: string[]
  errors: { variant?: string; component?: string } | undefined
  canRemove: boolean
  onPatch: Patch
  onRemove: () => void
}) {
  const usePartOptions = useDevicePartOptions(
    salesOrderId,
    // Only a dispatched unit has recorded contents; "" keeps the query off.
    part.dispatchRequestItemId ?? "",
    takenIds,
    U.typedOption,
  )
  const fallback = defaultFor(part)
  const repairable = canRepair(part)
  const leading = [...(fallback ? [fallback] : []), ...(repairable ? [REPAIR] : [])]
  const useNewPartOptions = useReplacementPartOptions(leading)
  const chosen =
    part.repair && repairable
      ? REPAIR
      : part.replacementVariantId
        ? { id: part.replacementVariantId, label: part.replacementVariantLabel ?? "" }
        : fallback

  return (
    <div
      id={idx >= 0 ? `rr-unit-${idx}` : undefined}
      className="grid items-start gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_7rem_minmax(0,1fr)_2rem]"
    >
      <div className="min-w-0">
        <AsyncSelect<PartOption>
          value={partValue(part)}
          onValueChange={(next) => onPatch(partPatch(next))}
          useOptions={usePartOptions}
          toLabel={(o) => o.label}
          getDescription={partOptionDescription}
          placeholder={U.partPlaceholder}
          searchPlaceholder={U.partSearchPlaceholder}
          emptyText={U.partEmpty}
          onSearchEnter={(text) =>
            onPatch(partPatch({ id: `${TYPED_PREFIX}${text}`, label: U.typedValue(text) }))
          }
          searchable
          clearable
          className="w-full"
        />
        <FieldError message={errors?.component} />
      </div>
      <div className="min-w-0">
        <AsyncSelect<PartOption>
          value={chosen}
          onValueChange={(next) =>
            onPatch(newPartPatch(next))
          }
          useOptions={useNewPartOptions}
          toLabel={(o) => o.label}
          getDescription={partOptionDescription}
          placeholder={U.newPartPlaceholder}
          searchPlaceholder={U.substituteSearchPlaceholder}
          searchable
          clearable={fallback == null}
          className="w-full"
        />
        <FieldError message={errors?.variant} />
      </div>
      <div className="min-w-0">
        {part.replacementVariantId ? <RateField part={part} onPatch={onPatch} /> : null}
      </div>
      <Input
        value={part.issueReason}
        onChange={(e) => onPatch({ issueReason: e.target.value })}
        placeholder={T.issueReasonPlaceholder}
        aria-label={T.columns.issueReason}
        className="w-full min-w-0"
      />
      <div className="flex justify-end">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={U.removePart}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  )
}
