import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader, type PageHeaderProps } from './PageHeader'

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
  className,
  ...headerProps
}: FormPageShellProps) {
  return (
    <div className={cn('flex flex-col gap-5 pb-24', className)}>
      <PageHeader {...headerProps} />
      <div className="flex flex-col gap-5">{children}</div>

      {!hideFooter && (
        <div
          className="sticky bottom-0 left-0 right-0 z-30 -mx-5 mt-2 border-t border-border bg-card/95 px-5 py-3 shadow-[0_-4px_16px_-6px_rgba(16,24,40,0.06),0_-1px_0_rgba(16,24,40,0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:-mx-7 lg:px-7"
          role="toolbar"
          aria-label="Form actions"
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
                      onClick={onCancel}
                      disabled={saving}
                      className="h-9"
                    >
                      Cancel
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
    </div>
  )
}

export { FormPageShell, type FormPageShellProps }
