import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { Timeline, type TimelineEntry } from '@/components/common/Timeline'
import { PermissionGate } from '@/components/common/PermissionGate'
import { cn } from '@/lib/utils'
import { mockStockItems } from '../data/stock-items'
import { mockStockMovements } from '@/modules/wms/data/stock-movements'
import { DEVICE_STATUS_LABELS } from '@/modules/wms/types'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const VARIANT_BADGE_MAP: Record<string, 'success' | 'info' | 'warning'> = {
  New: 'success',
  Refurbished: 'info',
  'New Pool': 'warning',
}

export default function StockItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const item = mockStockItems.find((i) => i.id === id)

  const movementEntries: TimelineEntry[] = useMemo(() => {
    if (!item) return []
    return mockStockMovements
      .slice(0, 10)
      .map((mv) => ({
        id: mv.id,
        title: `${mv.deviceBarcode}: ${DEVICE_STATUS_LABELS[mv.fromStatus]} -> ${DEVICE_STATUS_LABELS[mv.toStatus]}`,
        description: mv.notes,
        user: mv.changedBy,
        timestamp: formatDate(mv.changedAt),
        variant: 'default' as const,
      }))
  }, [item])

  if (!item) {
    return (
      <EmptyState
        title="Stock item not found"
        description="The stock item you are looking for does not exist."
      />
    )
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={item.name}
        subtitle={`${item.categoryName}${item.subcategory ? ` / ${item.subcategory}` : ''} - ${item.brand}`}
        backHref="/ims/stock-items"
      />

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">SKU</dt>
              <dd className="mt-1 text-sm font-medium">{item.sku}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Category</dt>
              <dd className="mt-1 text-sm font-medium">{item.categoryName}</dd>
            </div>
            {item.subcategory && (
              <div>
                <dt className="text-sm text-muted-foreground">Subcategory</dt>
                <dd className="mt-1 text-sm font-medium">{item.subcategory}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Brand</dt>
              <dd className="mt-1 text-sm font-medium">{item.brand}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Location</dt>
              <dd className="mt-1 text-sm font-medium">{item.location}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Reorder Level</dt>
              <dd className="mt-1 text-sm font-medium">{item.reorderLevel}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Variants */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Variants</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {item.variants.map((v) => {
            const isLow = v.quantity < item.reorderLevel
            const variantCard = (
              <Card key={v.type}>
                <CardContent className="space-y-3 pt-4">
                  <StatusBadge variant={VARIANT_BADGE_MAP[v.type] ?? 'neutral'}>
                    {v.type}
                  </StatusBadge>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Quantity</span>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          isLow && 'rounded bg-destructive/10 px-2 text-destructive'
                        )}
                      >
                        {v.quantity}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Unit Price</span>
                      <span className="text-sm font-medium">
                        {currencyFmt.format(v.unitPrice)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm">{formatDate(v.lastUpdated)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )

            if (v.type === 'Refurbished') {
              return (
                <PermissionGate key={v.type} role="TECHNICAL_TEAM">
                  {variantCard}
                </PermissionGate>
              )
            }
            return variantCard
          })}
        </div>
      </div>

      {/* Stock Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {movementEntries.length > 0 ? (
            <Timeline entries={movementEntries} />
          ) : (
            <p className="text-sm text-muted-foreground">No movements recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
