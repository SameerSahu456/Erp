import { useCallback, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockPricing, mockPriceHistory } from '../data/pricing'
import type { PriceEntry, PriceHistory } from '../data/pricing'

const TAG_OPTIONS = ['Base Price', 'NP', 'NPL', 'NBI', 'Box Pack'] as const

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function PricingPage() {
  const [pricing, setPricing] = useState<PriceEntry[]>(() => [...mockPricing])
  const [, setHistory] = useState<PriceHistory[]>(() => [...mockPriceHistory])

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [oemFilter, setOemFilter] = useState('all')
  const [variantFilter, setVariantFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const editInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () => Array.from(new Set(pricing.map((p) => p.categoryName))).sort(),
    [pricing],
  )

  const oems = useMemo(
    () => Array.from(new Set(pricing.map((p) => p.oemName))).sort(),
    [pricing],
  )

  const filtered = useMemo(() => {
    return pricing.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryName !== categoryFilter) return false
      if (oemFilter !== 'all' && p.oemName !== oemFilter) return false
      if (variantFilter !== 'all' && p.variant !== variantFilter) return false
      if (tagFilter !== 'all') {
        if (tagFilter === 'Base Price' && p.tag !== null) return false
        if (tagFilter !== 'Base Price' && p.tag !== tagFilter) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (!p.partName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [pricing, search, categoryFilter, oemFilter, variantFilter, tagFilter])

  const startEditing = useCallback((entry: PriceEntry) => {
    setEditingId(entry.id)
    setEditValue(String(entry.sellPrice))
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const savePrice = useCallback(
    (entryId: string) => {
      const newPrice = parseInt(editValue, 10)
      if (isNaN(newPrice) || newPrice < 0) {
        cancelEditing()
        return
      }

      setPricing((prev) =>
        prev.map((p) => {
          if (p.id !== entryId) return p
          if (p.sellPrice === newPrice) return p

          const historyEntry: PriceHistory = {
            id: `ph-${Date.now()}`,
            priceEntryId: entryId,
            oldPrice: p.sellPrice,
            newPrice,
            changedBy: 'Current User',
            changedAt: new Date().toISOString(),
            notes: 'Manual price update',
          }
          setHistory((h) => [historyEntry, ...h])

          toast.success('Price updated')

          return {
            ...p,
            sellPrice: newPrice,
            updatedBy: 'Current User',
            updatedAt: new Date().toISOString(),
          }
        }),
      )

      setEditingId(null)
      setEditValue('')
    },
    [editValue, cancelEditing],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="cpt-page-title">
          Pricing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage sell prices by Part, Variant, and Tag
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search part name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={oemFilter} onValueChange={(v) => setOemFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="OEM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OEMs</SelectItem>
            {oems.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={variantFilter} onValueChange={(v) => setVariantFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Variant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Variants</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="refurbished">Refurbished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={(v) => setTagFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {TAG_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table — flat, no accordion */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>OEM</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead className="text-right">Sell Price</TableHead>
              <TableHead>Updated By</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No pricing entries found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.partName}</TableCell>
                <TableCell>{entry.categoryName}</TableCell>
                <TableCell>{entry.oemName}</TableCell>
                <TableCell>
                  <StatusBadge
                    variant={entry.variant === 'new' ? 'success' : 'info'}
                  >
                    {entry.variant === 'new' ? 'New' : 'Refurbished'}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  {entry.tag ? (
                    <span className="text-sm">{entry.tag}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Base</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === entry.id ? (
                    <Input
                      ref={editInputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => savePrice(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') savePrice(entry.id)
                        if (e.key === 'Escape') cancelEditing()
                      }}
                      className="ml-auto h-8 w-28 text-right"
                    />
                  ) : (
                    <button
                      type="button"
                      className="inline-block rounded px-2 py-0.5 text-right font-medium tabular-nums hover:bg-muted"
                      onClick={() => startEditing(entry)}
                    >
                      {currencyFmt.format(entry.sellPrice)}
                    </button>
                  )}
                </TableCell>
                <TableCell>{entry.updatedBy}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFmt.format(new Date(entry.updatedAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
