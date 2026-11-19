import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { DatePicker } from "@/components/common/pickers/DatePicker"

import type { SalesReturnRequestDetailState } from "../../hooks/sales-return-requests/useSalesReturnRequestDetail"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

type SalesReturnLogisticsDialogProps = Pick<
  SalesReturnRequestDetailState,
  | "editingLogistics"
  | "setEditingLogistics"
  | "logisticsDirty"
  | "patchMutation"
  | "saveLogistics"
  | "courier"
  | "setCourier"
  | "awb"
  | "setAwb"
  | "expectedArrival"
  | "setExpectedArrival"
  | "today"
>

/** Edit a few logistics fields — a dialog, not an inline swap (§3.1). */
export function SalesReturnLogisticsDialog({
  editingLogistics,
  setEditingLogistics,
  logisticsDirty,
  patchMutation,
  saveLogistics,
  courier,
  setCourier,
  awb,
  setAwb,
  expectedArrival,
  setExpectedArrival,
  today,
}: SalesReturnLogisticsDialogProps) {
  return (
    <OperationDialog
      open={editingLogistics}
      onOpenChange={setEditingLogistics}
      title={S.detail.logistics.edit}
      description={S.detail.logistics.dialogDescription}
      isDirty={logisticsDirty}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={patchMutation.isPending}
          >
            {S.detail.logistics.cancel}
          </Button>
          <Button
            onClick={() => void saveLogistics()}
            disabled={patchMutation.isPending}
          >
            {patchMutation.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {S.detail.logistics.save}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="sret-courier">{S.detail.logistics.courier}</Label>
          <Input
            id="sret-courier"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            // Normalize on blur so the on-screen value matches what's saved (§9).
            onBlur={(e) => setCourier(e.target.value.trim())}
            // Cap at the backend column limit so a long value can't 422 on
            // save (matches the create form).
            maxLength={100}
            placeholder={S.detail.logistics.courierPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sret-awb">{S.detail.logistics.awb}</Label>
          <Input
            id="sret-awb"
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            // AWB numbers are upper-case; trim + uppercase on blur (§9).
            onBlur={(e) => setAwb(e.target.value.trim().toUpperCase())}
            // Cap at the backend column limit so a long value can't 422 on
            // save (matches the create form).
            maxLength={100}
            placeholder={S.detail.logistics.awbPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sret-expected-arrival">
            {S.detail.logistics.expectedArrival}
          </Label>
          {/* Same picker the create form uses; `min` keeps a new pick out of
              the past without dropping an already-passed value. */}
          <DatePicker
            id="sret-expected-arrival"
            min={today}
            value={expectedArrival}
            onChange={setExpectedArrival}
          />
        </div>
      </div>
    </OperationDialog>
  )
}
