import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

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

const MOCK_PRODUCT_MANAGERS = ['Rahul Mehta', 'Vikram Singh', 'Priya Sharma']

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

// Build a price lookup: partId → { newBase, refurbBase, tags: { tag → { new, refurb } } }
interface PartPriceInfo {
  newBase: number | null
  refurbBase: number | null
  newTags: { tag: string; price: number }[]
  refurbTags: { tag: string; price: number }[]
}

function buildPriceLookup(): Map<string, PartPriceInfo> {
  const map = new Map<string, PartPriceInfo>()
  for (const entry of mockPricing) {
    let info = map.get(entry.partId)
    if (!info) {
      info = { newBase: null, refurbBase: null, newTags: [], refurbTags: [] }
      map.set(entry.partId, info)
    }
    if (entry.variant === 'new') {
      if (entry.tag === null) info.newBase = entry.sellPrice
      else info.newTags.push({ tag: entry.tag, price: entry.sellPrice })
    } else {
      if (entry.tag === null) info.refurbBase = entry.sellPrice
      else info.refurbTags.push({ tag: entry.tag, price: entry.sellPrice })
    }
  }
  return map
}

export default function PartsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [pmFilter, setPmFilter] = useState('all')
  const [showActive, setShowActive] = useState<'all' | 'active'>('active')

  const priceLookup = useMemo(() => buildPriceLookup(), [])

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
  }, [search, categoryFilter, brandFilter, pmFilter, showActive])

  const tab: TabConfig = {
    id: 'parts',
    label: `Parts (${filtered.length})`,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'category', label: 'Category', sortable: true, filterable: true },
      { key: 'brand', label: 'Brand', sortable: true, filterable: true },
      { key: 'pm', label: 'PM', sortable: true },
      { key: 'newPrice', label: 'New Price' },
      { key: 'refurbPrice', label: 'Refurb Price' },
      { key: 'reorderLevel', label: 'Reorder Lvl', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', sortable: true, filterable: true },
    ],
    data: filtered.map((p) => {
      const prices = priceLookup.get(p.id)
      return {
        name: p.name,
        category: p.categoryName,
        brand: p.brand,
        pm: p.productManager ?? '-',
        newPrice: prices ?? null,
        refurbPrice: prices ?? null,
        reorderLevel: p.reorderLevel,
        status: p.isActive ? 'Active' : 'Inactive',
        _id: p.id,
      }
    }),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      const id = (row as Record<string, unknown>)._id as string
      return {
        display: (
          <Link to={`/ims/parts/${id}`} className="font-medium text-primary hover:underline">
            {value}
          </Link>
        ),
      }
    }
    if (key === 'newPrice') {
      const prices = value as PartPriceInfo | null
      if (!prices || (prices.newBase === null && prices.newTags.length === 0)) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <div className="space-y-0.5">
            {prices.newBase !== null && (
              <div className="font-medium tabular-nums">{currencyFmt.format(prices.newBase)}</div>
            )}
            {prices.newTags.length > 0 && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {prices.newTags.map((t) => (
                  <span key={t.tag} className="text-xs text-muted-foreground">
                    {t.tag}: <span className="tabular-nums">{currencyFmt.format(t.price)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      }
    }
    if (key === 'refurbPrice') {
      const prices = value as PartPriceInfo | null
      if (!prices || (prices.refurbBase === null && prices.refurbTags.length === 0)) {
        return { display: <span className="text-muted-foreground">-</span> }
      }
      return {
        display: (
          <div className="space-y-0.5">
            {prices.refurbBase !== null && (
              <div className="font-medium tabular-nums">{currencyFmt.format(prices.refurbBase)}</div>
            )}
            {prices.refurbTags.length > 0 && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {prices.refurbTags.map((t) => (
                  <span key={t.tag} className="text-xs text-muted-foreground">
                    {t.tag}: <span className="tabular-nums">{currencyFmt.format(t.price)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
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
          Parts / Products
        </h1>
        <Button render={<Link to="/ims/parts/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add Part
        </Button>
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
          placeholder="Search name, alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
      </div>

      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
      />
    </div>
  )
}
