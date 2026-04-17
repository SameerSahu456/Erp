import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '@/modules/crm/components/EntityHeader'
import {
  mockComponentMovements,
  type ComponentMovement,
} from '../data/component-movements'

const MOVEMENT_BADGE: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  INSTALLED: 'success',
  REMOVED: 'warning',
  SWAPPED: 'info',
  TRANSFERRED: 'neutral',
}

const MOVEMENT_TYPES = ['All', 'INSTALLED', 'REMOVED', 'SWAPPED', 'TRANSFERRED'] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DataCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="px-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  )
}

export default function ComponentMovementHistoryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(() => {
    const sorted = [...mockComponentMovements].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return sorted.filter((m) => {
      if (typeFilter !== 'All' && m.movementType !== typeFilter) return false

      if (search) {
        const q = search.toLowerCase()
        if (
          !m.itemName.toLowerCase().includes(q) &&
          !m.itemSerial.toLowerCase().includes(q)
        )
          return false
      }

      if (fromDate) {
        const from = new Date(fromDate)
        if (new Date(m.timestamp) < from) return false
      }

      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        if (new Date(m.timestamp) > to) return false
      }

      return true
    })
  }, [search, typeFilter, fromDate, toDate])

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      installed: filtered.filter((m) => m.movementType === 'INSTALLED').length,
      removed: filtered.filter((m) => m.movementType === 'REMOVED').length,
      transferred: filtered.filter((m) => m.movementType === 'TRANSFERRED').length,
    }
  }, [filtered])

  function renderFromTo(m: ComponentMovement) {
    const from = m.fromRackName ?? '-'
    const to = m.toRackName ?? '-'
    return (
      <span>
        {from} <span className="text-muted-foreground">&rarr;</span> {to}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title="Component Movement History"
        subtitle="Track every install, removal, swap, and transfer"
        backHref="/wms"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DataCard title="Total Movements" value={stats.total} />
        <DataCard title="Installed" value={stats.installed} />
        <DataCard title="Removed" value={stats.removed} />
        <DataCard title="Transfers" value={stats.transferred} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by component name or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === 'All' ? 'All Types' : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[150px]"
            placeholder="From"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[150px]"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Date / Time
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Component
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Movement Type
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Parent Part
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Work Order
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                From &rarr; To
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Performed By
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Verified By
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                  No movements found.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2">
                    <div>{formatDate(m.timestamp)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(m.timestamp)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{m.itemName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {m.itemSerial}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge variant={MOVEMENT_BADGE[m.movementType]}>
                      {m.movementType}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    {m.parentItemName ?? '-'}
                  </td>
                  <td className="px-3 py-2">
                    {m.workOrderNumber ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {renderFromTo(m)}
                  </td>
                  <td className="px-3 py-2">{m.performedByName}</td>
                  <td className="px-3 py-2">{m.verifiedByName ?? '-'}</td>
                  <td className="max-w-[220px] truncate px-3 py-2" title={m.notes}>
                    {m.notes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
