import { useLayoutEffect, useRef } from 'react'
import { Clock, TriangleAlert } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { formatIST } from '@shared/lib/date'
import { cn } from '@/lib/utils'

import { useDeviceTimeLog } from '../../../hooks/devices/useDevices'
import {
  ACTIVITY_TIME_LOG_STRINGS,
  ACTIVITY_TIME_LOG_STAGE_LABELS as STAGE_LABEL,
} from './activity-time-log.strings'
import { formatDuration, humanize } from './helpers'

// Vendor-service rows carry a section name; every section shares
// operation_type='vendor_service', so without it a unit that went to Display
// Repair AND Battery Boost shows two identical rows.
const stageLabel = (op: string, sectionName?: string | null) =>
  sectionName || STAGE_LABEL[op] || humanize(op)

/** seconds → "1d 21h 30m" via the shared duration formatter (which takes ms). */
const dur = (secs: number | null | undefined) => (secs == null ? '—' : formatDuration(secs * 1000))

/** One summary stat: quiet label over a precise value. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <Typography variant="caption" tone="muted" asChild>
        <span className="block uppercase tracking-wide">{label}</span>
      </Typography>
      <Typography variant="body-strong" numeric asChild>
        <span className="mt-0.5 block">{value}</span>
      </Typography>
    </div>
  )
}

/** The table shows this many rows, then scrolls the rest internally (§9). */
const VISIBLE_ROWS = 5

type TimeLog = NonNullable<ReturnType<typeof useDeviceTimeLog>['data']>
type TimeLogRow = TimeLog['rows'][number]

/**
 * Activity / Time Log — how long the device spent in each stage, benchmarked
 * against the fleet-average time-in-stage (GET /wms/devices/{id}/time-log).
 * Summary strip on top; a dense table below. Colour is budgeted to the "vs avg"
 * signal and the in-progress row.
 */
export function ActivityTimeLog({ deviceId }: { deviceId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          {ACTIVITY_TIME_LOG_STRINGS.card.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivityTimeLogContent deviceId={deviceId} />
      </CardContent>
    </Card>
  )
}

function ActivityTimeLogContent({ deviceId }: { deviceId: string }) {
  const { data, isLoading, isError, refetch } = useDeviceTimeLog(deviceId)
  if (isLoading) return <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
  if (isError || !data) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title={ACTIVITY_TIME_LOG_STRINGS.error}
        action={{ label: ACTIVITY_TIME_LOG_STRINGS.retryLabel, onClick: () => void refetch() }}
      />
    )
  }
  return (
    <>
      {/* Summary strip — three stats split by hairlines, not stat cards. */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/30">
        <Stat
          label={ACTIVITY_TIME_LOG_STRINGS.summary.totalHandling}
          value={dur(data.summary.total_handling_seconds)}
        />
        <Stat
          label={ACTIVITY_TIME_LOG_STRINGS.summary.fleetAvgDevice}
          value={dur(data.summary.fleet_avg_device_seconds)}
        />
        <Stat
          label={ACTIVITY_TIME_LOG_STRINGS.summary.stagesCompleted}
          value={String(data.summary.stages_completed)}
        />
      </div>

      {data.rows.length === 0 ? (
        <Typography variant="body" tone="muted" asChild>
          <p className="py-4 text-center">{ACTIVITY_TIME_LOG_STRINGS.empty}</p>
        </Typography>
      ) : (
        <TimeLogTable rows={data.rows} />
      )}

      <Typography variant="caption" tone="muted" asChild>
        <p className="leading-relaxed">{ACTIVITY_TIME_LOG_STRINGS.footnote}</p>
      </Typography>
    </>
  )
}

/** Descending by completion time — most recently completed stage first. Active
 *  stages (no completed_at) are the newest activity, so they pin to the top. */
function newestFirst(rows: TimeLogRow[]): TimeLogRow[] {
  const at = (r: TimeLogRow) => (r.completed_at ? new Date(r.completed_at).getTime() : Infinity)
  return [...rows].sort((a, b) => at(b) - at(a))
}

function TimeLogTable({ rows }: { rows: TimeLogRow[] }) {
  // Cap to VISIBLE_ROWS by measuring real rows (holds under zoom / wrapping); direct DOM write, no re-render.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const trs = el.querySelectorAll<HTMLTableRowElement>('tbody tr')
    if (trs.length <= VISIBLE_ROWS) {
      el.style.maxHeight = ''
      return
    }
    let height = el.querySelector('thead')?.getBoundingClientRect().height ?? 0
    for (let i = 0; i < VISIBLE_ROWS; i++) height += trs[i].getBoundingClientRect().height
    el.style.maxHeight = `${Math.ceil(height)}px`
  }, [rows])

  return (
    // The header stays pinned while the body scrolls.
    <div ref={scrollRef} className="overflow-auto">
      <Typography variant="body" asChild>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {ACTIVITY_TIME_LOG_STRINGS.table.columns.map((h, i) => (
                <Typography key={h} variant="caption" asChild>
                  <th
                    className={cn(
                      'bg-card py-2 pr-3 font-semibold uppercase tracking-wide',
                      // Completed (date, col 2) + duration right-align (§9);
                      // stage + operator stay left.
                      i >= 2 ? 'text-right' : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                </Typography>
              ))}
            </tr>
          </thead>
          <tbody>
            {newestFirst(rows).map((r, idx) => (
              <tr key={idx} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                <td className="py-2.5 pr-3 font-medium text-foreground">
                  {stageLabel(r.operation_type, r.section_name)}
                  {r.status === 'cancelled' && (
                    <Typography variant="caption" className="ml-1.5">
                      {ACTIVITY_TIME_LOG_STRINGS.status.cancelled}
                    </Typography>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{r.operator_name ?? '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                  <CompletedCell row={r} />
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-foreground">
                  {dur(r.time_taken_seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Typography>
    </div>
  )
}

/** "In progress" for an active stage, else its completion time (or a dash). */
function CompletedCell({ row }: { row: TimeLogRow }) {
  if (row.status === 'in_progress' || row.status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-warning">
        <Clock className="size-3.5" aria-hidden />
        {ACTIVITY_TIME_LOG_STRINGS.status.inProgress}
      </span>
    )
  }
  return <>{row.completed_at ? formatIST(row.completed_at) : '—'}</>
}
