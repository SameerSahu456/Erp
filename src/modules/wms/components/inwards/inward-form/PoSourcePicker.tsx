import { Building2, Check, Package, Sparkles } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { AsyncSelect } from '@/components/ui/async-select'
import { cn } from '@/lib/utils'

import { INWARDS_STRINGS } from '../inwards.strings'
import { FieldLabel, DetailPair } from './FormPrimitives'
import { type InwardForm, type PoOption } from './useInwardForm'

/** The two PO origins the picker offers (filters the PO list by condition). */
const ORIGIN_OPTIONS = ['new', 'refurbished'] as const

/** PO flow: choose new/refurbished origin + the purchase order, then a summary of
 *  the PO's destination + ordered / received / pending counts. The origin choice
 *  filters the PO picker to matching-condition POs. */
export function PoSourcePicker({ f }: { f: InwardForm }) {
  const { origin, setOrigin, selectedPo, usePoOptions, setPoId, setLines, sources, sourcesQuery } = f
  const noPos = !sourcesQuery.isLoading && sources.length === 0
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>{INWARDS_STRINGS.inwardInfo.originFieldLabel}</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {ORIGIN_OPTIONS.map((opt) => {
              const selected = origin === opt
              const Icon = opt === 'refurbished' ? Sparkles : Package
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setOrigin(opt)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-card hover:bg-muted/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    <Typography variant="body-strong">
                      {opt === 'refurbished'
                        ? INWARDS_STRINGS.inwardInfo.originRefurb
                        : INWARDS_STRINGS.inwardInfo.originNew}
                    </Typography>
                  </span>
                  {selected && <Check className="size-4" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel required>{INWARDS_STRINGS.poSourcePicker.purchaseOrderLabel}</FieldLabel>
          {sourcesQuery.isLoading && (
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          )}
          {!sourcesQuery.isLoading && noPos && (
            // Empty state stays INSIDE the picker so the Origin switch above
            // remains reachable — the operator can always flip back to the
            // other condition instead of getting stranded on an empty origin.
            <Typography variant="body" tone="muted">
              {INWARDS_STRINGS.poSourcePicker.noReceivablePos(
                origin === 'refurbished'
                  ? INWARDS_STRINGS.inwardInfo.originRefurb
                  : INWARDS_STRINGS.inwardInfo.originNew,
              )}
            </Typography>
          )}
          {!sourcesQuery.isLoading && !noPos && (
            <AsyncSelect<PoOption>
              value={
                selectedPo
                  ? {
                      id: selectedPo.source_entity_id,
                      label: `${selectedPo.display_number}${selectedPo.supplier_name ? ` · ${selectedPo.supplier_name}` : ''}`,
                    }
                  : null
              }
              onValueChange={(next) => {
                if (!next) {
                  setPoId('')
                  setLines([])
                }
              }}
              onItemPick={(po) => {
                setPoId(po.source_entity_id)
                setLines([])
              }}
              useOptions={usePoOptions}
              toLabel={(po) =>
                `${po.display_number}${po.supplier_name ? ` · ${po.supplier_name}` : ''}`
              }
              placeholder={INWARDS_STRINGS.poSourcePicker.selectPlaceholder}
              searchPlaceholder={INWARDS_STRINGS.poSourcePicker.searchPlaceholder}
              className="w-full"
              renderItem={(po) => (
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {po.display_number}
                    {po.supplier_name ? ` · ${po.supplier_name}` : ''}
                  </span>
                  <Typography variant="caption" tone="muted" numeric className="shrink-0">
                    {INWARDS_STRINGS.poSourcePicker.pending(po.pending_quantity)}
                  </Typography>
                </span>
              )}
            />
          )}
        </div>
      </div>

      {selectedPo && (
        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <Typography variant="body-strong">
              {selectedPo.supplier_name ?? selectedPo.display_number}
            </Typography>
            <StatusBadge variant="info">{selectedPo.status}</StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <DetailPair
              label={INWARDS_STRINGS.poSourcePicker.poNumberLabel}
              value={selectedPo.display_number}
            />
            <DetailPair
              label={INWARDS_STRINGS.poSourcePicker.destinationLabel}
              value={selectedPo.warehouse_name ?? '—'}
            />
            <DetailPair label={INWARDS_STRINGS.poSourcePicker.orderedLabel} value={selectedPo.ordered_quantity} />
            <DetailPair label={INWARDS_STRINGS.poSourcePicker.receivedLabel} value={selectedPo.received_quantity} />
            <DetailPair label={INWARDS_STRINGS.poSourcePicker.pendingLabel} value={selectedPo.pending_quantity} />
          </div>
        </div>
      )}
    </div>
  )
}
