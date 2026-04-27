import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { XCircle, Search, X, Filter } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { Badge } from '@/components/ui/badge'
import { ListPageShell } from '@/components/page'

import { leads } from '@/modules/crm/data/leads'

const formatCurrency = (value: number) =>
  `₹${(value / 100000).toFixed(1)}L`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function RejectedLeadsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const rejectedLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (l.stage !== 'Rejected') return false
      if (q) {
        const haystack = `${l.name} ${l.company} ${l.rejectionReason ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (ownerFilter !== 'all' && l.owner !== ownerFilter) return false
      if (dateFrom && l.rejectedAt && l.rejectedAt < dateFrom) return false
      if (dateTo && l.rejectedAt && l.rejectedAt > dateTo) return false
      return true
    })
  }, [search, ownerFilter, dateFrom, dateTo])

  const owners = useMemo(() => {
    const set = new Set(leads.filter((l) => l.stage === 'Rejected').map((l) => l.owner))
    return Array.from(set).sort()
  }, [])

  const activeFilterCount =
    (ownerFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

  function clearFilters() {
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

  const searchBar = (
    <div className="flex items-center gap-2">
      <div className="relative max-w-sm flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search rejected leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 pr-8 text-[13px]"
        />
        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch('')}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Button
        variant={filtersOpen ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFiltersOpen((v) => !v)}
        className="h-8 text-[13px]"
      >
        <Filter className="size-4 mr-1" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  )

  const filterPanel = (
    <aside className="w-60 shrink-0 space-y-4 rounded-md border bg-card p-4 h-fit">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Owner</label>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-full h-8 text-[13px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner} value={owner}>{owner}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full h-8 text-[13px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full h-8 text-[13px]"
        />
      </div>
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full h-8 text-[13px]"
        >
          Clear all
        </Button>
      )}
    </aside>
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
      toolbar={searchBar}
    >
      <div className="flex gap-3">
        {filtersOpen && filterPanel}
        <div className="flex-1 min-w-0">
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
        </div>
      </div>
    </ListPageShell>
  )
}

export default RejectedLeadsPage
