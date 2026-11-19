import { Building2 } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { AsyncSelect } from '@/components/ui/async-select'

import { INWARDS_STRINGS } from '../inwards.strings'
import { FieldLabel, DetailPair } from './FormPrimitives'
import { WarehouseSelect } from './WarehouseSelect'
import { type InwardForm, type ReturnOption } from './useInwardForm'
import { emptyReturnState } from '../return-line-items-helpers'
import { UnannouncedRentalReturnDialog } from '../rental-scan/UnannouncedRentalReturnDialog'
import { sourceOptionDescription } from '../../shared/source-option-description'

const R = INWARDS_STRINGS.returnSourcePicker

type Selected = NonNullable<InwardForm['selectedReturn']>

function ReturnSourceField({ f }: { f: InwardForm }) {
  const { cfg, selectedReturn, setPoId, setReturnState, setPartLines, setReturnWarehouse } = f
  const noun = cfg?.noun ?? R.sourceNoun
  return (
    <div className="space-y-2">
      <FieldLabel required>{cfg?.label ?? R.sourceLabel}</FieldLabel>
      <AsyncSelect<ReturnOption>
        value={
          selectedReturn
            ? { id: selectedReturn.source_entity_id, label: selectedReturn.display_number }
            : null
        }
        onValueChange={(next) => {
          if (!next) {
            setPoId('')
            setReturnState(emptyReturnState())
            setPartLines([])
            setReturnWarehouse('', '')
          }
        }}
        onItemPick={(r) => f.pickReturnSource(r.source_entity_id)}
        useOptions={f.useReturnOptions}
        toLabel={(r) => r.display_number}
        placeholder={R.selectPlaceholder(noun)}
        searchPlaceholder={R.searchPlaceholder(noun)}
        className="w-full"
        renderItem={(r) => (
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{r.display_number}</span>
              {/* Who it is from — the customer, or the employee for a staff return. */}
              {sourceOptionDescription({
                who: r.account_name || r.employee_name,
              }) && (
                <Typography variant="caption" tone="muted" className="block truncate">
                  {sourceOptionDescription({
                    who: r.account_name || r.employee_name,
                  })}
                </Typography>
              )}
            </span>
            <Typography variant="caption" tone="muted" numeric className="shrink-0">
              {R.pendingReturn(r.pending_return_qty ?? 0)}
            </Typography>
          </span>
        )}
      />
      {f.returnSources.length === 0 && (
        <Typography variant="helper" tone="muted">
          {R.noneStart}
          {cfg?.noun}
          {R.pluralSuffix}
          {R.noneEnd}
        </Typography>
      )}
    </div>
  )
}

function ReturnWarehouseField({ f }: { f: InwardForm }) {
  const { returnWarehouseId } = f
  return (
    <div className="space-y-2">
      <FieldLabel required>{INWARDS_STRINGS.manualCapture.receiveIntoWarehouseLabel}</FieldLabel>
      {f.cfg?.warehouseFromRow ? (
        // Transfer inward: destination is fixed to the transfer's target
        // warehouse (taken from the picked row) — show it read-only.
        <DetailPair
          label=""
          value={returnWarehouseId ? f.warehouseName(returnWarehouseId) : R.selectTransferFirst}
        />
      ) : (
        <WarehouseSelect
          key={f.warehouseOptionsKey}
          value={returnWarehouseId}
          label={f.returnWarehouseName}
          onChange={f.setReturnWarehouse}
          warehouses={f.warehouses}
          useOptions={f.useScopedWarehouseOptions}
        />
      )}
    </div>
  )
}

function ReturnSourceSummary({ f, selected }: { f: InwardForm; selected: Selected }) {
  const { returnWarehouseId } = f
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <Typography variant="body-strong">{selected.display_number}</Typography>
        <StatusBadge variant="info">{selected.status}</StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DetailPair label={R.dispatchedLabel} value={selected.dispatched_qty} />
        <DetailPair label={R.returnedLabel} value={selected.returned_qty} />
        <DetailPair label={R.pendingReturnLabel} value={selected.pending_return_qty ?? 0} />
        <DetailPair
          label={R.receivingIntoLabel}
          value={returnWarehouseId ? f.warehouseName(returnWarehouseId) : '—'}
        />
      </div>
    </div>
  )
}

/** Return flow: pick the dispatched source document + the destination warehouse,
 *  then a summary of dispatched / returned / pending counts. */
export function ReturnSourcePicker({ f }: { f: InwardForm }) {
  const { selectedReturn } = f
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Rental boxes can arrive with no request at all (R7). */}
      {f.inwardType === 'rental_return' && !selectedReturn && (
        <div>
          <UnannouncedRentalReturnDialog
            warehouses={f.warehouses}
            useScopedWarehouseOptions={f.useScopedWarehouseOptions}
            warehouseOptionsKey={f.warehouseOptionsKey}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ReturnSourceField f={f} />
        <ReturnWarehouseField f={f} />
      </div>

      {selectedReturn && <ReturnSourceSummary f={f} selected={selectedReturn} />}
    </div>
  )
}
