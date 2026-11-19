import { PackageCheck, RefreshCw, Send, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/display/StatusBadge'

import type { VendorJobSummary } from '../../api/service-jobs'
import { VENDOR_JOB_STAGE_VARIANT } from './vendor-jobs-list.columns'
import { VENDOR_SERVICE_CARD_STRINGS as S } from './vendor-service-card.strings'

/** Disposition (if any) + outcome, or the stage while there's no outcome yet. */
export function VendorJobBadges({ job }: { job: VendorJobSummary }) {
  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-2">
      {job.return_disposition ? (
        <StatusBadge variant="neutral">{S.disposition[job.return_disposition]}</StatusBadge>
      ) : null}
      {job.outcome ? (
        <StatusBadge variant={job.outcome === 'fail' ? 'error' : 'success'}>
          {job.outcome === 'fail' ? S.outcome.fail : S.outcome.pass}
        </StatusBadge>
      ) : (
        <StatusBadge variant={VENDOR_JOB_STAGE_VARIANT[job.stage] ?? 'neutral'}>
          {S.stage[job.stage]}
        </StatusBadge>
      )}
    </div>
  )
}

interface ActionsProps {
  job: VendorJobSummary
  canManage: boolean
  onSend: (job: VendorJobSummary) => void
  onReceive: (job: VendorJobSummary) => void
  onResend: (job: VendorJobSummary) => void
  onCancel: (job: VendorJobSummary) => void
}

function CancelJobButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="destructive" onClick={onClick}>
      <X className="size-3.5" data-icon="inline-start" />
      {S.actions.cancel}
    </Button>
  )
}

/** Right-aligned action footer; which buttons show follows the job's stage. */
export function VendorJobActions({ job, canManage, onSend, onReceive, onResend, onCancel }: ActionsProps) {
  return (
    <div className="mt-2.5 flex justify-end gap-2 pl-7">
      {job.stage === 'awaiting_vendor' && (
        <>
          {canManage && (
            <Button size="sm" onClick={() => onSend(job)}>
              <Send className="size-3.5" data-icon="inline-start" />
              {S.actions.send}
            </Button>
          )}
          <CancelJobButton onClick={() => onCancel(job)} />
        </>
      )}
      {job.stage === 'with_vendor' && (
        <>
          <Button size="sm" onClick={() => onReceive(job)}>
            <PackageCheck className="size-3.5" data-icon="inline-start" />
            {S.actions.receive}
          </Button>
          <CancelJobButton onClick={() => onCancel(job)} />
        </>
      )}
      {job.stage === 'returned' && (
        <Button size="sm" onClick={() => onResend(job)}>
          <RefreshCw className="size-3.5" data-icon="inline-start" />
          {S.actions.sendAgain}
        </Button>
      )}
    </div>
  )
}
