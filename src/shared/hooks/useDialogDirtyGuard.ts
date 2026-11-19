import { useCallback, useState } from "react";

// Intercept Dialog close attempts (X / Esc / outside click / explicit
// Cancel button) while a form inside is dirty. Pair with
// <DiscardChangesAlertDialog>:
//
//   const { guardedOnOpenChange, confirmOpen, confirmDiscard, cancelDiscard } =
//     useDialogDirtyGuard(form.formState.isDirty, onOpenChange);
//
//   <Dialog open={open} onOpenChange={guardedOnOpenChange}>...</Dialog>
//   <DiscardChangesAlertDialog
//     open={confirmOpen}
//     onConfirm={confirmDiscard}
//     onCancel={cancelDiscard}
//   />
//
// For an in-form Cancel button, swap `onClick={() => onOpenChange(false)}`
// for `onClick={() => guardedOnOpenChange(false)}` so the same prompt
// fires.
export function useDialogDirtyGuard(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const guardedOnOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isDirty) {
        setConfirmOpen(true);
        return;
      }
      onOpenChange(open);
    },
    [isDirty, onOpenChange],
  );

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const cancelDiscard = useCallback(() => setConfirmOpen(false), []);

  return { guardedOnOpenChange, confirmOpen, confirmDiscard, cancelDiscard };
}
