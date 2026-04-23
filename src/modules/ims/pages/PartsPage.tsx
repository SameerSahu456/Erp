import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, GitBranch } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
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

  // Demo scope: only Servers + a curated set of laptops (the ones with variants so
  // the variant icon is visible). Interleaves variants directly under their parent
  // so they show on the first page instead of clustering at the end.
  const filtered = useMemo(() => {
    const FEATURED_LAPTOP_IDS = new Set(['PART-001', 'PART-002', 'PART-004'])
    const active = mockParts.filter((p) => p.isActive)
    const variantsByParent = new Map<string, Part[]>()
    for (const p of active) {
      if ((p.productType ?? 'parent') === 'variant' && p.parentPartId) {
        const bucket = variantsByParent.get(p.parentPartId) ?? []
        bucket.push(p)
        variantsByParent.set(p.parentPartId, bucket)
      }
    }
    const parents = active.filter(
      (p) =>
        (p.productType ?? 'parent') === 'parent' &&
        (p.categoryName === 'Servers' || FEATURED_LAPTOP_IDS.has(p.id)),
    )
    // HPE DL360 Gen11 first (it + its 3 variants lead page 1), then other Servers,
    // then the featured laptops.
    parents.sort((a, b) => {
      const aFeatured = a.id === 'PART-022' ? 0 : 1
      const bFeatured = b.id === 'PART-022' ? 0 : 1
      if (aFeatured !== bFeatured) return aFeatured - bFeatured
      const aServer = a.categoryName === 'Servers' ? 0 : 1
      const bServer = b.categoryName === 'Servers' ? 0 : 1
      return aServer - bServer
    })
    const result: Part[] = []
    for (const parent of parents) {
      result.push(parent)
      const kids = variantsByParent.get(parent.id)
      if (kids) result.push(...kids)
    }
    return result
  }, [])

  const tab: TabConfig = {
    id: 'parts',
    label: `Parts (${filtered.length})`,
    columns: [
      { key: 'name', label: 'Part No', sortable: true },
      { key: 'condition', label: 'Condition', sortable: true, filterable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'aliases', label: 'Alias' },
      { key: 'category', label: 'Category', sortable: true, filterable: true },
      { key: 'brand', label: 'Brand', sortable: true, filterable: true },
      { key: 'type', label: 'Type', sortable: true, filterable: true },
      { key: 'qty', label: 'Qty', sortable: true, align: 'right' },
      { key: 'price', label: 'Price', sortable: true, align: 'right' },
      { key: 'assembly', label: 'Assembly', sortable: true, filterable: true },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
    ],
    data: filtered.map((p) => {
      const type = p.productType ?? 'parent'
      const price = priceForPart(p, parentPriceLookup)
      const qty = qtyForPart(p)
      return {
        name: p.name,
        model: p.model ?? '-',
        aliases: p.aliases,
        category: p.categoryName,
        brand: p.brand,
        type: type === 'variant' ? 'Variant' : 'Parent',
        condition: p.condition ?? '-',
        qty: qty ?? null,
        price: price ?? null,
        assembly: p.assemblyType ?? '-',
        status: p.isActive ? 'Active' : 'Inactive',
        _id: p.id,
        _parentPartId: p.parentPartId,
        _productType: type,
      }
    }),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      const id = (row as Record<string, unknown>)._id as string
      const productType = (row as Record<string, unknown>)._productType as string
      return {
        display: (
          <div className="flex items-center gap-2">
            {productType === 'variant' && (
              <span
                title="Variant"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <GitBranch className="size-3" />
              </span>
            )}
            <Link to={`/ims/parts/${id}`} className="font-medium text-primary hover:underline">
              {value}
            </Link>
          </div>
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
    if (key === 'model') {
      if (value === '-' || value == null) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: <span className="text-sm">{String(value)}</span>,
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
    if (key === 'type' && typeof value === 'string') {
      const isVariant = value === 'Variant'
      return {
        display: (
          <StatusBadge variant={isVariant ? 'info' : 'neutral'}>{value}</StatusBadge>
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
    <div className="space-y-3 bmt-search-lg">
      <div className="flex items-center justify-between">
        <h1 className="cpt-page-title">
          Parts
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link to="/ims/parts/new?type=variant" />}>
            <GitBranch className="mr-1.5 size-4" />
            Add Variant
          </Button>
          <Button nativeButton={false} render={<Link to="/ims/parts/new" />}>
            <Plus className="mr-1.5 size-4" />
            Add Part
          </Button>
        </div>
      </div>

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        persistKey="ims-parts"
        onRowClick={(row) => navigate(`/ims/parts/${row._id}`)}
      />
    </div>
  )
}
