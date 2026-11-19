import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'

/** Handed to a render-prop footer so a Cancel button can route through the
 *  unsaved-changes guard (same path as Esc / backdrop / the close button). */
export interface OperationDialogFooterApi {
  /** Close the dialog — prompts "Discard changes?" first when `isDirty`. */
  requestClose: () => void
}

export interface OperationDialogProps {
  /** Controlled open state. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sticky header title — always visible. */
  title: ReactNode
  /** Optional muted line under the title (also sticky). */
  description?: ReactNode
  /** Optional extra sticky-header content (meta rows, progress, etc.). */
  headerExtra?: ReactNode
  /**
   * Sticky footer actions — always visible. Usually the Cancel / submit buttons.
   * Pass a function to receive `{ requestClose }` so the Cancel button goes
   * through the unsaved-changes guard too (Esc / backdrop / close-button are
   * already guarded once `isDirty` is set).
   */
  footer?: ReactNode | ((api: OperationDialogFooterApi) => ReactNode)
  /** Scrollable body — the ONLY region that scrolls. */
  children: ReactNode
  /** Width override, e.g. "sm:max-w-xl". Defaults to sm:max-w-lg. */
  className?: string
  /** Extra classes for the scroll body (spacing, etc.). */
  bodyClassName?: string
  showCloseButton?: boolean
  /**
   * When true, any close attempt (Esc, backdrop, the close button, or the
   * footer's `requestClose`) first asks the user to discard unsaved changes.
   * Leave unset for dialogs with nothing to lose.
   */
  isDirty?: boolean
}

/**
 * The single sticky-shell modal used across the app (WMS operation forms,
 * procurement vendor/PO dialogs, …).
 *
 * Layout contract: `DialogContent` is a `flex flex-col` with a capped height
 * and `overflow-hidden` — the `overflow-hidden` is load-bearing. Without it,
 * `DialogContent`'s base `overflow-y-auto` survives the twMerge and the whole
 * popup scrolls, dragging the header and footer off-screen. With the container
 * unable to scroll, the header (`shrink-0`) and footer (`shrink-0`) stay put and
 * the body (`min-h-0 flex-1 overflow-y-auto`) is the sole scroller — so the
 * title and action buttons are always visible.
 *
 * `p-0` on the content lets the header / body / footer own their padding so
 * their borders run edge-to-edge; the footer's own `mx-0 mb-0` cancels the
 * default `DialogFooter` negative-margin bleed (which assumed a padded parent).
 *
 * Unsaved-changes guard: pass `isDirty` and a render-prop `footer` whose Cancel
 * calls `requestClose`. A dirty close then shows the same `UnsavedChangesDialog`
 * the page-level guard uses, so the behaviour matches everywhere.
 */
export function OperationDialog({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  footer,
  children,
  className,
  bodyClassName,
  showCloseButton = true,
  isDirty = false,
}: OperationDialogProps) {
  const [askDiscard, setAskDiscard] = useState(false)

  // Every close path funnels through here so the guard is applied once.
  const requestClose = () => {
    if (isDirty) {
      setAskDiscard(true)
      return
    }
    onOpenChange(false)
  }

  // The Dialog primitive fires this for Esc / backdrop / the close button.
  // Opening passes straight through; closing goes through the guard.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true)
      return
    }
    requestClose()
  }

  const renderedFooter = typeof footer === 'function' ? footer({ requestClose }) : footer

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          className={cn(
            'flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
            className,
          )}
        >
          <DialogHeader className="shrink-0 gap-2 border-b px-5 py-4 pr-12">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
            {headerExtra}
          </DialogHeader>

          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>
            {children}
          </div>

          {renderedFooter ? (
            // The action tray reads as its own register: a hairline top plus a
            // whisper of the Table-Zebra ground (DESIGN.md §5), so header / body
            // / footer are three clear bands without adding a heavier border.
            <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/30 px-5 py-3">
              {renderedFooter}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={askDiscard}
        onOpenChange={setAskDiscard}
        onConfirm={() => {
          setAskDiscard(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
