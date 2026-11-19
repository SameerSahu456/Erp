import { ClipboardCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import type { ChecklistRunView } from '../../../api'
import { CHECKLIST_RUNS_CARD_STRINGS as S } from './checklist-runs-card.strings'
import { CHECKLIST_RUNS_SCROLL_AFTER, numberRuns } from './checklist-run-helpers'
import { ChecklistRunBlock } from './ChecklistRunBlock'

interface ChecklistRunsCardProps {
  runs: ChecklistRunView[]
  /** Render the run blocks WITHOUT the outer Card chrome — for embedding inside
   *  an already-bordered container (e.g. a Material Issue unit row). */
  flat?: boolean
}

/** Finished checklist runs, oldest first and numbered per stage; anchored by
 *  `operation_id` so the Workflow History can link to them. */
export function ChecklistRunsCard({ runs, flat = false }: ChecklistRunsCardProps) {
  const items = numberRuns(runs)
  if (items.length === 0) return null

  const blocks = (
    // Inner-scroll past a handful of runs so a long history doesn't grow the page (§7.7).
    <div
      className={cn(
        'space-y-3',
        items.length > CHECKLIST_RUNS_SCROLL_AFTER && 'max-h-[32rem] overflow-y-auto',
      )}
    >
      {items.map(({ run, stage, cycle }) => (
        <ChecklistRunBlock key={run.run_id} run={run} stage={stage} cycle={cycle} />
      ))}
    </div>
  )

  if (flat) return blocks

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <ClipboardCheck className="size-4" />
          {S.card.title}
        </CardTitle>
      </CardHeader>
      <CardContent>{blocks}</CardContent>
    </Card>
  )
}
