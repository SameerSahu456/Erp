import { useState } from 'react'
import { AlertTriangle, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LOST_REASONS = [
  'Price too high',
  'Went with competitor',
  'Budget constraints',
  'No response / Ghosted',
  'Requirements changed',
  'Timeline mismatch',
  'Product not a fit',
  'Internal decision',
  'Other',
] as const

interface LostReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  entityType: 'lead' | 'deal'
  onConfirm: (reason: string, notes: string) => void
}

export function LostReasonDialog({
  open,
  onOpenChange,
  entityName,
  entityType,
  onConfirm,
}: LostReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  function handleConfirm() {
    onConfirm(reason, notes.trim())
    setReason('')
    setNotes('')
  }

  function handleCancel() {
    onOpenChange(false)
    setReason('')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) { setReason(''); setNotes('') }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <DialogTitle className="text-lg">Mark as Closed Lost</DialogTitle>
          <DialogDescription>
            Why is <span className="font-medium text-foreground">"{entityName}"</span> being marked as lost?
            This helps track win/loss patterns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Lost Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={4}>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Any additional context about why this ${entityType} was lost...`}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason}
          >
            <ThumbsDown className="size-3.5" data-icon="inline-start" />
            Mark as Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
