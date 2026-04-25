import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  ShoppingCart,
  PackageCheck,
  Warehouse,
  ClipboardCheck,
  Wrench,
  CheckCircle,
  XCircle,
  Boxes,
  Truck,
  DollarSign,
  MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { Timeline, type TimelineEntry, type TimelineVariant } from '@/components/common/Timeline'
import { mockStockItems } from '../data/stock-items'
import { mockSkuHistory } from '../data/sku-history'
import type { SkuHistoryEntry, StockSku } from '@/modules/wms/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVENT_ICONS: Record<SkuHistoryEntry['event'], LucideIcon> = {
  PO_CREATED: ShoppingCart,
  PO_RECEIVED: PackageCheck,
  GRN_INWARD: Warehouse,
  INSPECTION: ClipboardCheck,
  REPAIR: Wrench,
  QC_PASSED: CheckCircle,
  QC_FAILED: XCircle,
  STOCKED: Boxes,
  DISPATCHED: Truck,
  PRICE_CHANGED: DollarSign,
  LOCATION_CHANGED: MapPin,
}

const EVENT_VARIANTS: Record<SkuHistoryEntry['event'], TimelineVariant> = {
  PO_CREATED: 'default',
  PO_RECEIVED: 'default',
  GRN_INWARD: 'default',
  INSPECTION: 'warning',
  REPAIR: 'warning',
  QC_PASSED: 'success',
  QC_FAILED: 'error',
  STOCKED: 'success',
  DISPATCHED: 'default',
  PRICE_CHANGED: 'warning',
  LOCATION_CHANGED: 'default',
}

const SKU_STATUS_BADGE_MAP: Record<StockSku['status'], 'success' | 'info' | 'warning' | 'error'> = {
  'In Stock': 'success',
  Reserved: 'warning',
  Dispatched: 'info',
  'In Repair': 'error',
}

export default function SkuHistoryPage() {
  const { id, sku } = useParams<{ id: string; sku: string }>()

  const item = useMemo(() => mockStockItems.find((i) => i.id === id), [id])

  const skuDetail = useMemo(() => {
    if (!item) return undefined
    for (const v of item.variants) {
      const found = v.skus.find((s) => s.sku === sku)
      if (found) return found
    }
    return undefined
  }, [item, sku])

  const historyEntries: TimelineEntry[] = useMemo(() => {
    if (!sku) return []
    return mockSkuHistory
      .filter((h) => h.sku === sku)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((h) => {
        let description = h.description
        if (h.fromValue && h.toValue) {
          description += ` (${h.fromValue} \u2192 ${h.toValue})`
        }
        if (h.reference) {
          description += ` [Ref: ${h.reference}]`
        }
        return {
          id: h.id,
          icon: EVENT_ICONS[h.event],
          title: h.event.replace(/_/g, ' '),
          description,
          user: h.user,
          timestamp: formatDate(h.timestamp),
          variant: EVENT_VARIANTS[h.event],
        }
      })
  }, [sku])

  if (!item || !skuDetail) {
    return (
      <EmptyState
        title="Part no not found"
        description="The Part no you are looking for does not exist or is not associated with this item."
      />
    )
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={sku ?? ''}
        subtitle={item.name}
        backHref={`/ims/stock-items/${id}`}
      />

      {/* SKU Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Part no Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Serial Number</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{skuDetail.serialNumber}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Barcode</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{skuDetail.barcode}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge variant={SKU_STATUS_BADGE_MAP[skuDetail.status]}>
                  {skuDetail.status}
                </StatusBadge>
              </dd>
            </div>
            {skuDetail.grade && (
              <div>
                <dt className="text-sm text-muted-foreground">Grade</dt>
                <dd className="mt-1 text-sm font-medium">Grade {skuDetail.grade}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Current Location</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{skuDetail.location}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Received Date</dt>
              <dd className="mt-1 text-sm font-medium">{formatDate(skuDetail.receivedDate)}</dd>
            </div>
            {skuDetail.poNumber && (
              <div>
                <dt className="text-sm text-muted-foreground">PO Number</dt>
                <dd className="mt-1 text-sm font-medium">{skuDetail.poNumber}</dd>
              </div>
            )}
            {skuDetail.batchNumber && (
              <div>
                <dt className="text-sm text-muted-foreground">Batch Number</dt>
                <dd className="mt-1 text-sm font-medium">{skuDetail.batchNumber}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Full Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyEntries.length > 0 ? (
            <Timeline entries={historyEntries} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No history records found for this Part no.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
