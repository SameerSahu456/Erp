import { useMemo, useState } from 'react'
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { useParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { FileQuestion } from 'lucide-react'

import { StatusBadge } from '@/components/common/display/StatusBadge'
import { PageHeader } from '@/components/page-shells'
import { mockWorkOrders } from '../../data/work-orders'
import {
  getActiveStage,
  pctOf,
  priorityVariant,
  STATUS_VARIANT,
  TYPE_LABELS,
  workOrderSubtitle,
} from './work-order-detail-helpers'
import { WorkOrderKeyInfo, WorkOrderSourceCard, WorkOrderStepper } from './WorkOrderOverviewSections'
import { WorkOrderPickingCard } from './WorkOrderPickingCard'
import { WorkOrderAssemblyCard, WorkOrderQcCard } from './WorkOrderQcSections'
import { WorkOrderDestinationCard, WorkOrderMetaCards } from './WorkOrderDispatchSections'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

export function WorkOrderDetailBody() {
  const { id } = useParams<{ id: string }>()
  const goBack = useNavigateBack('/wms/work-orders')

  const wo = useMemo(() => mockWorkOrders.find((w) => w.id === id), [id])
  // "Days left" is read once at mount rather than during render, so the clock is
  // not an impure dependency of render (Rules of React).
  const [now] = useState(() => Date.now())

  if (!wo) {
    // §0.6 / §2 — a friendly EmptyState with the way back as its action.
    return (
      <EmptyState
        icon={FileQuestion}
        title={SD.notFound}
        action={{ label: SD.backToList, onClick: goBack }}
      />
    )
  }

  const activeStage = getActiveStage(wo.status)
  const totalRequired = wo.components.reduce((s, c) => s + c.requiredQty, 0)
  const totalPicked = wo.components.reduce((s, c) => s + c.pickedQty, 0)
  const totals = { totalRequired, totalPicked, pickingProgress: pctOf(totalPicked, totalRequired) }

  return (
    <div className="space-y-6">
      <PageHeader
        title={wo.workOrderNumber}
        subtitle={workOrderSubtitle(wo)}
        status={{ label: wo.status, variant: STATUS_VARIANT[wo.status] }}
        badges={
          <>
            <StatusBadge variant={wo.type === 'RENTAL' ? 'warning' : 'info'}>
              {TYPE_LABELS[wo.type]}
            </StatusBadge>
            <StatusBadge variant={priorityVariant(wo.priority)}>
              {wo.priority}
            </StatusBadge>
          </>
        }
        breadcrumbs={[
          { label: SD.breadcrumbs.wms },
          { label: SD.breadcrumbs.workOrders, href: '/wms/work-orders' },
          { label: wo.workOrderNumber },
        ]}
        backHref="/wms/work-orders"
      />

      <WorkOrderStepper wo={wo} activeStage={activeStage} />
      <WorkOrderKeyInfo wo={wo} totals={totals} now={now} />
      <WorkOrderSourceCard wo={wo} />
      <WorkOrderPickingCard wo={wo} totals={totals} />
      <WorkOrderAssemblyCard wo={wo} />
      <WorkOrderQcCard wo={wo} />
      <WorkOrderDestinationCard wo={wo} />
      <WorkOrderMetaCards wo={wo} />
    </div>
  )
}
