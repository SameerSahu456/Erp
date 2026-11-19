import type { DeviceDossier } from '../../../api'
import { type DeviceDetailDialog } from '../../../hooks/devices/useDeviceDetailView'
import { InspectionCompleteDialog } from '../../inspection/InspectionCompleteDialog'
import { QcCompleteDialog } from '../../qc/QcCompleteDialog'
import { RepairCompleteDialog } from '../../repair/RepairCompleteDialog'
import { MoveStockDialog } from '../../stock-transfer/MoveStockDialog'
import { AssignRackDialog } from '../AssignRackDialog'
import { toMovableUnit } from './device-detail-view-helpers'

interface DeviceStageDialogsProps {
  id: string
  device: DeviceDossier['device']
  canMove: boolean
  dialog: DeviceDetailDialog
  onClose: () => void
}

/** The dossier's action dialogs — stage completion forms, rack assignment and
 *  Move Stock. Each stage form is keyed on open so it reopens clean. */
export function DeviceStageDialogs({ id, device, canMove, dialog, onClose }: DeviceStageDialogsProps) {
  const warehouseId = device.warehouse_id ?? ''
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  return (
    <>
      <MoveStockDialog
        open={dialog === 'move'}
        onOpenChange={onOpenChange}
        warehouseId={warehouseId}
        warehouseName={device.warehouse_name ?? ''}
        units={canMove ? [toMovableUnit(id, device)] : []}
        defaultSelectedIds={[id]}
      />
      <InspectionCompleteDialog
        key={dialog === 'inspection' ? id : 'closed'}
        deviceId={dialog === 'inspection' ? id : null}
        onClose={onClose}
      />
      <RepairCompleteDialog
        key={dialog === 'repair' ? `repair-${id}` : 'repair-closed'}
        deviceId={dialog === 'repair' ? id : null}
        onClose={onClose}
      />
      <QcCompleteDialog
        key={dialog === 'qc' ? `qc-${id}` : 'qc-closed'}
        deviceId={dialog === 'qc' ? id : null}
        onClose={onClose}
      />
      <AssignRackDialog
        open={dialog === 'rack'}
        onOpenChange={onOpenChange}
        deviceId={dialog === 'rack' ? id : null}
        warehouseId={warehouseId}
        serial={device.internal_serial}
        mfrSerial={device.manufacturer_serial ?? undefined}
      />
    </>
  )
}
