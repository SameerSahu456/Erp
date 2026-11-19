import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, ClipboardList, Cpu, Info, Layers, MapPin, Package, Pencil, Plus, Tag } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermission } from '@shared/rbac'
import { imsCan } from '@modules/ims'

import type { DeviceDossier } from '../../../api'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { EntityRef } from '@/components/common/display/EntityRef'
import { Button } from '@/components/ui/button'
import { InfoField } from '../../shared/InfoField'
import { EngineerAssignments } from './EngineerAssignments'
import { correctionStageForWorkflow, type DetailContext } from './helpers'
import { useWmsStageAccess } from '../../../hooks/operations/useStageAccess'
import { RecordSerialDialog } from '../device-identity/RecordSerialDialog'
import { DEVICE_INFO_CARD_STRINGS } from './device-info-card.strings'

/** Device Information card: the icon-grid of core facts, plus the adaptive
 *  Engineer Assignments sub-section (inspection / repair contexts only). */
export function DeviceInfoCard({
  device,
  partModel,
  batch,
  location,
  category,
  ctx,
  liveWorkAssignment,
}: {
  device: DeviceDossier['device']
  partModel: string
  batch: string
  location: string
  category: string
  ctx: DetailContext
  /** The open work-assignment lot this unit currently sits on, if any. Shown
   *  as a document reference beside the GRN batch — only while the device is
   *  actively assigned (CP-361); null when it isn't, and the row is omitted. */
  liveWorkAssignment: DeviceDossier['live_work_assignment']
}) {
  const { canStage, canCorrectDevice } = useWmsStageAccess()
  const { can } = usePermission()
  // The Part No / Model value links into IMS (/ims/parts/:id). A WMS user
  // without IMS read (e.g. an engineer) would otherwise land on the shared
  // "Access Denied" page, so only render the link when they can actually open
  // it — plain text otherwise.
  const canReadParts = can(imsCan.view)
  const [serialOpen, setSerialOpen] = useState(false)

  // Two tiers, mirroring the backend exactly. FILLING a blank is a bench act —
  // the OEM sticker becomes readable whenever the unit is open — so whoever
  // holds the device's CURRENT stage may do it. CORRECTING a recorded serial
  // rewrites which physical unit this record identifies, so it is manager-tier.
  // A device with no live stage (racked, at a vendor) has no bench holder and
  // falls back to the manager tier on both.
  const mayCorrect = canCorrectDevice(device.warehouse_id)
  const benchStage = correctionStageForWorkflow(device.workflow_status)
  const mayFill =
    mayCorrect || (benchStage !== null && canStage(benchStage, device.warehouse_id))
  const hasSerial = !!device.manufacturer_serial
  // Whoever holds the device's current stage may both ADD a blank serial and
  // EDIT a recorded one (CP-193 #1 — the bench engineer owns the serial, not
  // just managers). `mayFill` is that bench-stage gate (it already ORs in the
  // manager tier for a device with no live stage). No access => no affordance,
  // matching DeviceHeaderActions, so a handed-off device shows no dead button.
  const showSerialAction = mayFill

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DEVICE_INFO_CARD_STRINGS.card.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField
            icon={Tag}
            label={DEVICE_INFO_CARD_STRINGS.fields.barcode}
            value={<TruncatedSerial value={device.internal_serial} className="max-w-full font-medium" />}
          />
          <InfoField
            icon={Cpu}
            label={DEVICE_INFO_CARD_STRINGS.fields.serialNo}
            value={
              <SerialValue
                serial={device.manufacturer_serial}
                showAction={showSerialAction}
                onEdit={() => setSerialOpen(true)}
              />
            }
          />
          <InfoField
            icon={Package}
            label={DEVICE_INFO_CARD_STRINGS.fields.partModel}
            value={
              <PartModelValue
                partId={canReadParts ? device.part_id : null}
                partModel={partModel}
              />
            }
          />
          <InfoField
            icon={Boxes}
            label={DEVICE_INFO_CARD_STRINGS.fields.variantName}
            value={device.part_variant_name}
          />
          <InfoField
            icon={Layers}
            label={DEVICE_INFO_CARD_STRINGS.fields.batch}
            value={
              device.grn_batch_id ? (
                // The GRN batch this unit came in on — single click opens the
                // batch, double click copies the number.
                <EntityRef kind="grn" id={device.grn_batch_id} value={batch}>
                  {batch}
                </EntityRef>
              ) : (
                batch
              )
            }
          />
          {/* The live work-assignment lot, beside the GRN batch as a peer
              document reference. Rendered only while the unit is actively on a
              lot (CP-361) — a quiet link, not a status, since being on a lot is
              the normal working state, not an exception. */}
          {liveWorkAssignment ? (
            <InfoField
              icon={ClipboardList}
              label={DEVICE_INFO_CARD_STRINGS.fields.workAssignment}
              value={
                <EntityRef
                  kind="work_assignment"
                  id={liveWorkAssignment.id}
                  value={liveWorkAssignment.wa_number}
                >
                  {liveWorkAssignment.wa_number}
                </EntityRef>
              }
            />
          ) : null}
          <InfoField icon={MapPin} label={DEVICE_INFO_CARD_STRINGS.fields.location} value={location} />
          <InfoField icon={Info} label={DEVICE_INFO_CARD_STRINGS.fields.category} value={category} />
        </div>

        <EngineerAssignments
          deviceId={device.id}
          warehouseId={device.warehouse_id ?? ''}
          ctx={ctx}
          workflowStatus={device.workflow_status ?? ''}
          assignees={{
            inspection: { id: device.inspection_assignee_id, name: device.inspection_assignee_name },
            qc: { id: device.qc_assignee_id, name: device.qc_assignee_name },
            repair: { id: device.repair_assignee_id, name: device.repair_assignee_name },
          }}
        />

        <RecordSerialDialog
          key={`${device.id}:${hasSerial}`}
          deviceId={serialOpen ? device.id : null}
          currentSerial={device.manufacturer_serial ?? null}
          onClose={() => setSerialOpen(false)}
        />
      </CardContent>
    </Card>
  )
}

