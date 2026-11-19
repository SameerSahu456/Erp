import { Boxes, ChevronDown } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { lineBomEligible, lineUnitCount, type ManualLine } from './model'
import { CONDITION_LABELS } from '../../../constants/condition'
import { INWARDS_STRINGS } from '../inwards.strings'
import type { LineRowCtx } from './LinePartCell'

const S = INWARDS_STRINGS.lineItems

/** The BOM toggle's label: hide when open, else the component count or "add". */
function bomToggleLabel(open: boolean, componentCount: number): string {
  if (open) return S.hideBom
  return componentCount > 0 ? S.bomCompsCount(componentCount) : S.addBom
}

function BomToggle({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  const { bomOpenKey, setBomOpenKey } = ctx
  if (!lineBomEligible(line)) return null
  if (lineUnitCount(line) !== 1)
    return (
      <Typography variant="helper" tone="muted">
        {S.bomAvailableAtQty1}
      </Typography>
    )
  return (
    <button
      type="button"
      onClick={() => setBomOpenKey((k) => (k === line.key ? null : line.key))}
      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Boxes className="size-3.5" />
      <Typography variant="helper" tone={line.components.length > 0 ? 'primary' : 'muted'}>
        {bomToggleLabel(bomOpenKey === line.key, line.components.length)}
      </Typography>
      <ChevronDown
        className={cn('size-3 transition-transform', bomOpenKey === line.key && 'rotate-180')}
      />
    </button>
  )
}

/** On-PO catalog line: "{claim} of {pending}" plus an over-PO-qty warning. */
function OnPoSummary({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  const units = lineUnitCount(line)
  return (
    <>
      <Typography variant="helper" tone="muted">
        {S.poLineSummary(
          CONDITION_LABELS[line.condition] ?? line.condition,
          ctx.claimIndexByKey[line.key] ?? 1,
          line.pending,
        )}
      </Typography>
      {units > line.pending && (
        <Typography variant="helper" tone="warning">
          {S.overPoQtySummary(units, line.pending)}
        </Typography>
      )}
    </>
  )
}

function LineKindSummary({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  if (line.descriptionOnly) {
    return (
      <Typography variant="helper" tone="muted">
        {CONDITION_LABELS[line.condition] ?? line.condition}
      </Typography>
    )
  }
  if (line.onPo) return <OnPoSummary line={line} ctx={ctx} />
  return (
    <Typography variant="helper" tone="warning">
      {S.notOnPo}
    </Typography>
  )
}

/** The helper line under a picked part: its PO/description summary + the BOM toggle. */
export function PickedPartSummary({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <LineKindSummary line={line} ctx={ctx} />
      <BomToggle line={line} ctx={ctx} />
    </div>
  )
}
