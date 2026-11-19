import { useState } from 'react'
import { AlertTriangle, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
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
import { FieldError } from '@/components/common/forms/FieldError'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useFormErrors } from '@/hooks/use-form-errors'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'

import { useLostImpact } from '../../hooks/shared/useLostImpact'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'
import { LostImpactNotice } from './LostImpactNotice'

// Fold the optional free-text notes into the single `closed_lost_reason`
// column the backend stores. Mirrors the rejection-reason convention used in
// useLeadDetail (`${reason} — ${notes}`).
export function composeLostReason(reason: string, notes: string): string {
  const trimmed = notes.trim()
  return trimmed ? `${reason} — ${trimmed}` : reason
}

export const LOST_REASONS = [
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

// Inverse of `composeLostReason` — split a stored `closed_lost_reason` back
// into the structured { reason, notes } the form's dropdown + notes fields
// edit. A value whose reason isn't one of the known `LOST_REASONS` (legacy
// free text) is surfaced under "Other" with the full text kept as the note so
// nothing is lost on edit.
export function decomposeLostReason(value: string | null | undefined): {
  reason: string
  notes: string
} {
  if (!value) return { reason: '', notes: '' }
  const sep = value.indexOf(' — ')
  const head = sep === -1 ? value : value.slice(0, sep)
  const tail = sep === -1 ? '' : value.slice(sep + 3)
  if ((LOST_REASONS as readonly string[]).includes(head)) {
    return { reason: head, notes: tail }
  }
  return { reason: 'Other', notes: value }
}

interface LostReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  entityType: 'lead' | 'deal'
  // When given, the dialog previews the SOs / demo requests the cascade will
  // cancel and refuses to confirm while a dispatched order blocks it.
  entityId?: string | null
  onConfirm: (reason: string, notes: string) => void
}

export function LostReasonDialog({
  open,
  onOpenChange,
  entityName,
  entityType,
  entityId,
  onConfirm,
}: LostReasonDialogProps) {
  const impactQuery = useLostImpact(entityType, entityId, open)
  const isBlocked = (impactQuery.data?.blocking_sales_orders?.length ?? 0) > 0
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const { errors, setError, clearError, clearAll } = useFormErrors()

  const isDirty = open && (reason !== '' || notes !== '')
  const guard = useUnsavedChangesGuard({ isDirty })

  function discardAndClose() {
    setReason('')
    setNotes('')
    clearAll()
    onOpenChange(false)
  }

  function handleConfirm() {
    if (!reason) {
      setError('reason', CRM_SHARED_STRINGS.lostReasonDialog.reasonRequired)
      toast.error(CRM_SHARED_STRINGS.lostReasonDialog.fixHighlighted)
      return
    }
    clearAll()
    onConfirm(reason, notes.trim())
    setReason('')
    setNotes('')
  }

  function handleCancel() {
    guard.attempt(discardAndClose)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          guard.attempt(discardAndClose)
          return
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <DialogTitle className="text-lg">
            {CRM_SHARED_STRINGS.lostReasonDialog.title}
          </DialogTitle>
          <DialogDescription>
            {CRM_SHARED_STRINGS.lostReasonDialog.descriptionBefore}
            <span className="font-medium text-foreground">"{entityName}"</span>
            {CRM_SHARED_STRINGS.lostReasonDialog.descriptionAfter}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {entityId ? (
            <LostImpactNotice impact={impactQuery.data} isLoading={impactQuery.isLoading} />
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {CRM_SHARED_STRINGS.lostReasonDialog.reasonLabel}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(v) => {
                setReason(v ?? '')
                clearError('reason')
              }}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(errors.reason)}
              >
                <SelectValue placeholder={CRM_SHARED_STRINGS.lostReasonDialog.reasonPlaceholder} />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={4}>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.reason} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {CRM_SHARED_STRINGS.lostReasonDialog.notesLabel}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={CRM_SHARED_STRINGS.lostReasonDialog.notesPlaceholder(entityType)}
              rows={3}
              className="max-h-40 resize-none overflow-y-auto"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {CRM_SHARED_STRINGS.lostReasonDialog.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isBlocked}
          >
            <ThumbsDown className="size-3.5" data-icon="inline-start" />
            {CRM_SHARED_STRINGS.lostReasonDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </Dialog>
  )
}
