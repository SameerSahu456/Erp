import { useState } from 'react'
import { GitBranch, Replace } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useGrnBatch } from '../../../hooks/inwards/useInwards'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { ReidentifyDeviceDialog } from '../device-identity/ReidentifyDeviceDialog'
import { RelinkPoItemDialog } from '../device-identity/RelinkPoItemDialog'
import { DEVICE_IDENTITY_STRINGS } from '../device-identity/device-identity.strings'
import { canReidentifyAtStage } from './helpers'

interface DeviceIdentityActionsProps {
  deviceId: string
  workflowStatus: string
  warehouseId: string
  grnBatchId: string | null
  currentPoItemId?: string | null
}

/** Identity corrections: managers only (spec D5), at inspection. Re-identify fits every
 *  inward; "Change PO line" moves between PO lines, so only a PO-received unit gets it. */
export function DeviceIdentityActions({
  deviceId,
  workflowStatus,
  warehouseId,
  grnBatchId,
  currentPoItemId,
}: DeviceIdentityActionsProps) {
  const { canCorrectDevice } = useWmsStageAccess()
  const [reidentifyOpen, setReidentifyOpen] = useState(false)
  const [relinkOpen, setRelinkOpen] = useState(false)
  const mayCorrect = canCorrectDevice(warehouseId) && canReidentifyAtStage(workflowStatus)
  // Fetch the batch only past the other gates: it needs wms:inward_read, which engineers lack.
  const grnBatch = useGrnBatch(mayCorrect && grnBatchId ? grnBatchId : '')
  const isPoSourced = grnBatch.data?.inward_type === 'purchase_order'
  if (!mayCorrect) return null

  return (
    <>
      <Button variant="outline" onClick={() => setReidentifyOpen(true)}>
        <Replace className="size-4" data-icon="inline-start" />
        {DEVICE_IDENTITY_STRINGS.actions.reidentify}
      </Button>
      {isPoSourced ? (
        <Button variant="outline" onClick={() => setRelinkOpen(true)}>
          <GitBranch className="size-4" data-icon="inline-start" />
          {DEVICE_IDENTITY_STRINGS.actions.relink}
        </Button>
      ) : null}
      <ReidentifyDeviceDialog
        key={`reid:${deviceId}`}
        deviceId={reidentifyOpen ? deviceId : null}
        onClose={() => setReidentifyOpen(false)}
        poSourced={isPoSourced}
      />
      <RelinkPoItemDialog
        key={`relink:${deviceId}`}
        deviceId={relinkOpen ? deviceId : null}
        grnBatchId={grnBatchId}
        currentPoItemId={currentPoItemId}
        onClose={() => setRelinkOpen(false)}
      />
    </>
  )
}
