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

const MOCK_PRODUCT_MANAGERS = ['Rahul Mehta', 'Vikram Singh', 'Priya Sharma']

export default function PartsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [pmFilter, setPmFilter] = useState('all')
  const [showActive, setShowActive] = useState<'all' | 'active'>('active')

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
      { key: 'sku', label: 'SKU', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'subcategory', label: 'Subcategory', sortable: true },
      { key: 'brand', label: 'Brand', sortable: true },
      { key: 'pm', label: 'PM', sortable: true },
      { key: 'aliases', label: 'Aliases' },
      { key: 'reorderLevel', label: 'Reorder Lvl', sortable: true, align: 'right' },
      { key: 'status', label: 'Status', sortable: true },
    ],
    data: filtered.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.categoryName,
      subcategory: p.subcategoryName ?? '-',
      brand: p.brand,
      pm: p.productManager ?? '-',
      aliases: p.aliases,
      reorderLevel: p.reorderLevel,
      status: p.isActive ? 'Active' : 'Inactive',
      _id: p.id,
    })),
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
    if (key === 'aliases' && Array.isArray(value)) {
      const aliases = value as string[]
      const shown = aliases.slice(0, 2)
      const remaining = aliases.length - 2
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {shown.map((a) => (
              <span key={a} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                {a}
              </span>
            ))}
            {remaining > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{remaining}
              </span>
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
        <h1 className="font-display text-2xl font-semibold tracking-tight">
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
          placeholder="Search name, SKU, alias..."
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
