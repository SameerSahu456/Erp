import { MapPin, PackageOpen, Warehouse } from 'lucide-react'

import { AsyncSelect } from '@/components/ui/async-select'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'

import type { BinOption, RackOption } from '../../api'
import { useAssignRack } from '../../hooks/devices/useAssignRack'
import { StageCompleteFooter } from '../operations/StageCompleteFooter'
import { OperationDialog } from '../shared/OperationDialog'
import { ASSIGN_RACK_DIALOG_STRINGS as S } from './assign-rack-dialog.strings'
import { binOccText, rackOccText } from './assign-rack/assign-rack-helpers'
import { HeaderField, SelectedSlotPreview, SlotOptionRow } from './assign-rack/AssignRackParts'

interface AssignRackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Device being racked; null = no device selected. */
  deviceId: string | null
  /** Device's warehouse — scopes the assignable-location list. */
  warehouseId: string
  /** Device internal serial — the "Serial No" shown in the header. */
  serial?: string
  /** Manufacturer serial — the "Mfr Serial" shown in the header. */
  mfrSerial?: string
  /** Where the device is sitting now, if anywhere. Pre-selects the picker
   *  (device-placement D5); null opens it empty. */
  currentLocationId?: string | null
}

/**
 * Assign a QC-passed device to a real warehouse slot. The backend model is a
 * two-level rack → bin hierarchy, so the picker cascades: choose a rack, then
 * (only for a rack that holds bins) choose a bin. A direct-storage rack is the
 * slot itself. Names + live occupancy throughout.
 */
export function AssignRackDialog(props: AssignRackDialogProps) {
  const { open, onOpenChange, serial, mfrSerial } = props
  const r = useAssignRack(props)

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          {S.title}
        </span>
      }
      headerExtra={
        (serial || mfrSerial) && (
          <div className="grid grid-cols-2 gap-x-4 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <HeaderField label={S.serialNoLabel} value={serial} />
            <HeaderField label={S.mfrSerialLabel} value={mfrSerial} />
          </div>
        )
      }
      bodyClassName="space-y-4"
      isDirty={r.dirty}
      footer={({ requestClose }) => (
        <StageCompleteFooter
          cancelLabel={S.cancel}
          submitLabel={S.assign}
          submitIcon={<MapPin className="size-4" data-icon="inline-start" />}
          onCancel={requestClose}
          onSubmit={r.submit}
          disabled={!r.targetId || r.assign.isPending}
          pending={r.assign.isPending}
          blockReason={r.blockReason}
        />
      )}
    >
      {/* Warehouse — read-only: a device is always racked in its own warehouse. */}
      <div className="space-y-1.5">
        <Label>{S.warehouseLabel}</Label>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-3">
          <Warehouse className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <Typography variant="body" truncate asChild>
            <span className="min-w-0 flex-1">
              {r.warehouse ? `${r.warehouse.code} — ${r.warehouse.name}` : S.warehouseLoading}
            </span>
          </Typography>
        </div>
      </div>

      <AssignRackPicker r={r} />
    </OperationDialog>
  )
}

function AssignRackPicker({ r }: { r: ReturnType<typeof useAssignRack> }) {
  if (r.loadingRacks) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <p className="py-2">{S.loadingRacks}</p>
      </Typography>
    )
  }
  if (r.noRacks) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-3">
        <PackageOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.noRacks}</p>
        </Typography>
      </div>
    )
  }
  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="assign-rack" required>
          {S.rackLabel}
        </Label>
        <AsyncSelect<RackOption>
          id="assign-rack"
          value={r.selectedRack ? { id: r.selectedRack.id, label: r.selectedRack.name } : null}
          onValueChange={(v) => {
            if (!v) r.clearRack()
          }}
          onItemPick={(rack) => r.pickRack(rack.id)}
          useOptions={r.useRackOptions}
          // `is_full`: a direct rack at capacity, or a with-bins rack whose every bin is full.
          isItemDisabled={(rack) => rack.is_full}
          toLabel={(rack) => rack.name}
          renderItem={(rack) => (
            <SlotOptionRow name={rack.name} occupancy={rackOccText(rack)} full={rack.is_full} />
          )}
          placeholder={S.rackPlaceholder}
          searchPlaceholder={S.rackPlaceholder}
          loadOnOpen
          className="w-full"
        />
      </div>

      {/* Bin — only for a rack that organizes bins. */}
      {r.isRackWithBins && <BinField r={r} />}

      <SelectedSlotPreview
        rackName={r.selectedRack?.name}
        binName={r.selectedBin?.name}
        targetNode={r.targetNode}
        needsBin={r.isRackWithBins}
      />
    </div>
  )
}

function BinField({ r }: { r: ReturnType<typeof useAssignRack> }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="assign-bin" required>
        {S.binLabel}
      </Label>
      <BinPicker r={r} />
    </div>
  )
}

function BinPicker({ r }: { r: ReturnType<typeof useAssignRack> }) {
  if (r.binsQuery.isLoading) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.loadingBins}</p>
      </Typography>
    )
  }
  if (r.bins.length === 0) {
    return (
      <Typography variant="helper" tone="danger" asChild>
        <p>{S.noBins}</p>
      </Typography>
    )
  }
  return (
    <AsyncSelect<BinOption>
      id="assign-bin"
      value={r.selectedBin ? { id: r.selectedBin.id, label: r.selectedBin.name } : null}
      onValueChange={(v) => {
        if (!v) r.pickBin('')
      }}
      onItemPick={(b) => r.pickBin(b.id)}
      useOptions={r.useBinOptions}
      isItemDisabled={(b) => b.is_full}
      toLabel={(b) => b.name}
      renderItem={(b) => <SlotOptionRow name={b.name} occupancy={binOccText(b)} full={b.is_full} />}
      placeholder={S.binPlaceholder}
      searchPlaceholder={S.binPlaceholder}
      loadOnOpen
      className="w-full"
    />
  )
}
