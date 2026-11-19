import type { Dispatch, SetStateAction } from "react"
import { AlertTriangle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { LEADS_STRINGS as S } from "./leads.strings"

const REJECTION_REASONS = S.reject.reasons

interface RejectLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  fields: {
    reason: string
    setReason: Dispatch<SetStateAction<string>>
    notes: string
    setNotes: Dispatch<SetStateAction<string>>
  }
  onReject: () => void
  isPending: boolean
}

// Reject — only for New/Contacted leads. Gated by lead_write because the
// backend treats reject as a state transition under the same write code per
// spec §"Permission catalog additions".
export function RejectLeadDialog({
  open,
  onOpenChange,
  leadName,
  fields,
  onReject,
  isPending,
}: RejectLeadDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          fields.setReason("")
          fields.setNotes("")
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/50 hover:bg-destructive/10" />}>
        <XCircle className="size-3.5" data-icon="inline-start" />
        {S.reject.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <DialogTitle className="text-lg">{S.reject.title}</DialogTitle>
          <DialogDescription>
            {S.reject.bodyBefore}<span className="font-medium text-foreground">"{leadName}"</span>{S.reject.bodyAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {S.reject.reasonLabel} <span className="text-destructive">*</span>
            </Label>
            <Select value={fields.reason} onValueChange={(v) => fields.setReason(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={S.reject.reasonPlaceholder} />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={4}>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{S.reject.notesLabel}</Label>
            <Textarea
              value={fields.notes}
              onChange={(e) => fields.setNotes(e.target.value)}
              placeholder={S.reject.notesPlaceholder}
              rows={3}
              className="max-h-40 resize-none overflow-y-auto"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); fields.setReason(""); fields.setNotes("") }}>
            {S.reject.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!fields.reason || isPending}
          >
            <XCircle className="size-3.5" data-icon="inline-start" />
            {isPending ? S.reject.confirming : S.reject.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
