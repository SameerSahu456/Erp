import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'
import type { ComponentProps } from 'react'

// Static map so Tailwind's JIT sees the full class names (a dynamic
// `line-clamp-${n}` would be purged). Extend if a call site needs more lines.
const LINE_CLAMP_CLASS: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

type TypographyVariant = ComponentProps<typeof Typography>['variant']
type TypographyTone = ComponentProps<typeof Typography>['tone']

export interface ClampedTextProps {
  /** The text to render (clamped). */
  text: string
  /** Max lines before truncating with an ellipsis. Default 2. */
  lines?: 1 | 2 | 3 | 4
  /** Typography variant for the text. Default `helper` (small, muted). */
  variant?: TypographyVariant
  tone?: TypographyTone
  className?: string
}

/**
 * Text clamped to `lines` lines with a trailing ellipsis — for compact list
 * rows (tasks, material inquiries, etc.) where a long description must not push
 * the row taller. `[overflow-wrap:anywhere]` lets long unbroken strings wrap so
 * the clamp actually engages (CSS line-clamp needs the text to break first,
 * otherwise no ellipsis ever appears).
 *
 * The full, untruncated text is surfaced on hover via a native `title` tooltip
 * (the same pattern the truncating table columns use).
 */
export function ClampedText({
  text,
  lines = 2,
  variant = 'helper',
  tone,
  className,
}: ClampedTextProps) {
  return (
    <Typography
      variant={variant}
      tone={tone}
      className={cn(LINE_CLAMP_CLASS[lines], '[overflow-wrap:anywhere]', className)}
      asChild
    >
      <p title={text}>{text}</p>
    </Typography>
  )
}
