import { useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/common/forms/FieldError'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { Typography } from '@/components/ui/typography'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useWarehouseScope } from '../../context/warehouse-scope'
import { OperationDialog } from '../shared/OperationDialog'
import { RackBinLocationPicker } from '../shared/RackBinLocationPicker'
import { usePlaceScrappedDevice } from '../../hooks/devices/useDeviceScrap'
import { ApiError } from '@shared/api/envelope'
import { SCRAP_PLACEMENT_QUEUE_STRINGS as S } from './scrap-placement-queue.strings'

interface ScrapAssignLocationDialogProps {
  /** The condemned unit to shelve. `null` keeps the dialog closed. */
  subject: { id: string; warehouseId: string; serial: string; mfrSerial: string } | null
  onClose: () => void
}

/**
 * The store manager's "Assign Location" action on the scrap placement queue
 * (device-scrap D6). Reuses the SAME rack→bin cascade picker every other
 * placement flow uses (`RackBinLocationPicker`, as `MoveStockDialog` does) —
 * never a second picker. Capacity IS enforced here (a genuine storage
 * decision), and `LOCATION_CAPACITY_EXCEEDED` is surfaced INLINE on the
 * location field rather than as a toast, since the user's very next move is
 * picking a different location.
 */
export function ScrapAssignLocationDialog({ subject, onClose }: ScrapAssignLocationDialogProps) {
  const open = subject !== null
  const { pickerWarehouses } = useWarehouseScope()
  const [locationId, setLocationId] = useState('')
  const [chosenWarehouseId, setChosenWarehouseId] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const place = usePlaceScrappedDevice()

  // A unit can be condemned while holding NO warehouse (an IMS-created unit
  // with no warehouse is `available`, and `available` is scrappable), and it
  // is exactly the population this queue exists for. The rack picker's own
  // query is disabled on an empty warehouseId, so without this step the
  // dialog would open with a dropdown that never loads — the action visible
  // and silently non-functional. `place` derives the unit's warehouse_id from
  // the location it lands on, so choosing here is sufficient.
  const needsWarehouse = open && !subject?.warehouseId
  const warehouseId = subject?.warehouseId || chosenWarehouseId

  const close = () => {
    setLocationId('')
    setChosenWarehouseId('')
    setFieldError(null)
    onClose()
  }

  const submit = async () => {
    if (!subject || !locationId) return
    setFieldError(null)
    try {
      await place.mutateAsync({ id: subject.id, body: { location_id: locationId } })
      close()
    } catch (err) {
      if (err instanceof ApiError && err.businessCode === 'LOCATION_CAPACITY_EXCEEDED') {
        setFieldError(err.message)
        return
      }
      // Every other failure already toasts from the hook's own onError.
    }
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={S.rowActions.assignLocation}
      headerExtra={
        subject && (
          <div className="grid grid-cols-2 gap-x-4 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <div className="min-w-0">
              <Typography variant="caption" tone="muted" asChild>
                <span className="block">{S.columns.serial}</span>
              </Typography>
              <TruncatedSerial value={subject.serial} className="max-w-full" />
            </div>
            <div className="min-w-0">
              <Typography variant="caption" tone="muted" asChild>
                <span className="block">{S.columns.mfrSerial}</span>
              </Typography>
              <TruncatedSerial value={subject.mfrSerial} className="max-w-full" />
            </div>
          </div>
        )
      }
      isDirty={locationId !== ''}
      bodyClassName="space-y-2"
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={place.isPending}>
            {S.assignDialog.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={!locationId || place.isPending}>
            {place.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            <MapPin className="size-4" data-icon="inline-start" />
            {S.rowActions.assignLocation}
          </Button>
        </>
      )}
    >
      {needsWarehouse && (
        <div className="space-y-1.5">
          <Label htmlFor="scrap-place-warehouse">{S.assignDialog.warehouseLabel}</Label>
          <Select
            value={chosenWarehouseId}
            onValueChange={(id) => {
              setChosenWarehouseId(id ?? '')
              // A rack from the previous warehouse is no longer valid.
              setLocationId('')
              setFieldError(null)
            }}
          >
            <SelectTrigger id="scrap-place-warehouse">
              <SelectValue placeholder={S.assignDialog.warehousePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {pickerWarehouses.map((w) => (
                <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Typography variant="helper" tone="muted" asChild>
            <p>{S.assignDialog.warehouseHelp}</p>
          </Typography>
        </div>
      )}
      <RackBinLocationPicker
        warehouseId={warehouseId}
        enabled={open && !!warehouseId}
        value={locationId}
        onChange={(id) => {
          setLocationId(id)
          setFieldError(null)
        }}
      />
      <FieldError message={fieldError} />
    </OperationDialog>
  )
}
