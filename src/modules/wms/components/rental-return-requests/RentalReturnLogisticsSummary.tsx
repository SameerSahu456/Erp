import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { formatIST_date } from "@shared/lib/date"
import { usePatchRentalReturnRequest, type RentalReturnRequestWire } from "@modules/crm"

import {
  RENTAL_RETURN_PICKUP_LABEL,
  type RentalReturnPickupBy,
} from "../../constants/rental-return-status"
import { Detail } from "../shared/Detail"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

const L = S.detail.logistics
const NONE = S.detail.lines.unknown

/** Edit a few logistics fields — a dialog, not an inline swap (§3.1). */
function EditLogisticsDialog({
  rret,
  open,
  onOpenChange,
}: {
  rret: RentalReturnRequestWire
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const patch = usePatchRentalReturnRequest()
  const [courier, setCourier] = useState(rret.courier_name ?? "")
  const [awb, setAwb] = useState(rret.awb_number ?? "")
  // `mutate`, not `mutateAsync`: the hook's onError already toasts.
  const save = () =>
    patch.mutate(
      { rretId: rret.id, body: { courier_name: courier.trim() || null, awb_number: awb.trim() || null } },
      { onSuccess: () => onOpenChange(false) },
    )
  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={L.edit}
      description={L.dialogDescription}
      isDirty={courier !== (rret.courier_name ?? "") || awb !== (rret.awb_number ?? "")}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={patch.isPending}>
            {L.cancel}
          </Button>
          <Button onClick={save} disabled={patch.isPending}>
            {L.save}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="rretlog-courier">{L.courier}</Label>
          <Input id="rretlog-courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder={L.courierPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rretlog-awb">{L.awb}</Label>
          <Input id="rretlog-awb" value={awb} onChange={(e) => setAwb(e.target.value)} placeholder={L.awbPlaceholder} />
        </div>
      </div>
    </OperationDialog>
  )
}

/** Logistics — recorded, never state-bearing. */
export function RentalReturnLogisticsSummary({
  rret,
  canEdit,
}: {
  rret: RentalReturnRequestWire
  /** The edit endpoint is `crm:manage`; without it the button is not offered. */
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const pickup = rret.pickup_by
    ? (RENTAL_RETURN_PICKUP_LABEL[rret.pickup_by as RentalReturnPickupBy] ?? rret.pickup_by)
    : NONE
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{L.heading}</CardTitle>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {L.edit}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Detail label={L.pickupBy} value={pickup} />
        <Detail label={L.courier} value={rret.courier_name ?? NONE} />
        <Detail label={L.awb} value={rret.awb_number ?? NONE} />
        <Detail
          label={L.expectedArrival}
          value={rret.expected_arrival_date ? formatIST_date(rret.expected_arrival_date) : NONE}
        />
      </CardContent>
      {/* Keyed on open so each edit starts from the saved values. */}
      {editing && (
        <EditLogisticsDialog rret={rret} open={editing} onOpenChange={setEditing} />
      )}
    </Card>
  )
}
