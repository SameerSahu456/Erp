import { formatIST_date } from '@shared/lib/date'

import type { WorkOrder, WorkOrderComponent, WorkOrderStatus, WorkOrderType } from '../../types'
import { WORK_ORDERS_STRINGS } from './work-orders.strings'

const SD = WORK_ORDERS_STRINGS.detail

type BadgeVariant = 'success' | 'warning' | 'info' | 'neutral' | 'error'

export function formatDate(dateStr: string) {
  return formatIST_date(dateStr)
}

export function formatDateTime(dateStr: string) {
  return formatIST_date(dateStr)
}

export const STATUS_VARIANT: Record<WorkOrderStatus, BadgeVariant> = {
  'Draft': 'neutral',
  'Pending Approval': 'warning',
  'Approved': 'info',
  'Component Picking': 'warning',
  'Components Picked': 'info',
  'In Assembly': 'warning',
  'Assembly Complete': 'info',
  'Packaging': 'warning',
  'Pending QC': 'warning',
  'QC Passed': 'success',
  'QC Failed': 'error',
  'Ready for Dispatch': 'success',
  'Sent to Rental Warehouse': 'success',
  'Dispatched': 'success',
  'Invoiced': 'success',
  'Closed': 'neutral',
}

export const TYPE_LABELS: Record<WorkOrderType, string> = {
  SALES: 'Sales Order',
  RENTAL: 'Rental Contract',
  INTERNAL: 'Internal',
  DEMO: 'Demo',
}

export function getActiveStage(status: WorkOrderStatus): number {
  const statusToStage: Record<string, number> = {
    'Draft': 0,
    'Pending Approval': 0,
    'Approved': 1,
    'Component Picking': 2,
    'Components Picked': 2,
    'In Assembly': 3,
    'Assembly Complete': 3,
    'Packaging': 4,
    'Pending QC': 5,
    'QC Passed': 5,
    'QC Failed': 5,
    'Ready for Dispatch': 6,
    'Sent to Rental Warehouse': 6,
    'Dispatched': 6,
    'Invoiced': 7,
    'Closed': 7,
  }
  return statusToStage[status] ?? 0
}

const PRIORITY_VARIANT: Record<string, BadgeVariant> = { Urgent: 'error', High: 'warning', Medium: 'info' }

export function priorityVariant(priority: string): BadgeVariant {
  return PRIORITY_VARIANT[priority] ?? 'neutral'
}

export function componentStatusVariant(status: WorkOrderComponent['status']): BadgeVariant {
  if (status === 'Issued' || status === 'Picked') return 'success'
  return status === 'Partially Picked' ? 'warning' : 'neutral'
}

export function componentBarClass(progress: number): string {
  if (progress === 100) return 'bg-success'
  return progress > 0 ? 'bg-warning' : 'bg-muted'
}

export function pctOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export function stageCircleClass(s: { isFailed: boolean; isCompleted: boolean; isActive: boolean }): string {
  if (s.isFailed) return 'bg-destructive-soft text-destructive ring-2 ring-destructive'
  if (s.isCompleted) return 'bg-success-soft text-success'
  if (s.isActive) return 'bg-primary text-primary-foreground ring-2 ring-primary/30'
  return 'bg-muted text-muted-foreground'
}

/** Short destination label for the key-info card. */
export function destinationShortLabel(wo: Pick<WorkOrder, 'destinationType'>): string {
  if (wo.destinationType === 'RENTAL_WAREHOUSE') return SD.destinationRentalWarehouse
  return wo.destinationType === 'DISPATCH' ? SD.destinationDirectDispatch : SD.destinationStock
}

/** Destination field on the dispatch card — names the rental warehouse when known. */
export function destinationFieldValue(wo: Pick<WorkOrder, 'destinationType' | 'destinationWarehouseName'>): string {
  if (wo.destinationType === 'RENTAL_WAREHOUSE') {
    return wo.destinationWarehouseName ?? SD.destinationRentalWarehouse
  }
  return wo.destinationType === 'DISPATCH' ? SD.destinationDirectToCustomer : SD.destinationStock
}

export function workOrderSubtitle(wo: Pick<WorkOrder, 'outputPartName' | 'outputQty' | 'customerName'>): string {
  return `${wo.outputPartName} × ${wo.outputQty}${wo.customerName ? ` · ${wo.customerName}` : ''}`
}
