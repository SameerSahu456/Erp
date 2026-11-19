import { useState } from 'react'

/**
 * Guards a completion form's close (Cancel / × / overlay / Esc) against losing
 * entered data. Route every close attempt through `requestClose`: when the form
 * is `dirty` it opens a confirm instead of closing; a clean form closes at once.
 *
 *   const guard = useDiscardGuard(dirty, onClose)
 *   <OperationDialog onOpenChange={(o) => { if (!o) guard.requestClose() }} … />
 *   <Button onClick={guard.requestClose}>Cancel</Button>
 *   <UnsavedChangesDialog open={guard.confirmOpen} onOpenChange={guard.setConfirmOpen}
 *     onConfirm={guard.confirmDiscard} … />
 */
export function useDiscardGuard(dirty: boolean, close: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const requestClose = () => {
    if (dirty) setConfirmOpen(true)
    else close()
  }
  const confirmDiscard = () => {
    setConfirmOpen(false)
    close()
  }

  return { requestClose, confirmOpen, setConfirmOpen, confirmDiscard }
}
