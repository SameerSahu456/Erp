import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'

import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { CHECKLIST_RUNS_CARD_STRINGS as S } from './checklist-runs-card.strings'

interface ClampedNotesProps {
  text: string
  variant: ComponentProps<typeof Typography>['variant']
  tone?: ComponentProps<typeof Typography>['tone']
  className?: string
}

/** Notes clamped to a few lines; the Show more toggle appears only on real overflow. */
export function ClampedNotes({ text, variant, tone, className }: ClampedNotesProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflow, setOverflow] = useState(false)
  // A DOM measurement (not derivable during render). Re-measure only while
  // collapsed so "Show less" survives once expanded.
  useLayoutEffect(() => {
    if (expanded) return
    const el = ref.current
    if (!el) return
    setOverflow(el.scrollHeight > el.clientHeight + 1)
  }, [expanded, text])
  return (
    <>
      <Typography variant={variant} tone={tone} asChild>
        <p ref={ref} className={cn('whitespace-pre-wrap break-words', className, !expanded && 'line-clamp-3')}>
          {text}
        </p>
      </Typography>
      {(overflow || expanded) && (
        <Typography variant="helper" asChild>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-medium text-primary hover:underline"
          >
            {expanded ? S.sections.showLess : S.sections.showMore}
          </button>
        </Typography>
      )}
    </>
  )
}
