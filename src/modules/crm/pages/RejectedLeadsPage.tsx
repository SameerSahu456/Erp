import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { XCircle, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { Badge } from '@/components/ui/badge'
import { ListPageShell } from '@/components/page'

import { leads } from '@/modules/crm/data/leads'

const formatCurrency = (value: number) =>
  `\u20B9${(value / 100000).toFixed(1)}L`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function RejectedLeadsPage() {
  const navigate = useNavigate()
  const [reasonFilter, setReasonFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const rejectedLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.stage !== 'Rejected') return false
      if (reasonFilter && !l.rejectionReason?.toLowerCase().includes(reasonFilter.toLowerCase())) return false
      if (ownerFilter !== 'all' && l.owner !== ownerFilter) return false
      if (dateFrom && l.rejectedAt && l.rejectedAt < dateFrom) return false
      if (dateTo && l.rejectedAt && l.rejectedAt > dateTo) return false
      return true
    })
  }, [reasonFilter, ownerFilter, dateFrom, dateTo])

  const owners = useMemo(() => {
    const set = new Set(leads.filter((l) => l.stage === 'Rejected').map((l) => l.owner))
    return Array.from(set).sort()
  }, [])

  const hasActiveFilters = reasonFilter || ownerFilter !== 'all' || dateFrom || dateTo

  function clearFilters() {
    setReasonFilter('')
    setOwnerFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const tab: TabConfig = {
    id: 'rejected',
    label: 'Rejected Leads',
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'rejectionReason', label: 'Rejection Reason', sortable: false },
      { key: 'rejectedAt', label: 'Rejected Date', sortable: true },
      { key: 'value', label: 'Value', sortable: true, align: 'right' },
      { key: 'categories', label: 'Categories', sortable: false },
    ],
    data: rejectedLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      owner: l.owner,
      rejectionReason: l.rejectionReason ?? '',
      rejectedAt: l.rejectedAt ?? '',
      value: l.value,
      categories: l.categories.join(', '),
    })),
  }

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'name' && typeof value === 'string') {
      return {
        display: (
          <Link to={`/crm/leads/${row['id']}`} className="text-primary hover:underline font-medium">
            {value}
          </Link>
        ),
      }
    }
    if (key === 'value' && typeof value === 'number') {
      return { display: formatCurrency(value) }
    }
    if (key === 'rejectedAt' && typeof value === 'string' && value) {
      return { display: formatDate(value) }
    }
    if (key === 'rejectionReason' && typeof value === 'string') {
      return {
        display: (
          <span className="text-sm text-muted-foreground line-clamp-2">{value}</span>
        ),
      }
    }
    if (key === 'categories' && typeof value === 'string') {
      return {
        display: (
          <div className="flex flex-wrap gap-1">
            {value.split(', ').map((cat) => (
              <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
            ))}
          </div>
        ),
      }
    }
    return null
  }

  const toolbar = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search rejection reason..."
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Owners</SelectItem>
          {owners.map((owner) => (
            <SelectItem key={owner} value={owner}>{owner}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="From"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          placeholder="To"
        />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )

  return (
    <ListPageShell
      title="Rejected Leads"
      subtitle="Leads that were marked as lost — review reasons and reactivate if needed."
      breadcrumbs={[{ label: 'CRM' }, { label: 'Leads', href: '/crm/leads' }, { label: 'Rejected' }]}
      badges={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[11.5px] font-medium text-destructive">
          <XCircle className="size-3.5" />
          {rejectedLeads.length}
        </span>
      }
      toolbar={toolbar}
    >
      <BusinessMetricsTable
        tabs={[tab]}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="crm-rejected-leads"
        onRowClick={(row) => navigate(`/crm/leads/${row.id}`)}
        emptyState={{
          title: 'No rejected leads',
          description: 'Leads you mark as lost will appear here for review and reactivation.',
        }}
      />
    </ListPageShell>
  )
}

export default RejectedLeadsPage
