import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import type { ServiceSection, VendorJobSummary } from '../../api/service-jobs'
import { VendorJobRow } from './VendorJobRow'

// Past this many requests the card scrolls internally instead of growing the
// page (mirrors the Spares card).
const MAX_UNSCROLLED_JOBS = 5

type JobHandler = (job: VendorJobSummary) => void

interface VendorJobGroupsProps {
  groups: { section: ServiceSection; rows: VendorJobSummary[] }[]
  gates: { readOnly: boolean; canManage: boolean; canWithdraw: boolean }
  handlers: { onSend: JobHandler; onReceive: JobHandler; onResend: JobHandler; onCancel: JobHandler }
}

/** Jobs grouped under a per-type sub-heading (label + count). */
export function VendorJobGroups({ groups, gates, handlers }: VendorJobGroupsProps) {
  const totalJobs = groups.reduce((n, g) => n + g.rows.length, 0)
  return (
    <div className={cn('space-y-5', totalJobs > MAX_UNSCROLLED_JOBS && 'max-h-[26rem] overflow-y-auto pr-1')}>
      {groups.map(({ section, rows }) => (
        <div
          key={section.id}
          className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0"
        >
          <div className="mb-2 flex items-center gap-2">
            <Typography variant="badge" className="uppercase tracking-wide">
              {section.name}
            </Typography>
            <Typography variant="helper" tone="muted" asChild>
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-px font-medium tabular-nums">
                {rows.length}
              </span>
            </Typography>
          </div>
          <ul className="min-w-0 divide-y divide-border">
            {rows.map((job) => (
              <VendorJobRow key={job.id} job={job} {...gates} {...handlers} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
