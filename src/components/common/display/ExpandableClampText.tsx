import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'

// Static classes so Tailwind's JIT keeps them (a dynamic `line-clamp-${n}`
// would be purged). Extend the map if a call site needs a different clamp.
const LINE_CLAMP: Record<number, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

type TypographyVariant = ComponentProps<typeof Typography>['variant']
type TypographyTone = ComponentProps<typeof Typography>['tone']

export interface ExpandableClampTextProps {
  /** The full text to render. Newlines are preserved. */
  text: string
  /** Lines shown before clamping. Default 3. */
  lines?: 2 | 3 | 4
  /** Typography variant/tone for the text. */
  variant?: TypographyVariant
  tone?: TypographyTone
  className?: string
  showMoreLabel?: string
  showLessLabel?: string
}

/**
 * Long text clamped to `lines` lines with a "Show more" / "Show less" toggle.
 * The toggle appears ONLY when the text actually overflows the clamp (measured
 * against the clamped element), so short notes render plainly with no toggle.
 * Preserves the newlines the user typed and breaks long unbroken strings so the
 * clamp engages instead of blowing the container wide.
 */
export function ExpandableClampText({
  text,
  lines = 3,
  variant = 'body',
  tone,
  className,
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
}: ExpandableClampTextProps) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Re-clamp when the text changes (e.g. an inline edit) so the toggle
  // re-measures against the fresh content — render-phase reset, not an effect.
  const [prevText, setPrevText] = useState(text)
  if (prevText !== text) {
    setPrevText(text)
    setExpanded(false)
  }

  // Measure whether the clamped paragraph is truncated (content taller than the
  // clamped box). Runs while collapsed (expanded resets to false on text change),
  // so the measurement always reflects the clamped state.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [text, lines])

  return (
    <div className={className}>
      <Typography variant={variant} tone={tone} asChild>
        <p
          ref={ref}
          className={cn(
            'whitespace-pre-wrap [overflow-wrap:anywhere]',
            !expanded && LINE_CLAMP[lines],
          )}
        >
          {text}
        </p>
      </Typography>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex text-primary transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
        >
          <Typography variant="caption" tone="inherit">
            {expanded ? showLessLabel : showMoreLabel}
          </Typography>
        </button>
      )}
    </div>
  )
}
