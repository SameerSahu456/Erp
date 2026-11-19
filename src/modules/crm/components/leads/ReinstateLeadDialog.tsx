import { RotateCcw } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"

import { LEADS_STRINGS as S } from "./leads.strings"

interface ReinstateLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  note: string
  onNoteChange: (value: string) => void
  onConfirm: () => void
}

// Reinstate — only for Rejected leads, manager roles only.
export function ReinstateLeadDialog({
  open,
  onOpenChange,
  leadName,
  note,
  onNoteChange,
  onConfirm,
}: ReinstateLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8" />}>
        <RotateCcw className="size-3.5" data-icon="inline-start" />
        {S.reinstate.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{S.reinstate.title}</DialogTitle>
          <DialogDescription>
            {S.reinstate.bodyBefore}{leadName}{S.reinstate.bodyAfter}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reinstate-note">{S.reinstate.noteLabel}</Label>
          <Textarea
            id="reinstate-note"
            placeholder={S.reinstate.notePlaceholder}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {S.reinstate.cancel}
          </Button>
          <Button onClick={onConfirm}>
            {S.reinstate.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
