import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  discardLabel?: string
  stayLabel?: string
}

/**
 * Confirmation shown when the user tries to leave a form with unsaved edits.
 * Pair with `useUnsavedChangesGuard` — its return values plug in 1:1.
 */
function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Discard unsaved changes?',
  description = 'You have unsaved changes on this page. Leaving will discard them.',
  discardLabel = 'Discard changes',
  stayLabel = 'Stay on page',
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{stayLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {discardLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { UnsavedChangesDialog, type UnsavedChangesDialogProps }
