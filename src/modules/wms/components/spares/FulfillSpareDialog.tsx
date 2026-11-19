import { Loader2 } from 'lucide-react'
import { partOptionDescription } from '@modules/ims'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { AsyncSelect } from '@/components/ui/async-select'
import { CategoryPicker } from '@/components/common/pickers/CategoryPicker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { VariantListItem } from '@modules/ims'

import { useFulfillSpare } from '../../hooks/spares/useFulfillSpare'
import { OperationDialog } from '../shared/OperationDialog'
import { FulfillSpareSlots } from './FulfillSpareSlots'
import { variantLabel, type FulfillSubject } from './fulfill-spare-helpers'
import { SPARES_STRINGS as S } from './spares.strings'

export type { FulfillSubject } from './fulfill-spare-helpers'

const V = S.fulfillDialogView

/** Each part in the dropdown says how many are available, so the store
 *  manager picks one that can actually be issued. */
function partWithAvailability(v: VariantListItem): string {
  return [V.availableInPicker(v.available_stock_qty ?? 0), partOptionDescription(v)]
    .filter(Boolean)
    .join(' · ')
}

interface FulfillSpareDialogProps {
  /** Spare request being fulfilled; null = closed. */
  request: FulfillSubject | null
  /** Limits the unit picker to this warehouse; null = all accessible warehouses. */
  warehouseId?: string | null
  onClose: () => void
}

/** Fulfill a spare request by naming the physical unit issued for EACH requested
 *  quantity: a request for 5 shows 5 serial slots. Each slot is a search/scan
 *  picker over the part's available in-stock units (the backend needs a real
 *  stock_item_id). Every filled slot becomes one fulfilment line of quantity 1.
 *
 *  The store manager first settles WHICH part is issued: a request raised by
 *  description has none yet, and the engineer's own pick may be corrected. The
 *  part is locked once any unit has been issued against the request. */
export function FulfillSpareDialog({ request, warehouseId, onClose }: FulfillSpareDialogProps) {
  const f = useFulfillSpare(request, warehouseId, onClose)

  function renderStock(partVariantId: string) {
    if (f.stockLoading) {
      return (
        <Typography variant="helper" tone="muted" asChild>
          <p>{V.loading}</p>
        </Typography>
      )
    }
    if (f.inStockCount === 0) {
      return (
        <Typography variant="helper" tone="danger" asChild>
          <p>{V.noUnits}</p>
        </Typography>
      )
    }
    return (
      <div className="space-y-3">
        <Typography variant="body-strong" asChild>
          <p className="tabular-nums">{V.availableHere(f.inStockCount)}</p>
        </Typography>
        <FulfillSpareSlots
        slots={f.slots}
        remaining={f.remaining}
        inStockCount={f.inStockCount}
        chosenCount={f.chosenCount}
        partVariantId={partVariantId}
        warehouseId={warehouseId}
        open={f.open}
        labelFor={f.labelFor}
        onPick={f.pickSlot}
        />
      </div>
    )
  }

  return (
    <OperationDialog
      open={f.open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={S.fulfillDialog.title}
      isDirty={f.dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose}>
            {S.fulfillDialog.cancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button onClick={f.submit} disabled={!f.ready || f.pending}>
                  {f.pending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
                  {S.bodyView.fulfillAction}
                  {f.chosenCount > 0 ? ` (${f.chosenCount})` : ''}
                </Button>
              </TooltipTrigger>
              {f.blockReason && !f.pending && <TooltipContent>{f.blockReason}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      {request && (
        <div className="min-w-0 space-y-5">
          {f.partLocked ? (
            <Typography variant="helper" tone="muted" asChild>
              <p>{V.partLocked}</p>
            </Typography>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fulfil-spare-category">{V.categoryFieldLabel}</Label>
                <CategoryPicker
                  id="fulfil-spare-category"
                  value={f.effectiveCategory}
                  onChange={f.setCategoryId}
                  allowAll
                  placeholder={V.categoryFilterPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label required htmlFor="fulfil-spare-part">
                  {V.partFieldLabel}
                </Label>
                <AsyncSelect<VariantListItem>
                  id="fulfil-spare-part"
                  value={f.part}
                  onValueChange={f.choosePart}
                  useOptions={f.useVariantOptions}
                  toLabel={variantLabel}
                  getDescription={partWithAvailability}
                  searchable
                  loadOnOpen
                  placeholder={V.partPlaceholder}
                  searchPlaceholder={V.partSearchPlaceholder}
                />
              </div>
            </div>
          )}
          {f.partVariantId ? renderStock(f.partVariantId) : null}
        </div>
      )}
    </OperationDialog>
  )
}
