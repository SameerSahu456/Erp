import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import { Timeline, type TimelineEntry } from '@/components/common/Timeline'
import { PermissionGate } from '@/components/common/PermissionGate'
import { cn } from '@/lib/utils'
import { mockStockItems } from '../data/stock-items'
import { mockSkuHistory } from '../data/sku-history'
import type { StockItem, StockVariant, StockSku } from '@/modules/wms/types'

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

const SKU_STATUS_BADGE_MAP: Record<StockSku['status'], 'success' | 'info' | 'warning' | 'error'> = {
  'In Stock': 'success',
  Reserved: 'warning',
  Dispatched: 'info',
  'In Repair': 'error',
}

export default function StockItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<StockItem | undefined>(() =>
    mockStockItems.find((i) => i.id === id)
  )

  const [editingVariant, setEditingVariant] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = useCallback((variantType: string, currentPrice: number) => {
    setEditingVariant(variantType)
    setEditValue(String(currentPrice))
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const savePrice = useCallback(() => {
    if (!editingVariant || !item) return
    const newPrice = parseFloat(editValue)
    if (isNaN(newPrice) || newPrice <= 0) {
      setEditingVariant(null)
      return
    }
    setItem({
      ...item,
      variants: item.variants.map((v) =>
        v.type === editingVariant
          ? { ...v, unitPrice: newPrice, lastUpdated: new Date().toISOString() }
          : v
      ),
    })
    toast.success('Price updated')
    setEditingVariant(null)
  }, [editingVariant, editValue, item])

  const cancelEditing = useCallback(() => {
    setEditingVariant(null)
  }, [])

  // Price change log from SKU history
  const priceChangeEntries: TimelineEntry[] = useMemo(() => {
    if (!item) return []
    const allSkus = item.variants.flatMap((v) => v.skus.map((s) => s.sku))
    return mockSkuHistory
      .filter((h) => h.event === 'PRICE_CHANGED' && allSkus.includes(h.sku))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((h) => ({
        id: h.id,
        icon: DollarSign,
        title: h.description,
        description: h.fromValue && h.toValue
          ? `${currencyFmt.format(Number(h.fromValue))} \u2192 ${currencyFmt.format(Number(h.toValue))}`
          : undefined,
        user: h.user,
        timestamp: formatDate(h.timestamp),
        variant: 'warning' as const,
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
        subtitle={`${item.sku} \u00B7 ${item.categoryName}${item.subcategory ? ` / ${item.subcategory}` : ''} \u00B7 ${item.brand}`}
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
            {item.aliases && item.aliases.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-sm text-muted-foreground">Aliases</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {item.aliases.map((alias) => (
                    <StatusBadge key={alias} variant="neutral">
                      {alias}
                    </StatusBadge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Variant Sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Variants &amp; Inventory</h2>
        {item.variants.map((v) => {
          const variantCard = (
            <VariantCard
              key={v.type}
              variant={v}
              itemId={item.id}
              reorderLevel={item.reorderLevel}
              isEditing={editingVariant === v.type}
              editValue={editValue}
              inputRef={inputRef}
              onStartEditing={() => startEditing(v.type, v.unitPrice)}
              onEditValueChange={setEditValue}
              onSave={savePrice}
              onCancel={cancelEditing}
            />
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

      {/* Price Change Log */}
      {priceChangeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price Change Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline entries={priceChangeEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Variant Card component ──

interface VariantCardProps {
  variant: StockVariant
  itemId: string
  reorderLevel: number
  isEditing: boolean
  editValue: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onStartEditing: () => void
  onEditValueChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}

function VariantCard({
  variant,
  itemId,
  reorderLevel,
  isEditing,
  editValue,
  inputRef,
  onStartEditing,
  onEditValueChange,
  onSave,
  onCancel,
}: VariantCardProps) {
  const isLow = variant.quantity < reorderLevel
  const totalValue = variant.quantity * variant.unitPrice

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge variant={VARIANT_BADGE_MAP[variant.type] ?? 'neutral'}>
            {variant.type}
          </StatusBadge>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-muted-foreground">Qty:</span>
            <span
              className={cn(
                'text-lg font-bold',
                isLow && 'rounded bg-destructive/10 px-2 text-destructive'
              )}
            >
              {variant.quantity}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-muted-foreground">Unit Price:</span>
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave()
                  if (e.key === 'Escape') onCancel()
                }}
                className="h-7 w-28 rounded border border-input bg-background px-2 text-sm font-medium"
              />
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                className="group inline-flex items-center gap-1"
              >
                <span className="text-sm font-medium">
                  {currencyFmt.format(variant.unitPrice)}
                </span>
                <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-medium">{currencyFmt.format(totalValue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {variant.skus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">SKU Code</th>
                  <th className="pb-2 pr-4 font-medium">Serial #</th>
                  <th className="pb-2 pr-4 font-medium">Barcode</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Grade</th>
                  <th className="pb-2 pr-4 font-medium">Location</th>
                  <th className="pb-2 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {variant.skus.map((s) => (
                  <tr key={s.sku} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        to={`/ims/stock-items/${itemId}/sku/${s.sku}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.sku}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.serialNumber}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.barcode}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge variant={SKU_STATUS_BADGE_MAP[s.status]}>
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td className="py-2 pr-4">{s.grade ?? '-'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{s.location}</td>
                    <td className="py-2">{formatDate(s.receivedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No individual SKUs tracked.</p>
        )}
      </CardContent>
    </Card>
  )
}
