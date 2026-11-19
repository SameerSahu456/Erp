/**
 * Vendor-service cards on the device detail page.
 *
 * ONE consolidated card for every applicable job type. Jobs are grouped under
 * a per-type sub-heading, and a single "Raise request" button opens one form
 * where the operator first picks the job type. Every action is keyed by job id,
 * never by device, so the operator acts on the row they can see.
 *
 * There is deliberately no branch on a section code: which sections appear,
 * what the items suggest, and whether Receive asks for a replacement serial
 * all come from `service_sections` rows.
 */
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

import { useApplicableSections } from '../../hooks/vendor-jobs/useServiceSections'
import { useDeviceServiceJobs } from '../../hooks/vendor-jobs/useServiceJobs'
import type { ServiceSection, VendorJobSummary } from '../../api/service-jobs'

import { CancelVendorJobDialog } from './CancelVendorJobDialog'
import { RaiseVendorJobDialog } from './RaiseVendorJobDialog'
import { ReceiveVendorJobDialog } from './ReceiveVendorJobDialog'
import { SendVendorJobDialog } from './SendVendorJobDialog'
import { VENDOR_SERVICE_CARD_STRINGS as S } from './vendor-service-card.strings'
import { sectionForJob } from './vendor-job-row-helpers'
import { VendorJobGroups } from './VendorJobGroups'
import { VendorJobsPlaceholder } from './VendorJobsPlaceholder'

interface VendorServiceCardsProps {
  deviceId: string
  /** True when the device's category is BOM-eligible — PRD §12.7's "server
   *  assembly", which sections may opt out of via `applies_to_servers`. */
  isAssembly?: boolean
  /** QC and Assign-to-Rack render these read-only, and only where the unit
   *  actually has history in that section (PRD §8). */
  readOnly?: boolean
  /** Whether raising a NEW job is offered. Gated by the caller to the stages
   *  where a unit is being worked (Repair / QC / Outward QC, not Inspection) —
   *  outside them the card still shows history, just without the Raise button.
   *  Defaults to true so callers that don't stage-gate keep the previous
   *  behaviour. */
  canRaise?: boolean
  /** Manager-tier (wms:service_job_manage): dispatch (send / send-again),
   *  receive-back, and cancelling a job already AT a vendor. Engineers never
   *  hold this. Defaults to true to preserve existing manager-facing callers. */
  canManage?: boolean
  /** Operator (engineer) may WITHDRAW a job before it is sent to a vendor — undo
   *  a mistaken raise (CP-464). Managers also may. Defaults to true. */
  canWithdraw?: boolean
}

export function VendorServiceCards({
  deviceId,
  isAssembly,
  readOnly = false,
  canRaise = true,
  canManage = true,
  canWithdraw = true,
}: VendorServiceCardsProps) {
  const sections = useApplicableSections(isAssembly)
  const jobsQuery = useDeviceServiceJobs(deviceId)
  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data])

  // Every job action opens from the ONE card now, so their dialog state lives
  // here (was per-section-card before the consolidation).
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [sendJob, setSendJob] = useState<VendorJobSummary | null>(null)
  const [resendJob, setResendJob] = useState<VendorJobSummary | null>(null)
  const [receiveJob, setReceiveJob] = useState<VendorJobSummary | null>(null)
  const [cancelJob, setCancelJob] = useState<VendorJobSummary | null>(null)

  // Resolve a job's section object (the Send / Receive dialogs need it) from the
  // applicable list. Every DISPLAYED job's section is in it, because jobs are
  // grouped under exactly those sections below.
  const sectionByCode = useMemo(() => {
    const m = new Map<string, ServiceSection>()
    for (const s of sections) m.set(s.code, s)
    return m
  }, [sections])

  // One group per applicable section that has jobs, in the sections' own order.
  const groups = sections
    .map((section) => ({
      section,
      rows: jobs.filter((j) => j.section_code === section.code),
    }))
    .filter(({ rows }) => rows.length > 0)

  // Read-only viewers (QC / rack) see the card only when there IS history; an
  // operator always sees it while a bench applies (that is how the first job
  // gets raised). Nothing applicable at all -> nothing to show.
  if (sections.length === 0) return null
  if (readOnly && groups.length === 0) return null

  const showRaise = !readOnly && canRaise
  // Non-null section for the Send / Receive dialogs (their prop is required).
  // Only read while a job is set, and a displayed job's section is always found.
  const fallbackSection = sections[0]
  const sendSection = sectionForJob(sendJob, sectionByCode, fallbackSection)
  const resendSection = sectionForJob(resendJob, sectionByCode, fallbackSection)
  const receiveSection = sectionForJob(receiveJob, sectionByCode, fallbackSection)

  return (
    <section className="rounded-md border border-input bg-card p-4">
      <header className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <Typography variant="card-title" truncate className="min-w-0">
          {S.cardTitle}
        </Typography>
        {showRaise && (
          <Button size="sm" onClick={() => setRaiseOpen(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.raise}
          </Button>
        )}
      </header>

      {jobsQuery.isLoading || jobsQuery.isError || groups.length === 0 ? (
        // A failed or pending fetch is not "no requests" (§12).
        <VendorJobsPlaceholder query={jobsQuery} />
      ) : (
        <VendorJobGroups
          groups={groups}
          gates={{ readOnly, canManage, canWithdraw }}
          handlers={{
            onSend: setSendJob,
            onReceive: setReceiveJob,
            onResend: setResendJob,
            onCancel: setCancelJob,
          }}
        />
      )}

      {readOnly ? (
        <Typography variant="helper" tone="muted" className="mt-2">
          {S.readOnlyNote}
        </Typography>
      ) : null}

      <RaiseVendorJobDialog
        deviceId={raiseOpen ? deviceId : null}
        sections={sections}
        onClose={() => setRaiseOpen(false)}
      />
      <SendVendorJobDialog
        deviceId={deviceId}
        job={sendJob}
        section={sendSection}
        mode="send"
        onClose={() => setSendJob(null)}
      />
      <SendVendorJobDialog
        deviceId={deviceId}
        job={resendJob}
        section={resendSection}
        mode="resend"
        onClose={() => setResendJob(null)}
      />
      <ReceiveVendorJobDialog
        deviceId={deviceId}
        job={receiveJob}
        section={receiveSection}
        onClose={() => setReceiveJob(null)}
      />
      <CancelVendorJobDialog
        deviceId={deviceId}
        job={cancelJob}
        onClose={() => setCancelJob(null)}
      />
    </section>
  )
}
