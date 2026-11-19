/**
 * The lot's rollup as a row of KPI stat cards — one big coloured number per
 * state, the same cards the WMS dashboards use.
 *
 * The list page splits these counts into table columns; on the detail
 * page they read best as headline numbers. The three the operator asks about —
 * Completed, Outstanding, Withdrawn — always show; Reassigned earns a card only
 * when a line has actually been handed on; Total closes the row so the numbers
 * are read against the whole lot.
 */
import { CheckCircle2, Clock, Layers, Undo2, UserCog } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatsRow } from '@/components/common/display/StatsRow'
import type { DataCardProps } from '@/components/common/display/DataCard'

import type { WorkAssignmentProgress } from '../../api/work-assignments'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentProgressStatsProps {
  progress: WorkAssignmentProgress | null | undefined
}

export function WorkAssignmentProgressStats({ progress }: WorkAssignmentProgressStatsProps) {
  if (!progress || progress.total === 0) {
    return (
      <Typography variant="body" tone="muted">
        {S.progressCard.empty}
      </Typography>
    )
  }

  const p = progress
  const stats: DataCardProps[] = [
    { label: S.states.completed, value: p.completed, icon: CheckCircle2, accent: 'success' },
    { label: S.states.outstanding, value: p.outstanding, icon: Clock, accent: 'warning' },
    { label: S.states.withdrawn, value: p.withdrawn, icon: Undo2, accent: 'danger' },
  ]
  // Only when a line was actually reassigned — otherwise the row stays the four
  // the operator asked for and never shows a permanent "0 Reassigned".
  if (p.reassigned > 0)
    stats.push({ label: S.states.reassigned, value: p.reassigned, icon: UserCog, accent: 'info' })
  stats.push({ label: S.columns.total, value: p.total, icon: Layers, accent: 'primary' })

  return <StatsRow stats={stats} />
}
