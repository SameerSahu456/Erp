import { isValidElement, type ReactElement, type ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  /**
   * The clickable element that opens the dialog (uncontrolled use). Must be a
   * real interactive element — e.g. a `<Button>` — because base-ui's trigger
   * injects native button semantics and warns if handed a non-`<button>`.
   * Omit / pass `null` for controlled use, where `open` + `onOpenChange` drive
   * the dialog and no trigger is rendered.
   */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  // Render a trigger ONLY when handed a real element. base-ui's
  // `AlertDialogTrigger` acts as a native button (`nativeButton` defaults on),
  // so a non-element trigger (null / string / a hidden placeholder span) makes
  // it warn "expected a native <button>". Controlled callers pass no trigger
  // and open the dialog via `open` / `onOpenChange` instead. When an element
  // IS given, base-ui clones it to inject trigger props (`type`, `onClick`,
  // `aria-*`) — pass it straight through so `cloneElement` decorates it cleanly
  // (wrapping in a Fragment would misroute those props onto `React.Fragment`).
  const triggerElement: ReactElement | undefined = isValidElement(trigger)
    ? trigger
    : undefined

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {triggerElement && (
        <AlertDialogTrigger render={triggerElement}>{null}</AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialog }
