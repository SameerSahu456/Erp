import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

// Static classes so Tailwind's JIT keeps them (a dynamic `line-clamp-${n}`
// would be purged).
const LINE_CLAMP: Record<number, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

type TypographyVariant = ComponentProps<typeof Typography>['variant']
type TypographyTone = ComponentProps<typeof Typography>['tone']

export interface PopupClampTextProps {
  /** The text shown on the card (clamped). */
  text: string
  /** Heading of the modal that "Show more" opens. */
  title: string
  /** Full text for the modal when it differs from `text` (e.g. `text` carries a
   *  "Reason: " prefix the modal heading already says). Defaults to `text`. */
  dialogText?: string
  /** Lines shown before clamping. Default 3. */
  lines?: 2 | 3 | 4
  variant?: TypographyVariant
  tone?: TypographyTone
  className?: string
  showMoreLabel?: string
}

/**
 * Long free text, kept to `lines` lines on the card with a "Show more" control
 * that opens the WHOLE text in a centred modal — instead of stretching the card
 * or expanding in place. Same destination as the line descriptions in the Quote
 * approval panel, so long text behaves one way across the app.
 *
 * The control appears only when the text really is cut off (measured against
 * the clamped element), so short text renders plainly. Long unbroken strings
 * (a pasted URL) wrap anywhere so the clamp engages and the card never scrolls
 * sideways (§8.7). Newlines are preserved.
 */
export function PopupClampText({
  text,
  title,
  dialogText,
  lines = 3,
  variant = 'body',
  tone,
  className,
  showMoreLabel = 'Show more',
}: PopupClampTextProps) {
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Re-measure when the text or clamp changes. The paragraph is always clamped
  // (it never expands in place), so the measurement is always of the clamped box.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [text, lines])

  return (
    <div className="min-w-0">
      <Typography variant={variant} tone={tone} asChild>
        <p
          ref={ref}
          className={cn('whitespace-pre-wrap [overflow-wrap:anywhere]', LINE_CLAMP[lines], className)}
        >
          {text}
        </p>
      </Typography>
      {overflowing && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-0.5 h-auto p-0 text-xs"
          onClick={() => setOpen(true)}
        >
          {showMoreLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Typography
            variant="body"
            className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]"
            asChild
          >
            <p>{dialogText ?? text}</p>
          </Typography>
        </DialogContent>
      </Dialog>
    </div>
  )
}
