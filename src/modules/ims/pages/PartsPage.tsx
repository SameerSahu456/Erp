import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ListPageShell } from '@/components/page'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockParts } from '../data/parts'
import { mockPricing } from '../data/pricing'
import { mockStockItems } from '../data/stock-items'
import type { Part, VariantCondition } from '@/modules/wms/types'

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

// Build a price lookup for parent parts: partId → { new, refurb }
// Used as a fallback when a variant-row does not carry its own sellPrice.
function buildParentPriceLookup(): Map<string, { new: number | null; refurb: number | null }> {
  const map = new Map<string, { new: number | null; refurb: number | null }>()
  for (const entry of mockPricing) {
    if (entry.tag !== null) continue // only base prices for list view
    let info = map.get(entry.partId)
    if (!info) {
      info = { new: null, refurb: null }
      map.set(entry.partId, info)
    }
    if (entry.variant === 'new') info.new = entry.sellPrice
    else info.refurb = entry.sellPrice
  }
  return map
}

function priceForPart(
  part: Part,
  parentPriceLookup: Map<string, { new: number | null; refurb: number | null }>,
): number | null {
  if (part.sellPrice != null) return part.sellPrice
  if (part.productType === 'variant' && part.parentPartId) {
    const parent = parentPriceLookup.get(part.parentPartId)
    if (part.condition === 'Refurbished') return parent?.refurb ?? parent?.new ?? null
    return parent?.new ?? null
  }
  const own = parentPriceLookup.get(part.id)
  return own?.new ?? own?.refurb ?? null
}

function qtyForPart(part: Part): number | null {
  const stockItem = mockStockItems.find(
    (si) =>
      si.name === part.name ||
      si.sku.includes(part.sku.split('-').pop() ?? '')
  )
  if (!stockItem) return null
  const variants = part.condition
    ? stockItem.variants.filter((v) => v.type === part.condition)
    : stockItem.variants
  return variants.reduce((sum, v) => sum + v.quantity, 0)
}

function conditionVariant(c: VariantCondition | undefined): 'success' | 'info' | 'warning' | 'neutral' {
  if (c === 'New') return 'success'
  if (c === 'Refurbished') return 'info'
  if (c === 'New Pull') return 'warning'
  return 'neutral'
}

