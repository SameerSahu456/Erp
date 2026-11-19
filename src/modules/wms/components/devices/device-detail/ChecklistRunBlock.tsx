import { useState } from 'react'
import { ChevronDown, ClipboardCheck, Microscope, ScanLine, Wrench } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { formatIST } from '@shared/lib/date'
import { cn } from '@/lib/utils'

import type { ChecklistRunAnswer, ChecklistRunView } from '../../../api'
import {
  CHECKLIST_RUNS_CARD_STRINGS as S,
  CHECKLIST_STAGE_LABELS as STAGE_LABEL,
} from './checklist-runs-card.strings'
import {
  cleanName,
  failedFirst,
  formatAnswer,
  gradeVariant,
  isFailAnswer,
  isVerdict,
  runBadge,
  runDuration,
} from './checklist-run-helpers'
import { ClampedNotes } from './ClampedNotes'
import { PhotoChips } from './PhotoChips'

const STAGE_ICON: Record<string, typeof ScanLine> = {
  inspection: ScanLine,
  qc: Microscope,
  outward_qc: Microscope,
  repair: Wrench,
}

interface ChecklistRunBlockProps {
  run: ChecklistRunView
  stage: string
  cycle: number
}

/** One answered checklist, titled by stage + attempt (e.g. Repair #2). Click to expand. */
export function ChecklistRunBlock({ run, stage, cycle }: ChecklistRunBlockProps) {
  const [open, setOpen] = useState(false)
  const Icon = STAGE_ICON[stage] ?? ClipboardCheck
  const title = STAGE_LABEL[stage] ?? run.template_name ?? S.fallback.runTitle
  const duration = runDuration(run)
  const failed = run.answers.filter((a) => isVerdict(a) && isFailAnswer(a))
  const badge = runBadge(run)
  // Prefer the ASSIGNED engineer over who completed the run — matches the
  // device list + assign dropdowns; falls back to the completer.
  const who = cleanName(run.assignee_name) || cleanName(run.inspector_name)

  return (
    <div
      id={run.operation_id ? `checklist-run-${run.operation_id}` : undefined}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 motion-reduce:transition-none"
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Typography variant="body-strong" asChild>
                <span className="block min-w-0 truncate">
                  {title}
                  {cycle > 1 && (
                    <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                      #{cycle}
                    </span>
                  )}
                </span>
              </Typography>
              <Typography variant="helper" tone="muted" asChild>
                <span className="block tabular-nums">
                  {who ? `${who} · ` : ''}
                  {formatIST(run.finished_at ?? run.started_at)}
                  {duration ? ` · ${duration}` : ''}
                </span>
              </Typography>
            </div>
            {badge && (
              <StatusBadge variant={badge.variant} className="mt-0.5 shrink-0">
                {badge.label}
              </StatusBadge>
            )}
          </div>
          {failed.length > 0 && (
            <Typography variant="helper" tone="danger" asChild>
              <span className="block min-w-0 break-words">{failed.map((a) => a.label).join(', ')}</span>
            </Typography>
          )}
        </div>
      </button>

      {open && <ChecklistRunDetail run={run} />}
    </div>
  )
}

/** The expanded run: grade, every answer (failed first), notes, stage photos. */
function ChecklistRunDetail({ run }: { run: ChecklistRunView }) {
  return (
    <div className="border-t border-border">
      {run.grade && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.grade}</span>
          </Typography>
          <StatusBadge variant={gradeVariant(run.grade)}>{run.grade}</StatusBadge>
        </div>
      )}
      <ul className="divide-y divide-border">
        {failedFirst(run.answers).map((a) => (
          <ChecklistAnswerRow key={a.key} answer={a} />
        ))}
      </ul>

      {run.notes?.trim() && (
        <div className="space-y-1.5 border-t border-border px-4 py-3">
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.sections.notes}</span>
          </Typography>
          <ClampedNotes text={run.notes} variant="body" />
        </div>
      )}

      {run.stage_photos && run.stage_photos.length > 0 && (
        <div className="space-y-1.5 border-t border-border px-4 py-3">
          <Typography variant="helper" tone="muted" asChild>
            <span>{S.sections.stagePhotos}</span>
          </Typography>
          <PhotoChips photos={run.stage_photos} />
        </div>
      )}
    </div>
  )
}

function ChecklistAnswerRow({ answer }: { answer: ChecklistRunAnswer }) {
  const text = formatAnswer(answer)
  return (
    <li className="space-y-1 px-4 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Typography variant="helper" tone="muted" asChild>
            <span className="break-words">{answer.label}</span>
          </Typography>
          {/* The item's authored instruction, as the inspector saw it. */}
          {answer.instruction && (
            <Typography variant="caption" tone="muted" asChild>
              <p className="break-words">{answer.instruction}</p>
            </Typography>
          )}
        </div>
        {text && (
          <Typography variant="helper" tone={isFailAnswer(answer) ? 'danger' : 'default'} asChild>
            {/* Cap + wrap so a long free-text answer wraps instead of blowing the
                row wide (§8.7). Short values stay compact + right-aligned. */}
            <span className="min-w-0 max-w-[60%] whitespace-pre-wrap break-words text-right font-semibold">
              {text}
            </span>
          </Typography>
        )}
      </div>
      {answer.notes && (
        <ClampedNotes text={answer.notes} variant="helper" tone="muted" />
      )}
      <PhotoChips photos={answer.photos} />
    </li>
  )
}
