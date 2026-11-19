import { Boxes, Repeat } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { WorkOrder, WorkOrderComponent } from '../../types'
import { componentBarClass, componentStatusVariant, pctOf } from './work-order-detail-helpers'
import type { PickingTotals } from './WorkOrderOverviewSections'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

function PickedSkus({ skus }: { skus: WorkOrderComponent['pickedSkus'] }) {
  return (
    <>
      {/* Picked SKUs (collapsed view) */}
      {skus.length > 0 && skus.length <= 4 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skus.map((s) => (
            <span key={s.sku} className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
              {s.barcode} · {s.location}
            </span>
          ))}
        </div>
      )}
      {skus.length > 4 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {SD.unitsPickedFrom(skus.length, skus[0]?.location ?? '')}
        </p>
      )}
    </>
  )
}

function PickedComponentRow({ comp }: { comp: WorkOrderComponent }) {
  const progress = pctOf(comp.pickedQty, comp.requiredQty)
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{comp.partName}</p>
            {comp.isSubstitute && (
              <StatusBadge variant="warning">
                <Repeat className="size-3 mr-1" />
                {SD.substitute}
              </StatusBadge>
            )}
            <StatusBadge variant={componentStatusVariant(comp.status)}>
              {comp.status}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {SD.partNoPrefix} {comp.partSku}
            {comp.isSubstitute && comp.originalPartId && (
              <span className="ml-2 italic">
                {SD.originalPartPrefix} {comp.originalPartId})
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <Typography variant="subsection-title" asChild><p>
            {comp.pickedQty}/{comp.requiredQty}
          </p></Typography>
          <Typography variant="helper" asChild><p>{SD.percentPicked(progress)}</p></Typography>
        </div>
      </div>
      {/* Mini progress bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${componentBarClass(progress)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <PickedSkus skus={comp.pickedSkus} />
    </div>
  )
}

export function WorkOrderPickingCard({ wo, totals }: { wo: WorkOrder; totals: PickingTotals }) {
  const { totalPicked, totalRequired, pickingProgress } = totals
  const hasSubstitutes = wo.components.some((c) => c.isSubstitute)
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Boxes className="size-4" />
            {SD.componentPickingTitle}
            {hasSubstitutes && (
              <StatusBadge variant="warning">
                <Repeat className="size-3 mr-1" />
                {SD.hasSubstitutions}
              </StatusBadge>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">
            {SD.pickedOf(totalPicked, totalRequired, pickingProgress)}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              pickingProgress === 100 ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${pickingProgress}%` }}
          />
        </div>
      </div>
      <div className="divide-y">
        {wo.components.map((comp) => (
          <PickedComponentRow key={comp.id} comp={comp} />
        ))}
      </div>
    </div>
  )
}
