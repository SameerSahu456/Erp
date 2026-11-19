import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { ReasonDialog } from "@/components/common/dialogs/ReasonDialog"
import { usePermission } from "@shared/rbac"
import { istTodayDateParam } from "@shared/lib/date"

import type { RentalDevice } from "../../api/devices"
import { rentalsCan } from "../../permissions"
import { useMarkDeviceFoundInUse, useRecordDeviceLoss } from "../../hooks/early-exit/useEarlyExit"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.loss

function LostDialog({ device, onClose }: { device: RentalDevice; onClose: () => void }) {
  const record = useRecordDeviceLoss()
  const [confirmedOn, setConfirmedOn] = useState(istTodayDateParam)
  const [evidence, setEvidence] = useState("")
  const [notes, setNotes] = useState("")
  const confirm = () =>
    record.mutate(
      {
        deviceId: device.id,
        body: { confirmed_on: confirmedOn, evidence_reference: evidence.trim(), notes: notes.trim() || null },
      },
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.lostTitle}
      description={S.lostBody}
      isDirty={!!evidence || !!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={record.isPending}>
            {S.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={!confirmedOn || !evidence.trim() || record.isPending}
          >
            {S.confirmLost}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label required htmlFor="loss-confirmedon">{S.confirmedOn}</Label>
          <DatePicker id="loss-confirmedon" value={confirmedOn} max={istTodayDateParam()} onChange={setConfirmedOn} />
        </div>
        <div className="space-y-2">
          <Label required htmlFor="loss-evidence">{S.evidence}</Label>
          <Input id="loss-evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder={S.evidencePlaceholder} />
          <Typography variant="helper" tone="muted">
            {S.evidenceHelper}
          </Typography>
        </div>
        <div className="space-y-2">
          <Label htmlFor="loss-notes">{S.notes}</Label>
          <Textarea id="loss-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
    </OperationDialog>
  )
}

/** Mark lost / found in use (R17). On rent → lost; lost → back on rent. */
export function DeviceLossActions({ device }: { device: RentalDevice }) {
  const { can } = usePermission()
  const found = useMarkDeviceFoundInUse()
  const [open, setOpen] = useState<"lost" | "found" | null>(null)
  if (!can([...rentalsCan.returnUnits])) return null
  const canLose = device.status === "On Rent"
  const canFind = device.status === "Lost"
  if (!canLose && !canFind) return null
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(canLose ? "lost" : "found")}>
        {canLose ? S.markLost : S.foundInUse}
      </Button>
      {open === "lost" && <LostDialog device={device} onClose={() => setOpen(null)} />}
      {open === "found" && (
        <ReasonDialog
          copy={{
            title: S.foundTitle,
            body: S.foundBody,
            reasonLabel: S.foundReason,
            reasonPlaceholder: S.foundPlaceholder,
            confirm: S.confirmFound,
            dismiss: S.cancel,
          }}
          pending={found.isPending}
          onConfirm={async (notes) => {
            await found.mutateAsync({ deviceId: device.id, notes })
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
