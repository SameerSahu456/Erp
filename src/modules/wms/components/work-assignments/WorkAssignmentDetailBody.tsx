/**
 * One work assignment.
 *
 * The header says "Issued to Ravi" and never changes — it is a custody
 * signature about a moment in the past (spec D1). Who holds a device NOW is on
 * each line, and reassigning moves that without touching the header. Both
 * statements are true at once, which is the whole point of separating them.
 *
 * The line table is server-paginated (§16.7): search / sort / page come from
 * `GET /work-assignments/{id}/lines`, never a client slice of the whole lot.
 * Actionable lines carry a checkbox — tick them to Print Selected or Withdraw
 * from the toolbar; ticks persist across pages (the print/withdraw send the
 * exact line ids, so a selection can span pages).
 */
import { DetailPageShell } from '@/components/page-shells'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { FormCardSkeleton } from '@/components/common/feedback/FormCardSkeleton'
import { NoAccess } from '@/shared/components/feedback/NoAccess'
import { isForbidden, isNotFound } from '@shared/api/envelope'
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState'
import { toast } from 'sonner'
import { recordNotFoundTitle } from '@shared/routing/record-label'

import { useWorkAssignmentDetail } from '../../hooks/work-assignments/useWorkAssignmentDetail'
import { USE_PRINT_LABELS_STRINGS } from '../../hooks/work-assignments/use-print-labels.strings'

import { WorkAssignmentActions } from './WorkAssignmentActions'
import { WorkAssignmentDialogs } from './WorkAssignmentDialogs'
import { LabelPreviewDialog } from './LabelPreviewDialog'
import { WorkAssignmentProgressStats } from './WorkAssignmentProgressStats'
import { WorkAssignmentOverviewCard } from './WorkAssignmentOverviewCard'
import { WorkAssignmentLinesSection } from './WorkAssignmentLinesSection'
import { workAssignmentHeader } from './work-assignment-detail-helpers'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

export function WorkAssignmentDetailBody() {
  const {
    id,
    label,
    assignment: { data, isLoading, isError, error },
    isOpen,
    confirming,
    setConfirming,
    lv,
    withdraw,
    canManage,
    print: { printAssignment, isPrinting, preview, dismissPreview },
    lineRows,
  } = useWorkAssignmentDetail()
  const { selectedIds } = lv

  // §0.6 / §2 — split the states: a skeleton while loading, a no-access page on
  // 403 (never leak the record), a friendly not-found for a bad/deleted id or a
  // load error.
  if (isLoading) {
    return (
      <DetailPageShell title={S.list.title} backHref="/wms/work-assignments">
        <FormCardSkeleton />
      </DetailPageShell>
    )
  }
  if (isForbidden(error)) {
    return (
      <DetailPageShell title={S.list.title} backHref="/wms/work-assignments">
        <NoAccess />
      </DetailPageShell>
    )
  }
  if (isError && !isNotFound(error)) {
    return (
      <DetailPageShell title={S.list.title} backHref="/wms/work-assignments">
        <LoadErrorState error={error} fallback={S.detail.loadFailed} />
      </DetailPageShell>
    )
  }
  if (!data) {
    return (
      <DetailPageShell title={S.list.title} backHref="/wms/work-assignments">
        <EmptyState title={recordNotFoundTitle(label, S.detail.notFound)} />
      </DetailPageShell>
    )
  }

  const header = workAssignmentHeader(data)

  return (
    <DetailPageShell
      title={data.wa_number}
      subtitle={header.subtitle}
      backHref="/wms/work-assignments"
      status={header.status}
      actions={
        <WorkAssignmentActions
          isPrinting={isPrinting}
          selectedCount={selectedIds.length}
          onPrintAll={() => void printAssignment(id)}
          onPrintSelected={() => void printAssignment(id, { lineIds: selectedIds })}
          onWithdraw={canManage ? () => setConfirming(true) : undefined}
        />
      }
    >
      <WorkAssignmentDialogs
        open={confirming}
        onOpenChange={setConfirming}
        lineIds={selectedIds}
        withdraw={withdraw}
        onWithdrawn={() => {
          toast.success(S.detail.withdrawnSuccess(selectedIds.length))
          lv.clearSelection()
        }}
      />

      <LabelPreviewDialog
        url={preview?.url ?? null}
        count={preview?.count ?? 0}
        filename={preview?.filename ?? USE_PRINT_LABELS_STRINGS.fileName.default}
        onClose={dismissPreview}
      />

      <div className="flex flex-col gap-6">
        {/* KPI stat cards, one coloured count per state — first, so the
            assignment's progress is the first thing read. */}
        <WorkAssignmentProgressStats progress={data.progress} />

        {/* Label-on-top field:value (§2) — "Issued to", never "Assigned to"
            (see WorkAssignmentOverviewCard). */}
        <WorkAssignmentOverviewCard assignment={data} />

        <WorkAssignmentLinesSection id={id} isOpen={isOpen} lv={lv} lineRows={lineRows} />
      </div>
    </DetailPageShell>
  )
}
