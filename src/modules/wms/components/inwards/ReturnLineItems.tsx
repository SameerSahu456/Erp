import { useMemo } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { makeStaticAsyncOptions } from '@/components/ui/async-select'
import { cn } from '@/lib/utils'

import { INWARDS_STRINGS } from './inwards.strings'
import type { ExpectedReturnLine } from '../../api'
import {
  lineUnits,
  makeReturnLine,
  RETURN_LINE_GRID,
  returnableVariants,
  type ReturnLine,
  type ReturnState,
  type ReturnUnitOption,
  type ReturnVariantOption,
} from './return-line-items-helpers'
import { ReturnLineRow } from './ReturnLineRow'

// Past this many rows the list gets an inner scroll (§7.7) so the header row and
// the Save bar below stay reachable.
const INNER_SCROLL_ROW_THRESHOLD = 10

const NO_UNITS: ReturnUnitOption[] = []

export function ReturnLineItems({
  lines,
  value,
  onChange,
}: {
  lines: ExpectedReturnLine[]
  value: ReturnState
  onChange: (next: ReturnState) => void
}) {
  const variants = useMemo(() => returnableVariants(lines), [lines])
  // Migrated units are ticked in their own list, not edited as rows here.
  const rows = useMemo(() => value.filter((l) => !l.legacyDeviceId), [value])
  const variantById = useMemo(
    () => new Map(variants.map((v) => [v.variantId, v])),
    [variants],
  )

  // Same searchable AsyncSelect UI as the PO line items, but over the fixed
  // set of returnable variants on this source (filtered client-side — no
  // catalog round-trip).
  const variantOptions = useMemo<ReturnVariantOption[]>(
    () => variants.map((v) => ({ ...v, id: v.variantId })),
    [variants],
  )
  const useVariantOptions = useMemo(
    () => makeStaticAsyncOptions(variantOptions, (o) => o.label),
    [variantOptions],
  )

  const patch = (key: string, partial: Partial<ReturnLine>) =>
    onChange(value.map((l) => (l.key === key ? { ...l, ...partial } : l)))
  const addLine = () => onChange([...value, makeReturnLine()])
  const removeLine = (key: string) => onChange(value.filter((l) => l.key !== key))

  // The returnable units still selectable per line: the line's variant's
  // dispatched-pending units MINUS those already claimed by OTHER lines (the
  // line keeps its own pick). Feeding the serial picker only these makes a
  // serial that doesn't belong to the line impossible to enter — the old
  // free-text box accepted a mismatch and only 422'd at finalize.
  const serialOptionsByKey = useMemo(() => {
    const m = new Map<string, ReturnUnitOption[]>()
    for (const line of value) {
      if (!line.variantId) continue
      const v = variantById.get(line.variantId)
      const claimed = new Set(
        value
          .filter((l) => l.key !== line.key)
          .map((l) => l.stockItemId)
          .filter((id): id is string => !!id),
      )
      m.set(
        line.key,
        (v?.units ?? [])
          .filter((u) => !claimed.has(u.stockItemId))
          .map((u) => ({
            id: u.stockItemId,
            serial: u.serial,
            manufacturerSerial: u.manufacturerSerial,
          })),
      )
    }
    return m
  }, [value, variantById])

  // Units of each variant still to inward after every line's pick, so the
  // "pending" counts drop as units are picked.
  const leftByVariant = useMemo(() => {
    const m = new Map(variants.map((v) => [v.variantId, v.units.length]))
    for (const l of value) {
      if (l.variantId && m.has(l.variantId)) {
        m.set(l.variantId, Math.max(0, (m.get(l.variantId) ?? 0) - lineUnits(l)))
      }
    }
    return m
  }, [value, variants])

  const pickSerial = (line: ReturnLine, unit: ReturnUnitOption | null) =>
    // A non-tracked line that pins a unit collapses to one — you cannot pin one
    // unit and claim three.
    patch(line.key, {
      serial: unit?.serial ?? '',
      stockItemId: unit?.id ?? null,
      ...(unit && !line.tracked ? { qty: 1 } : {}),
    })

  const pickVariant = (line: ReturnLine, variantId: string) => {
    const v = variantById.get(variantId)
    patch(line.key, {
      variantId,
      label: v?.label ?? '',
      tracked: v?.tracked ?? false,
      pending: v?.units.length ?? 0,
      serial: '',
      stockItemId: null,
      qty: v && !v.tracked ? 1 : 0,
    })
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <div className={cn(RETURN_LINE_GRID, 'border-b bg-muted/30 px-3 py-2')}>
          <Typography variant="caption" tone="muted">
            {INWARDS_STRINGS.returnLineItems.columnPartNumber}
          </Typography>
          <Typography variant="caption" tone="muted">
            {INWARDS_STRINGS.returnLineItems.columnSerialNumber}
          </Typography>
          <Typography variant="caption" tone="muted" className="text-right">
            {INWARDS_STRINGS.returnLineItems.columnQty}
          </Typography>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Typography variant="helper" tone="muted">
              {INWARDS_STRINGS.returnLineItems.emptyState}
            </Typography>
          </div>
        ) : (
          <div
            className={cn(
              rows.length > INNER_SCROLL_ROW_THRESHOLD &&
                'max-h-[32rem] overflow-y-auto',
            )}
          >
            {rows.map((line) => (
              <ReturnLineRow
                key={line.key}
                line={line}
                serialUnits={serialOptionsByKey.get(line.key) ?? NO_UNITS}
                leftByVariant={leftByVariant}
                useVariantOptions={useVariantOptions}
                onPatch={(partial) => patch(line.key, partial)}
                onPickVariant={(variantId) => pickVariant(line, variantId)}
                onPickSerial={(unit) => pickSerial(line, unit)}
                onRemove={() => removeLine(line.key)}
              />
            ))}
          </div>
        )}
      </div>

      <Button type="button" variant="outline" onClick={addLine}>
        <Plus className="size-4" data-icon="inline-start" />
        {INWARDS_STRINGS.lineItems.addLine}
      </Button>
    </div>
  )
}
