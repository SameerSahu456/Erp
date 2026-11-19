import { useState } from "react"

import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { istTodayDateParam } from "@shared/lib/date"

import { useIssueBillingAdjustment } from "../../hooks/billing-adjustments/useBillingAdjustments"
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings"
import { BILLING_ADJUSTMENT_STRINGS as S } from "./billing-adjustments.strings"

/** Issue the adjustment's credit note: date, optional number, reason. */
export function IssueAdjustmentDialog({ adjustmentId, onClose }: { adjustmentId: string; onClose: () => void }) {
  const issue = useIssueBillingAdjustment()
  const [cnDate, setCnDate] = useState(istTodayDateParam)
  const [cnNumber, setCnNumber] = useState("")
  const [reason, setReason] = useState<string>(S.reasonDefault)
  const confirm = () =>
    issue.mutate(
      { id: adjustmentId, body: { cn_date: cnDate, cn_number: cnNumber.trim() || null, reason: reason.trim() } },
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.issueTitle}
      description={S.issueDescription}
      isDirty={!!cnNumber}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={issue.isPending}>
            {C.cancel}
          </Button>
          <Button onClick={confirm} disabled={!cnDate || !reason.trim() || issue.isPending}>
            {S.confirmIssue}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label required htmlFor="adj-cndate">
            {S.cnDate}
          </Label>
          <DatePicker id="adj-cndate" value={cnDate} onChange={setCnDate} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="adj-cnnumber">{S.cnNumber}</Label>
          <Input id="adj-cnnumber" value={cnNumber} onChange={(e) => setCnNumber(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2">
          <Label required htmlFor="adj-reason">
            {C.reason}
          </Label>
          <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </OperationDialog>
  )
}