export default function PartsPage() {
  const navigate = useNavigate()

  const parentPriceLookup = useMemo(() => buildParentPriceLookup(), [])

  // Demo scope: featured parents + their variants so the Type column is meaningful.
  const filtered = useMemo(() => {
    const FEATURED_LAPTOP_IDS = new Set(['PART-001', 'PART-002', 'PART-004'])
    const parents = mockParts.filter(
      (p) =>
        p.isActive &&
        (p.productType ?? 'parent') === 'parent' &&
        (p.categoryName === 'Servers' || FEATURED_LAPTOP_IDS.has(p.id)),
    )
    parents.sort((a, b) => {
      const aFeatured = a.id === 'PART-022' ? 0 : 1
      const bFeatured = b.id === 'PART-022' ? 0 : 1
      if (aFeatured !== bFeatured) return aFeatured - bFeatured
      const aServer = a.categoryName === 'Servers' ? 0 : 1
      const bServer = b.categoryName === 'Servers' ? 0 : 1
      return aServer - bServer
    })
    const featuredIds = new Set(parents.map((p) => p.id))
    const variants = mockParts.filter(
      (p) =>
        p.isActive &&
        p.productType === 'variant' &&
        p.parentPartId != null &&
        featuredIds.has(p.parentPartId),
    )
    // Group variants under their parent by interleaving in parent order.
    const byParent = new Map<string, Part[]>()
    for (const v of variants) {
      if (!v.parentPartId) continue
      const arr = byParent.get(v.parentPartId) ?? []
      arr.push(v)
      byParent.set(v.parentPartId, arr)
    }
    const ordered: Part[] = []
    for (const parent of parents) {
      ordered.push(parent)
      const kids = byParent.get(parent.id)
      if (kids) ordered.push(...kids)
    }
    return ordered
  }, [])

  const tab: TabConfig = {
    id: 'parts',
    label: `Parts (${filtered.length})`,
    columns: [
      { key: 'sku', label: 'Part No', sortable: true },
      { key: 'name', label: 'Part Name', sortable: true },
      { key: 'type', label: 'Type', sortable: true, filterable: true },
      { key: 'condition', label: 'Condition', sortable: true, filterable: true },
      { key: 'aliases', label: 'Alias' },
      { key: 'category', label: 'Category', sortable: true, filterable: true },
      { key: 'brand', label: 'Brand', sortable: true, filterable: true },
      { key: 'qty', label: 'Qty', sortable: true, align: 'right' },
      { key: 'price', label: 'Price', sortable: true, align: 'right' },
      { key: 'assembly', label: 'Assembly', sortable: true, filterable: true },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
    ],
    data: filtered.map((p) => {
      const price = priceForPart(p, parentPriceLookup)
      const qty = qtyForPart(p)
      const isVariant = p.productType === 'variant'
      return {
        sku: p.sku,
        name: p.name,
        type: isVariant ? 'Variant' : 'Parent',
        aliases: p.aliases,
        category: p.categoryName,
        brand: p.brand,
        condition: p.condition ?? '-',
        qty: qty ?? null,
        price: price ?? null,
        assembly: p.assemblyType ?? '-',
        status: p.isActive ? 'Active' : 'Inactive',
        _id: p.id,
      }
    }),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'sku' && typeof value === 'string') {
      const id = (row as Record<string, unknown>)._id as string
      return {
        display: (
          <Link to={`/ims/parts/${id}`} className="font-mono text-xs text-primary hover:underline">
            {value}
          </Link>
        ),
      }
    }
    if (key === 'name' && typeof value === 'string') {
      return {
        display: <span className="font-medium">{value}</span>,
      }
    }
    if (key === 'type' && typeof value === 'string') {
      return {
        display: (
          <StatusBadge variant={value === 'Parent' ? 'info' : 'neutral'}>
            {value}
          </StatusBadge>
        ),
      }
    }
    if (key === 'aliases') {
      const list = value as string[]
      if (!list || list.length === 0) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 3).map((a) => (
              <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {a}
              </span>
            ))}
            {list.length > 3 && (
              <span className="text-xs text-muted-foreground">+{list.length - 3}</span>
            )}
          </div>
        ),
      }
    }
    if (key === 'condition') {
      if (value === '-' || value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <StatusBadge variant={conditionVariant(value as VariantCondition)}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }
    if (key === 'qty') {
      if (value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: <span className="tabular-nums">{String(value)}</span>,
      }
    }
    if (key === 'price') {
      if (value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <span className="font-medium tabular-nums">{currencyFmt.format(value as number)}</span>
        ),
      }
    }
    if (key === 'assembly') {
      if (value === '-' || value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <StatusBadge variant={value === 'Assembled' ? 'success' : 'warning'}>
            {String(value)}
          </StatusBadge>
        ),
      }
    }
    if (key === 'status' && typeof value === 'string') {
      return {
        display: (
          <StatusBadge variant={value === 'Active' ? 'success' : 'neutral'}>
            {value}
          </StatusBadge>
        ),
      }
    }
    return null
  }

  return (
    <ListPageShell
      title="Parts"
      subtitle="Master catalog of parts, their variants, and pricing."
      breadcrumbs={[{ label: 'IMS' }, { label: 'Parts' }]}
      actions={
        <Button nativeButton={false} render={<Link to="/ims/parts/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add Part
        </Button>
      }
    >
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          tabs={[tab]}
          cellFormatter={cellFormatter}
          persistKey="ims-parts"
          onRowClick={(row) => navigate(`/ims/parts/${row._id}`)}
          emptyState={{
            title: 'No parts yet',
            description: 'Add a part to start building your catalog and pricing.',
            action: {
              label: 'Add Part',
              onClick: () => navigate('/ims/parts/new'),
            },
          }}
        />
      </div>
    </ListPageShell>
  )
}
