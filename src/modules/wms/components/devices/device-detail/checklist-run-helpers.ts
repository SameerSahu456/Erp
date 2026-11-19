import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'

import type { ChecklistRunAnswer, ChecklistRunView } from '../../../api'
import {
  CHECKLIST_RUNS_CARD_STRINGS as S,
  CHECKLIST_OUTCOME_LABELS as OUTCOME_LABEL,
  CHECKLIST_RESULT_LABELS as RESULT_LABEL,
} from './checklist-runs-card.strings'
import { formatDuration } from './helpers'

/** Past this many runs the card scrolls internally (§7.7). */
export const CHECKLIST_RUNS_SCROLL_AFTER = 5

// Badge uses the op OUTCOME, not run `result` (NEEDS_REWORK for evidence-only lists);
// falls back to `result` when there is no outcome yet.
const OUTCOME_VARIANT: Record<string, StatusBadgeVariant> = {
  pass: 'success',
  fail: 'error',
  na: 'neutral',
}

const RESULT_VARIANT: Record<string, StatusBadgeVariant> = {
  PASS: 'success',
  FAIL: 'error',
  NEEDS_REWORK: 'warning',
}

// QC pass-tier grade (A/B): A reads as the top tier (success), B a notch below
// (info). Any future tier falls back to neutral.
const GRADE_VARIANT: Record<string, StatusBadgeVariant> = {
  A: 'success',
  B: 'info',
}
export const gradeVariant = (grade: string): StatusBadgeVariant => GRADE_VARIANT[grade] ?? 'neutral'

const VERDICT_TOKENS = new Set(['pass', 'fail', 'na'])

/** Whether an answer is a pass/fail/na verdict item (drives the summary count). */
export function isVerdict(a: ChecklistRunAnswer): boolean {
  return typeof a.value === 'string' && VERDICT_TOKENS.has(a.value.toLowerCase())
}

/** A failed verdict answer. */
export const isFailAnswer = (a: ChecklistRunAnswer): boolean =>
  typeof a.value === 'string' && a.value.toLowerCase() === 'fail'

/** Render an answer value as readable text, by kind. */
export function formatAnswer(answer: ChecklistRunAnswer): string {
  const v = answer.value
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? S.answers.yes : S.answers.no
  if (Array.isArray(v)) {
    // photo answers carry attachment ids — those render as thumbnails, not text.
    return answer.kind === 'photo' ? '' : v.join(', ')
  }
  if (typeof v === 'string' && VERDICT_TOKENS.has(v.toLowerCase())) {
    if (v.toLowerCase() === 'na') return S.answers.notApplicable
    // Canonical pass/fail select tokens read nicer capitalised.
    return v[0].toUpperCase() + v.slice(1).toLowerCase()
  }
  return String(v)
}

/** Drop a trailing "None"/"null" a missing last name leaves on a joined name. */
export function cleanName(n: string | null | undefined): string {
  return (n ?? '').replace(/\s+(none|null|undefined)$/i, '').trim()
}

/** Short file-type label from the MIME type: "image/jpeg" → "JPEG". */
export function fileKind(contentType: string | null | undefined): string {
  const sub = (contentType ?? '').split('/')[1]
  return sub ? sub.split('+')[0].toUpperCase() : S.fallback.fileKind
}

/** Run duration, never to the second ("45s" collapses to "<1m"). */
export function runDuration(run: ChecklistRunView): string | null {
  if (!run.started_at || !run.finished_at) return null
  const raw = formatDuration(new Date(run.finished_at).getTime() - new Date(run.started_at).getTime())
  return raw.endsWith('s') ? S.subMinute : raw
}

/** The run's badge: the op outcome when set, else the run result, else none. */
export function runBadge(run: ChecklistRunView): { label: string; variant: StatusBadgeVariant } | null {
  const outcome = run.outcome?.toLowerCase()
  if (outcome && OUTCOME_LABEL[outcome]) {
    return { label: OUTCOME_LABEL[outcome], variant: OUTCOME_VARIANT[outcome] }
  }
  if (!run.result) return null
  return { label: RESULT_LABEL[run.result] ?? run.result, variant: RESULT_VARIANT[run.result] ?? 'neutral' }
}

/** CP-617: failed checks FIRST; the stable sort keeps every other answer in
 *  its original (template) order. */
export function failedFirst(answers: ChecklistRunAnswer[]): ChecklistRunAnswer[] {
  const rank = (x: ChecklistRunAnswer) => (isVerdict(x) && isFailAnswer(x) ? 0 : 1)
  return [...answers].sort((a, b) => rank(a) - rank(b))
}

/** FINISHED runs only (a merely-started stage has no answers to show), oldest
 *  → newest, numbered per stage (oldest attempt = 1). */
export function numberRuns(runs: ChecklistRunView[]) {
  const sorted = runs
    .filter((r) => !!r.finished_at)
    .sort((a, b) => ((a.started_at ?? '') < (b.started_at ?? '') ? -1 : 1))
  const seen: Record<string, number> = {}
  return sorted.map((run) => {
    const stage = run.operation_type ?? 'inspection'
    seen[stage] = (seen[stage] ?? 0) + 1
    return { run, stage, cycle: seen[stage] }
  })
}
