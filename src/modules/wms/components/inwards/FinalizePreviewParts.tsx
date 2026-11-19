import { AlertTriangle, Check, Loader2 } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'

import { SUMMARY_ROWS, type FinalizePreviewView } from './finalize-preview-helpers'
import { INWARDS_STRINGS } from './inwards.strings'

const S = INWARDS_STRINGS.finalizePreview

function ReadinessBadge({ blocked }: { blocked: boolean }) {
  if (blocked) {
    return (
      <StatusBadge variant="error">
        <AlertTriangle className="size-3.5" data-icon="inline-start" />
        {S.cannotFinalizeYet}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge variant="success">
      <Check className="size-3.5" data-icon="inline-start" />
      {S.readyToFinalize}
    </StatusBadge>
  )
}

/** Blocking issues — what the operator must fix first. */
function IssuesPanel({ issues }: { issues: string[] }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive-soft/40 p-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-2">
        <Typography variant="body-strong" tone="danger">
          {S.issuesToFix(issues.length)}
        </Typography>
        <ul className="space-y-1">
          {issues.map((msg, i) => (
            <li key={i}>
              <Typography variant="helper" tone="danger">
                {msg}
              </Typography>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** What finalize will do. */
function SummaryGrid({ summary }: { summary: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border bg-muted/20 p-3">
      {SUMMARY_ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-2">
          <Typography variant="helper" tone="muted">
            {row.label}
          </Typography>
          <Typography variant="body-strong" numeric>
            {summary[row.key] ?? 0}
          </Typography>
        </div>
      ))}
    </div>
  )
}

export function FinalizePreviewBody({ view }: { view: FinalizePreviewView }) {
  return (
    <div className="space-y-4">
      <div>
        <ReadinessBadge blocked={view.blocked} />
      </div>
      {view.issues.length > 0 && <IssuesPanel issues={view.issues} />}
      {view.summary && <SummaryGrid summary={view.summary} />}
      {view.discrepancyCount > 0 && (
        <Typography variant="helper" tone="muted">
          {S.discrepanciesHeld(view.discrepancyCount)}
        </Typography>
      )}
    </div>
  )
}

export function FinalizePreviewStatus({
  isPending,
  isError,
}: {
  isPending: boolean
  isError: boolean
}) {
  return (
    <>
      {isPending && (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <Typography variant="body" tone="muted">
            {S.loading}
          </Typography>
        </div>
      )}
      {isError && (
        <Typography variant="body" tone="danger" className="py-6">
          {S.error}
        </Typography>
      )}
    </>
  )
}

export function FinalizeConfirmLabel({
  confirming,
  stagedTotal,
}: {
  confirming: boolean
  stagedTotal: number
}) {
  if (confirming) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
        {INWARDS_STRINGS.batchDevices.receiving}
      </>
    )
  }
  return (
    <>
      <Check className="size-4" data-icon="inline-start" />
      {INWARDS_STRINGS.batchDevices.finalizeConfirmLabel(stagedTotal)}
    </>
  )
}
