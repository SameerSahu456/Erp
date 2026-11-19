import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Confirm-discard prompt rendered when the user tries to close a form
// (Cancel button, Dialog close) while it's dirty. Paired with
// `useDialogDirtyGuard` for dialogs and with the form-level Cancel
// handler on page-level forms.
//
// "Discard" is the destructive primary action — styled as
// `destructive`-flavoured so the operator sees the cost before they
// click.
export function DiscardChangesAlertDialog({
  open,
  onConfirm,
  onCancel,
  title = "Discard unsaved changes?",
  description = "Your edits will be lost if you leave without saving.",
  discardLabel = "Discard changes",
  keepLabel = "Keep editing",
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  discardLabel?: string;
  keepLabel?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{keepLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
          >
            {discardLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
