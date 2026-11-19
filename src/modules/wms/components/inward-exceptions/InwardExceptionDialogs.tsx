import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { useRentalDeviceOptions } from "@modules/rentals"

import type { InwardException } from "../../api"
import {
  RETURN_METHOD_LABEL,
  RETURN_METHOD_OPTIONS,
  type ReturnMethod,
} from "../../constants/inward-exception"
import {
  useLinkInwardException,
  useReturnInwardException,
} from "../../hooks/inward-exceptions/useInwardExceptions"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

interface DialogProps {
  row: InwardException
  onClose: () => void
}

/** Link the box to the rental unit it really is (§8). Mounted only while
 *  open, so each opening starts empty. */
export function LinkExceptionDialog({ row, onClose }: DialogProps) {
  const link = useLinkInwardException()
  const useOptions = useRentalDeviceOptions(row.account_id)
  const [unit, setUnit] = useState<AsyncSelectOption | null>(null)
  const [notes, setNotes] = useState("")
  // `mutate`, not `mutateAsync`: the hook's onError already toasts.
  const confirm = () =>
    link.mutate(
      { id: row.id, body: { rental_device_id: unit?.id ?? null, notes: notes.trim() || null } },
      { onSuccess: onClose },
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.link.title}
      description={S.link.description}
      isDirty={!!unit || !!notes}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={link.isPending}>
            {S.link.cancel}
          </Button>
          <Button onClick={confirm} disabled={link.isPending}>
            {S.link.confirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{S.link.unit}</Label>
          <AsyncSelect
            value={unit}
            onValueChange={setUnit}
            useOptions={useOptions}
            toLabel={(d) => [d.serial_number, d.part_number, d.sales_order_number].filter(Boolean).join(" · ")}
            placeholder={S.link.unitPlaceholder}
            clearable
            className="w-full"
          />
          <Typography variant="helper" tone="muted">
            {S.link.unitHelper}
          </Typography>
        </div>
        <div className="space-y-2">
          <Label htmlFor="iex-notes">{S.link.notes}</Label>
          <Textarea id="iex-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
    </OperationDialog>
  )
}

/** Record the box going back to the customer (R13). */
export function ReturnExceptionDialog({ row, onClose }: DialogProps) {
  const send = useReturnInwardException()
  const [method, setMethod] = useState<ReturnMethod>("next_trip")
  const [challan, setChallan] = useState("")
  const [dispatchedAt, setDispatchedAt] = useState("")
  const [notes, setNotes] = useState("")
  const confirm = () =>
    send.mutate(
      {
        id: row.id,
        body: {
          method,
          challan_number: challan.trim(),
          dispatched_at: dispatchedAt || null,
          notes: notes.trim() || null,
        },
      },
      { onSuccess: onClose },
    )
  const R = S.returnDialog
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={R.title}
      description={R.description}
      isDirty={!!challan || !!notes || !!dispatchedAt}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={send.isPending}>
            {R.cancel}
          </Button>
          <Button onClick={confirm} disabled={!challan.trim() || send.isPending}>
            {R.confirm}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required>{R.method}</Label>
          <Select value={method} onValueChange={(v) => setMethod((v ?? "next_trip") as ReturnMethod)}>
            <SelectTrigger className="w-full">
              <SelectValue>{RETURN_METHOD_LABEL[method]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RETURN_METHOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label required htmlFor="iex-challan">{R.challan}</Label>
          <Input id="iex-challan" value={challan} onChange={(e) => setChallan(e.target.value)} placeholder={R.challanPlaceholder} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iex-dispatchedat">{R.dispatchedAt}</Label>
          <DatePicker id="iex-dispatchedat" value={dispatchedAt} onChange={setDispatchedAt} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="iex-notes-1">{R.notes}</Label>
          <Textarea id="iex-notes-1" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
    </OperationDialog>
  )
}
