/**
 * Issue work.
 *
 * One box, in the floor's order: **which work** (a GRN, then a part line within
 * it), then **who**, then **how many**. A storeman stands at one pallet from one
 * GRN and issues one part code at a time.
 *
 * The engineer still comes before the quantity (spec D16): their outstanding
 * count is the only capacity signal the system has, and it informs nothing once
 * a number has already been chosen.
 *
 * Thin view over `useWorkAssignmentIssue`, which owns the state and submit.
 */
import { PackageOpen } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { FormPageShell } from '@/components/page-shells'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState'

import { useWorkAssignmentIssue } from '../../hooks/work-assignments/useWorkAssignmentIssue'
import { IssueStepAssignee } from './IssueStepAssignee'
import { IssueStepDevices } from './IssueStepDevices'
import { IssueStepScope } from './IssueStepScope'
import { IssueStepWork } from './IssueStepWork'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

type IssueController = ReturnType<typeof useWorkAssignmentIssue>

export function WorkAssignmentIssueBody() {
  const c = useWorkAssignmentIssue()

  return (
    <FormPageShell
      title={S.issue.title}
      backHref="/wms/work-assignments"
      saveLabel={S.issue.confirm}
      canSave={c.canSubmit}
      saving={c.create.isPending}
      // §3 — hand the shell OUR guard so the back arrow prompts on unsaved
      // changes too (not just Cancel); the shell also renders the discard dialog.
      guard={c.guard}
      onSave={() => void c.handleSubmit()}
      onCancel={c.navigateBack}
    >
      {/* One box, no per-step separation. Fields reveal as their input is set:
          the work after a warehouse, the engineer + quantity after the work. */}
      <Card>
        <CardContent className="flex flex-col gap-5 py-5">
          <IssueStepScope
            warehouses={c.activeWarehouses}
            warehouseId={c.warehouseId}
            onWarehouseChange={c.changeWarehouse}
            stage={c.stage}
            onStageChange={c.changeStage}
          />

          {c.warehouseId ? <IssueWorkSection c={c} /> : null}

          {c.effectiveWork ? (
            <>
              {/* The GRN caution sits with the choice it is about. */}
              <Alert>
                <AlertDescription>{S.issue.grnWarning}</AlertDescription>
              </Alert>
              <IssueStepAssignee
                engineers={c.engineers}
                isLoadingEngineers={c.engineersQuery.isFetching}
                engineerId={c.engineerId}
                onEngineerChange={c.setEngineerId}
                quantity={c.displayedQuantity}
                onQuantityChange={c.handleQuantityChange}
                available={c.available}
              />
              {/* The devices a count would take, and the place to tick exact
                  ones instead (D21). */}
              <IssueStepDevices
                devices={c.devices}
                selectedOpIds={c.selectedOpIds}
                onSelectionChange={c.handleSelectionChange}
                manualSelection={c.manualSelection}
                takeCount={c.takeCount}
                isLoading={c.devicesQuery.isFetching}
                searchValue={c.deviceSearch}
                onSearchChange={c.setDeviceSearch}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </FormPageShell>
  )
}

/** The work step: loading line, the no-work empty state, or the GRN/part pick. */
function IssueWorkSection({ c }: { c: IssueController }) {
  if (c.summaryQuery.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.issue.loading}
      </Typography>
    )
  }
  // §12 — a failed load is an error (or a 403), never "no work waiting".
  if (c.summaryQuery.isError) {
    return <LoadErrorState error={c.summaryQuery.error} fallback={S.issue.workLoadFailed} compact />
  }
  // §0.6 — gated on NO category being applied: an empty *category* keeps the
  // work step (and its picker) mounted so the operator can pick another one.
  if (c.summaryGroups.length === 0 && !c.categoryId) {
    return <EmptyState icon={PackageOpen} title={S.issue.noWork} description={S.issue.noWorkHint} />
  }
  return (
    <IssueStepWork
      categoryId={c.categoryId}
      onCategoryChange={c.changeCategory}
      groups={c.summaryGroups}
      selected={c.effectiveWork}
      onSelect={c.selectWork}
    />
  )
}
