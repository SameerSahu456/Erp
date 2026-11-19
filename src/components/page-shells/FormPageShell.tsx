import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import {
  useUnsavedChangesGuard,
  type UnsavedChangesGuard,
} from '@/hooks/use-unsaved-changes-guard'
import { PageHeader, type PageHeaderProps } from './PageHeader'
import { PAGE_SHELLS_STRINGS } from './page-shells.strings'

type PageHeaderInherited = Omit<PageHeaderProps, 'compact'>

interface FormPageShellProps extends PageHeaderInherited {
  children: ReactNode
  /** Shown in the sticky save-bar. Defaults to "Save". */
  saveLabel?: string
  /** Called when the primary save button is clicked. */
  onSave?: () => void
  /** Called when the secondary cancel button is clicked. */
  onCancel?: () => void
  /** When true, the save button shows a spinner and is disabled. */
  saving?: boolean
  /** Disables save without showing a spinner (e.g. invalid form). */
  canSave?: boolean
  /** Extra content rendered in the save bar, left of the buttons. */
  footerLeft?: ReactNode
  /** Render custom footer actions instead of the default Cancel/Save pair. */
  footerActions?: ReactNode
  /** Hide the sticky save bar entirely. */
  hideFooter?: boolean
  /**
   * When true, leaving the page (Cancel, browser back, refresh, close) prompts
   * the user to confirm discarding unsaved edits. Compute this in the form
   * (`!isEqual(currentValues, initialValues)`) and pass it down. Ignored when
   * `guard` is provided.
   */
  isDirty?: boolean
  /**
   * Optional externally-owned guard. Use this when the page renders custom
   * footer actions and needs to wrap its own Cancel button through the same
   * guard the shell uses for the back-arrow. The caller is responsible for
   * computing `isDirty` and creating the guard via `useUnsavedChangesGuard`.
   * When omitted, the shell creates its own guard from `isDirty`.
   */
  guard?: UnsavedChangesGuard
  className?: string
}

function FormPageShell({
  children,
  saveLabel = 'Save',
  onSave,
  onCancel,
  saving = false,
  canSave = true,
  footerLeft,
  footerActions,
  hideFooter = false,
  isDirty = false,
  guard: externalGuard,
  className,
  ...headerProps
}: FormPageShellProps) {
  // Pages with custom footer actions can pre-construct the guard and pass it
  // in, so their custom Cancel button shares the same dialog state. When no
  // external guard is given, the shell owns one driven by `isDirty`.
  //
  // The internal guard hook must still run unconditionally (hooks rule), but
  // when the page supplies its own guard we feed the internal one
  // `isDirty: false` so it stays INERT — otherwise two guards both push
  // history sentinels and fight each other's popstate handlers, which leaves
  // Cancel/back unable to actually leave the form.
  const internalGuard = useUnsavedChangesGuard({
    isDirty: externalGuard ? false : isDirty,
  })
  const guard = externalGuard ?? internalGuard
  const navigateBack = useNavigateBack(headerProps.backHref ?? '/')

  const handleCancel = () => {
    if (!onCancel) return
    guard.attempt(onCancel)
  }

  // Route the back-arrow through the same guard so it can't bypass the prompt.
  // If the consumer passes its own onBack, run it through the guard too.
  const consumerOnBack = headerProps.onBack
  const guardedBack = () => {
    guard.attempt(consumerOnBack ?? navigateBack)
  }

  return (
    <div
      className={cn(
        // Fill the viewport minus the sticky header (h-14 = 3.5rem) and the
        // shared main padding (p-5 = 2.5rem combined; lg:p-7 = 3.5rem). This
        // lets the sticky footer below pin to the bottom even when the form is
        // shorter than the viewport — otherwise the footer drops into normal
        // flow and leaves empty space underneath.
        'flex min-h-[calc(100dvh-6rem)] flex-col gap-6 lg:min-h-[calc(100dvh-7rem)]',
        className,
      )}
    >
      <PageHeader {...headerProps} onBack={guardedBack} />
      <div className="flex flex-1 flex-col gap-6">{children}</div>

      {!hideFooter && (
        <div
          className="sticky bottom-0 left-0 right-0 z-30 -mx-5 -mb-5 mt-2 border-t border-border bg-card/95 px-5 py-3 shadow-[0_-4px_16px_-6px_rgb(var(--shadow-rgb)/0.06),0_-1px_0_rgb(var(--shadow-rgb)/0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:-mx-7 lg:-mb-7 lg:px-7"
          role="toolbar"
          aria-label={PAGE_SHELLS_STRINGS.formPageShell.formActionsAriaLabel}
        >
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="text-[12.5px] text-muted-foreground">{footerLeft}</div>
            <div className="ml-auto flex items-center gap-2">
              {footerActions ?? (
                <>
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                      className="h-9"
                    >
                      {PAGE_SHELLS_STRINGS.formPageShell.cancel}
                    </Button>
                  )}
                  {onSave && (
                    <Button
                      type="button"
                      onClick={onSave}
                      disabled={saving || !canSave}
                      className="h-9 min-w-[120px]"
                    >
                      {saving && (
                        <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                      )}
                      {saveLabel}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </div>
  )
}

export { FormPageShell, type FormPageShellProps }
