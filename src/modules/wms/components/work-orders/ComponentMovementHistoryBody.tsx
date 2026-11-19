import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedSerial } from '@/components/common/display/TruncatedSerial'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import {
  mockComponentMovements,
  type ComponentMovement,
} from '../../data/component-movements'
import { formatIST_date, formatIST_time } from "@shared/lib/date"
import { COMPONENT_MOVEMENT_HISTORY_STRINGS } from './component-movement-history.strings'


const MOVEMENT_BADGE: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  INSTALLED: 'success',
  REMOVED: 'warning',
  SWAPPED: 'info',
  TRANSFERRED: 'neutral',
}

const MOVEMENT_TYPES = ['All', 'INSTALLED', 'REMOVED', 'SWAPPED', 'TRANSFERRED'] as const

function formatDate(iso: string): string {
  return formatIST_date(iso)
}

function formatTime(iso: string): string {
  return formatIST_time(iso)
}

function DataCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="px-4">
      <Typography variant="helper">{title}</Typography>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  )
}


export function ComponentMovementHistoryBody() {
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
    const from = m.fromRackName ?? '—'
    const to = m.toRackName ?? '—'
    return (
      <span>
        {from} <span className="text-muted-foreground">&rarr;</span> {to}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <EntityHeader
        title={COMPONENT_MOVEMENT_HISTORY_STRINGS.header.title}
        subtitle={COMPONENT_MOVEMENT_HISTORY_STRINGS.header.subtitle}
        backHref="/wms"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DataCard title={COMPONENT_MOVEMENT_HISTORY_STRINGS.stats.total} value={stats.total} />
        <DataCard title={COMPONENT_MOVEMENT_HISTORY_STRINGS.stats.installed} value={stats.installed} />
        <DataCard title={COMPONENT_MOVEMENT_HISTORY_STRINGS.stats.removed} value={stats.removed} />
        <DataCard title={COMPONENT_MOVEMENT_HISTORY_STRINGS.stats.transfers} value={stats.transferred} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'All')}>
          <SelectTrigger className="w-[180px]">
            {/* The 'All' sentinel would otherwise print as "All" (PAGE-UI §7.2). */}
            <SelectValue placeholder={COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.typePlaceholder}>
              {typeFilter === 'All'
                ? COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.allTypes
                : typeFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MOVEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === 'All' ? COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.allTypes : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <DatePicker
            value={fromDate}
            onChange={setFromDate}
            className="w-[150px]"
            placeholder={COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.fromPlaceholder}
          />
          <Typography variant="body" tone="muted" asChild><span>{COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.rangeSeparator}</span></Typography>
          <DatePicker
            value={toDate}
            onChange={setToDate}
            className="w-[150px]"
            placeholder={COMPONENT_MOVEMENT_HISTORY_STRINGS.filters.toPlaceholder}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-14 px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.srNo}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.dateTime}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.component}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.movementType}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.parentPart}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.workOrder}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.fromTo}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.performedBy}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.verifiedBy}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {COMPONENT_MOVEMENT_HISTORY_STRINGS.columns.notes}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  {COMPONENT_MOVEMENT_HISTORY_STRINGS.empty}
                </td>
              </tr>
            ) : (
              filtered.map((m, i) => (
                <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div>{formatDate(m.timestamp)}</div>
                    <Typography variant="helper" asChild>
                      <div>{formatTime(m.timestamp)}</div>
                    </Typography>
                  </td>
                  <td className="px-3 py-2">
                    <div>{m.itemName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      <TruncatedSerial value={m.itemSerial} mono={false} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge variant={MOVEMENT_BADGE[m.movementType]}>
                      {m.movementType}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    {m.parentItemName ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {m.workOrderNumber ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {renderFromTo(m)}
                  </td>
                  <td className="px-3 py-2">{m.performedByName}</td>
                  <td className="px-3 py-2">{m.verifiedByName ?? '—'}</td>
                  <td className="max-w-[220px] px-3 py-2">
                    <TruncatedText value={m.notes} className="max-w-full" />
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

