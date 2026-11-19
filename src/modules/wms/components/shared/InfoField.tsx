import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { Typography } from '@/components/ui/typography'

/** One labelled fact in a detail-page summary grid (Device Information,
 *  checklist Template Details): leading icon, caption, value. `mono` renders
 *  serials/barcodes in the monospace ramp. */
export function InfoField({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <Typography variant="caption" tone="muted">
          {label}
        </Typography>
        {/* Wrap rather than clip so a long value is never silently lost with no
            reveal (§7.5). */}
        <Typography
          variant={mono ? 'mono' : 'body-strong'}
          className="min-w-0 break-words"
        >
          {value || '—'}
        </Typography>
      </div>
    </div>
  )
}
