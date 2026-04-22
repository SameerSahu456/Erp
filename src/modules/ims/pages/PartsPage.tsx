import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, GitBranch } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/BusinessMetricsTable'
import { mockParts } from '../data/parts'
import { mockPricing } from '../data/pricing'
import type { Part, VariantCondition } from '@/modules/wms/types'

const MOCK_PRODUCT_MANAGERS = ['Rahul Mehta', 'Vikram Singh', 'Priya Sharma']

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

function conditionVariant(c: VariantCondition | undefined): 'success' | 'info' | 'warning' | 'neutral' {
  if (c === 'New') return 'success'
  if (c === 'Refurbished') return 'info'
  if (c === 'New Pull') return 'warning'
  return 'neutral'
}

export default function PartsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [pmFilter, setPmFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'parent' | 'variant'>('all')
  const [showActive, setShowActive] = useState<'all' | 'active'>('active')

  const parentPriceLookup = useMemo(() => buildParentPriceLookup(), [])

  const categories = useMemo(
    () => Array.from(new Set(mockParts.map((p) => p.categoryName))).sort(),
    []
  )
  const brands = useMemo(
    () => Array.from(new Set(mockParts.map((p) => p.brand))).sort(),
    []
  )

  const filtered = useMemo(() => {
    return mockParts.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryName !== categoryFilter) return false
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false
      if (pmFilter !== 'all' && p.productManager !== pmFilter) return false
      if (typeFilter !== 'all') {
        const t = p.productType ?? 'parent'
        if (t !== typeFilter) return false
      }
      if (showActive === 'active' && !p.isActive) return false
      if (search) {
        const q = search.toLowerCase()
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesSku = p.sku.toLowerCase().includes(q)
        const matchesAlias = p.aliases.some((a) => a.toLowerCase().includes(q))
        if (!matchesName && !matchesSku && !matchesAlias) return false
      }
      return true
    })
  }, [search, categoryFilter, brandFilter, pmFilter, typeFilter, showActive])

  const tab: TabConfig = {
    id: 'parts',
    label: `Parts (${filtered.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'aliases', label: 'Alias' },
      { key: 'category', label: 'Category', sortable: true, filterable: true },
      { key: 'brand', label: 'Brand', sortable: true, filterable: true },
      { key: 'type', label: 'Type', sortable: true, filterable: true },
      { key: 'condition', label: 'Condition', sortable: true, filterable: true },
      { key: 'price', label: 'Price', sortable: true, align: 'right' },
      { key: 'assembly', label: 'Assembly', sortable: true, filterable: true },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
    ],
    data: filtered.map((p) => {
      const type = p.productType ?? 'parent'
      const price = priceForPart(p, parentPriceLookup)
      return {
        name: p.name,
        model: p.model ?? '-',
        aliases: p.aliases,
        category: p.categoryName,
        brand: p.brand,
        type: type === 'variant' ? 'Variant' : 'Parent',
        condition: p.condition ?? '-',
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
              <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
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
    <div className="space-y-6">
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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pmFilter} onValueChange={(v) => setPmFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {MOCK_PRODUCT_MANAGERS.map((pm) => (
              <SelectItem key={pm} value={pm}>{pm}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter((v ?? 'all') as typeof typeFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="variant">Variant</SelectItem>
          </SelectContent>
        </Select>

        <Select value={showActive} onValueChange={(v) => setShowActive((v ?? 'active') as 'all' | 'active')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search name, SKU, alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-96 flex-1 min-w-[300px]"
        />
      </div>

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
      />
    </div>
  )
}
