import { Wrench } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { ExpandableClampText } from '@/components/common/display/ExpandableClampText'

import type { VendorJobSummary } from '../../api/service-jobs'
import { VENDOR_SERVICE_CARD_STRINGS as S } from './vendor-service-card.strings'
import { hasVendorJobActions, vendorJobMetaLine, vendorJobProvenance } from './vendor-job-row-helpers'
import { VendorJobActions, VendorJobBadges } from './VendorJobRowParts'

const DASH = '—'
const NOTES_LINES = 3

interface JobRowProps {
  job: VendorJobSummary
  readOnly: boolean
  canManage: boolean
  canWithdraw: boolean
  onSend: (job: VendorJobSummary) => void
  onReceive: (job: VendorJobSummary) => void
  onResend: (job: VendorJobSummary) => void
  onCancel: (job: VendorJobSummary) => void
}

/** Which actions a job offers is a function of its DERIVED stage, so the row
 *  never shows an action the server would reject. */
export function VendorJobRow({
  job,
  readOnly,
  canManage,
  canWithdraw,
  onSend,
  onReceive,
  onResend,
  onCancel,
}: JobRowProps) {
  const hasVendorActions = hasVendorJobActions(job, { readOnly, canManage, canWithdraw })
  const notes = job.notes?.trim()
  return (
    <li className="py-3.5 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-0.5">
            {/* Wraps instead of truncating, so a long description reads in full. */}
            <Typography variant="body-strong" className="min-w-0 break-words">
              {job.item_description ?? DASH}
              {job.cycle_number > 1 ? ` · ${S.trip(job.cycle_number)}` : ''}
            </Typography>
            {/* Provenance — who asked for this, and when. */}
            <Typography variant="helper" tone="muted" truncate className="min-w-0">
              {vendorJobProvenance(job)}
            </Typography>
            {/* Instructions entered when raising / sending (CP-362), clamped to
                3 lines with a Show more toggle (CP-445). */}
            {notes ? (
              <div className="min-w-0">
                <Typography variant="helper" tone="muted">
                  {S.instructionsLabel}
                </Typography>
                <ExpandableClampText text={notes} lines={NOTES_LINES} variant="helper" />
              </div>
            ) : null}
            {/* A cancellation is only meaningful with its reason. */}
            {job.cancellation_reason ? (
              <Typography variant="helper" tone="danger" className="min-w-0">
                {S.cancelledReason(job.cancellation_reason)}
              </Typography>
            ) : null}
            <Typography variant="helper" tone="muted" truncate className="min-w-0">
              {vendorJobMetaLine(job)}
            </Typography>
          </div>
        </div>
        {/* Status, top-right, aligned with the title. */}
        <VendorJobBadges job={job} />
      </div>
      {/* Actions as a right-aligned footer — only when there is one. */}
      {hasVendorActions && (
        <VendorJobActions
          job={job}
          canManage={canManage}
          onSend={onSend}
          onReceive={onReceive}
          onResend={onResend}
          onCancel={onCancel}
        />
      )}
    </li>
  )
}