/** Serial value + the add/edit affordance for whoever holds the bench stage. */
function SerialValue({
  serial,
  showAction,
  onEdit,
}: {
  serial: string | null | undefined
  showAction: boolean
  onEdit: () => void
}) {
  const hasSerial = !!serial
  return (
    <div className="flex min-w-0 items-center gap-1">
      {/* Skip the "—" placeholder when an "+ Add" button will stand in
          for a blank serial; keep it only when there is a serial to
          show, or no Add affordance to replace it (CP-177 #24). */}
      {(hasSerial || !showAction) && (
        <TruncatedSerial value={serial} className="min-w-0 flex-1 font-medium" />
      )}
      {showAction ? (
        <Button variant="ghost" size="sm" className="h-6 shrink-0 px-2" onClick={onEdit}>
          {hasSerial ? (
            <Pencil className="size-3.5" data-icon="inline-start" />
          ) : (
            <Plus className="size-3.5" data-icon="inline-start" />
          )}
          {hasSerial
            ? DEVICE_INFO_CARD_STRINGS.actions.editSerial
            : DEVICE_INFO_CARD_STRINGS.actions.addSerial}
        </Button>
      ) : null}
    </div>
  )
}

/** Part model, linked into IMS only when the caller passes a readable part id. */
function PartModelValue({ partId, partModel }: { partId: string | null | undefined; partModel: string }) {
  if (!partId) return <>{partModel}</>
  // §8.3: polymorphic Button via `render`, not a raw anchor. Gated on IMS read
  // so a user without it sees plain text, not a link to Access Denied.
  return (
    <Button
      variant="link"
      // Link buttons are nowrap by default; cap to the column and wrap (§8.7).
      className="h-auto min-w-0 max-w-full justify-start whitespace-normal break-words p-0 text-left font-medium"
      render={<Link to={`/ims/parts/${partId}`} />}
    >
      {partModel}
    </Button>
  )
}
