import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  PackageCheck,
  Warehouse,
  ArrowLeftRight,
  Wrench,
  Trash2,
  Undo2,
  Boxes,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import {
  Timeline,
  type TimelineEntry,
  type TimelineVariant,
} from '@/components/common/display/Timeline'
import { formatIST } from '@shared/lib/date'

import { useStockItem, useStockMovements } from '../../hooks/stock/useStock'
import { useVariant } from '../../hooks/variants/useVariants'
import { usePart } from '../../hooks/parts/useParts'
import { SKU_HISTORY_STRINGS } from './sku-history.strings'
import { StockItemLifecycleTimeline } from '../stock/StockItemLifecycleTimeline'


export const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  available: 'success',
  reserved: 'warning',
  consumed: 'neutral',
  damaged: 'error',
  disposed: 'neutral',
}

export const MOVEMENT_ICONS: Record<string, LucideIcon> = {
  inward: PackageCheck,
  outward: Warehouse,
  transfer: ArrowLeftRight,
  adjustment: Wrench,
  return: Undo2,
  dispose: Trash2,
}

export const MOVEMENT_VARIANTS: Record<string, TimelineVariant> = {
  inward: 'success',
  outward: 'default',
  transfer: 'default',
  adjustment: 'warning',
  return: 'default',
  dispose: 'error',
}

export function statusLabel(s: string): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function locationLabel(
  warehouseId: string | null,
  rack: string | null,
  bin: string | null,
): string {
  if (!warehouseId && !rack && !bin) return '—'
  const wh = warehouseId ? `WH ${warehouseId.slice(0, 4)}…` : '—'
  const loc = [rack, bin].filter(Boolean).join('/')
  return loc ? `${wh} · ${loc}` : wh
}


export function SkuHistoryBody() {
  const { id = '', sku } = useParams<{ id: string; sku: string }>()

  const { data: item, isLoading: itemLoading, isError: itemError } = useStockItem(id)
  const { data: movements = [], isLoading: movementsLoading } = useStockMovements(id)
  const { data: variant } = useVariant(item?.part_variant_id ?? '')
  const { data: part } = usePart((variant as { part_id?: string } | undefined)?.part_id ?? '')

  const sortedMovements = useMemo(
    () => [...movements].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [movements],
  )

  const timelineEntries: TimelineEntry[] = useMemo(() => {
    return sortedMovements.map((m) => {
      const icon = MOVEMENT_ICONS[m.movement_type] ?? Boxes
      const variantStyle = MOVEMENT_VARIANTS[m.movement_type] ?? 'default'
      const fromLabel = locationLabel(m.from_warehouse_id, m.from_rack, m.from_bin)
      const toLabel = locationLabel(m.to_warehouse_id, m.to_rack, m.to_bin)
      const parts: string[] = []
      if (fromLabel !== '—' || toLabel !== '—') {
        parts.push(`${fromLabel} → ${toLabel}`)
      }
      parts.push(`Qty ${Number(m.quantity).toString()}`)
      const batch = (m as { batch_number?: string | null }).batch_number
      if (batch) parts.push(`Batch ${batch}`)
      if (m.notes) parts.push(m.notes)
      return {
        id: m.id,
        icon,
        title: m.movement_type
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: parts.join(' · '),
        timestamp: formatIST(m.created_at),
        variant: variantStyle,
      }
    })
  }, [sortedMovements])

  if (itemLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (itemError || !item) {
    return (
      <EmptyState
        title={SKU_HISTORY_STRINGS.notFound.title}
        description={SKU_HISTORY_STRINGS.notFound.description}
      />
    )
  }

  const titleSerial = sku ?? item.serial_number ?? id.slice(0, 8)
  const variantName = variant?.name ?? '—'
  const partName = part?.name ?? '—'

  return (
    <div className="space-y-6">
      <EntityHeader
        title={titleSerial}
        subtitle={`${partName} · ${variantName}`}
        backHref={`/ims/stock-items`}
      />

      {/* Stock item details */}
      <Card>
        <CardHeader>
          <CardTitle>{SKU_HISTORY_STRINGS.card.detailsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.serialNumber}</dt>
              </Typography>
              <Typography asChild variant="body-strong" className="mt-1 font-mono">
                <dd>{item.serial_number ?? '—'}</dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.status}</dt>
              </Typography>
              <dd className="mt-1">
                <StatusBadge variant={STATUS_VARIANT[item.status] ?? 'neutral'}>
                  {statusLabel(item.status)}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.warehouse}</dt>
              </Typography>
              <Typography asChild variant="body" className="mt-1 font-mono">
                <dd>
                  {item.warehouse_id ? `${item.warehouse_id.slice(0, 8)}…` : '—'}
                </dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.rackBin}</dt>
              </Typography>
              <Typography asChild variant="body" className="mt-1">
                <dd>
                  {[item.rack, item.bin].filter(Boolean).join(' / ') || '—'}
                </dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.variant}</dt>
              </Typography>
              <Typography asChild variant="body-strong" className="mt-1">
                <dd>{variantName}</dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.condition}</dt>
              </Typography>
              <Typography asChild variant="body" className="mt-1">
                <dd>{variant?.condition ?? '—'}</dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.created}</dt>
              </Typography>
              <Typography asChild variant="body" className="mt-1">
                <dd>{formatIST(item.created_at)}</dd>
              </Typography>
            </div>
            <div>
              <Typography asChild variant="body" tone="muted">
                <dt>{SKU_HISTORY_STRINGS.fields.updated}</dt>
              </Typography>
              <Typography asChild variant="body" className="mt-1">
                <dd>{formatIST(item.updated_at)}</dd>
              </Typography>
            </div>
            {item.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Typography asChild variant="body" tone="muted">
                  <dt>{SKU_HISTORY_STRINGS.fields.notes}</dt>
                </Typography>
                <Typography
                  asChild
                  variant="body"
                  className="mt-1 whitespace-pre-wrap"
                >
                  <dd>{item.notes}</dd>
                </Typography>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Movement history */}
      <Card>
        <CardHeader>
          <CardTitle>{SKU_HISTORY_STRINGS.card.historyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : timelineEntries.length > 0 ? (
            <Timeline entries={timelineEntries} />
          ) : (
            <Typography variant="body" tone="muted">
              {SKU_HISTORY_STRINGS.card.noMovements}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Per-unit lifecycle audit (issued → dispatched → …) */}
      <StockItemLifecycleTimeline stockItemId={id} />
    </div>
  )
}

