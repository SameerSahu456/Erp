import { useMemo } from 'react'
import { Plus, FileText, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Sparkles, Download, Eye, MoreHorizontal, Copy } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { ListPageShell } from '@/components/page'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { quotes } from '@/modules/crm/data/quotes'
import { toast } from 'sonner'

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(2)}Cr`
  if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`
  return `\u20B9${value.toLocaleString('en-IN')}`
}

const formatFullCurrency = (value: number) =>
  `\u20B9${value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const statusVariant: Record<string, StatusBadgeVariant> = {
  Draft: 'neutral',
  Sent: 'info',
  Accepted: 'success',
  Rejected: 'error',
  Expired: 'warning',
}

const statusIcon: Record<string, typeof FileText> = {
  Draft: FileText,
  Sent: Send,
  Accepted: CheckCircle2,
  Rejected: XCircle,
  Expired: AlertTriangle,
}

function QuotesPage() {
  const navigate = useNavigate()

  // Summary stats
  const stats = useMemo(() => {
    const total = quotes.length
    const totalValue = quotes.reduce((sum, q) => sum + q.total, 0)
    const draft = quotes.filter((q) => q.status === 'Draft').length
    const sent = quotes.filter((q) => q.status === 'Sent').length
    const accepted = quotes.filter((q) => q.status === 'Accepted').length
    const acceptedValue = quotes
      .filter((q) => q.status === 'Accepted')
      .reduce((sum, q) => sum + q.total, 0)
    const rejected = quotes.filter((q) => q.status === 'Rejected').length
    const expired = quotes.filter((q) => q.status === 'Expired').length
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0
    return { total, totalValue, draft, sent, accepted, acceptedValue, rejected, expired, conversionRate }
  }, [])

  // Table data
  const allRows = useMemo(
    () =>
      quotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        accountName: q.accountName,
        leadName: q.leadName || '-',
        quoteType: q.quoteType ?? 'item-based',
        total: q.total,
        status: q.status,
        version: q.version ?? 1,
        items: q.lineItems?.length ?? 0,
        validUntil: q.validUntil,
        createdAt: q.createdAt,
        _status: q.status,
      })),
    [],
  )

  const columns = [
    { key: 'quoteNumber', label: 'Quote #', sortable: true },
    { key: 'accountName', label: 'Account', sortable: true },
    { key: 'leadName', label: 'Lead' },
    { key: 'quoteType', label: 'Type' },
    { key: 'items', label: 'Items', align: 'center' as const },
    { key: 'total', label: 'Total', sortable: true, align: 'right' as const },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'version', label: 'Ver.', align: 'center' as const },
    { key: 'validUntil', label: 'Valid Until', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
    { key: 'actions', label: '', align: 'center' as const },
  ]

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: 'all',
        label: `All (${allRows.length})`,
        columns,
        data: allRows,
      },
      {
        id: 'draft',
        label: `Draft (${stats.draft})`,
        columns,
        data: allRows.filter((r) => r._status === 'Draft'),
      },
      {
        id: 'sent',
        label: `Sent (${stats.sent})`,
        columns,
        data: allRows.filter((r) => r._status === 'Sent'),
      },
      {
        id: 'accepted',
        label: `Accepted (${stats.accepted})`,
        columns,
        data: allRows.filter((r) => r._status === 'Accepted'),
      },
      {
        id: 'rejected',
        label: `Rejected (${stats.rejected})`,
        columns,
        data: allRows.filter((r) => r._status === 'Rejected'),
      },
    ],
    [allRows, stats],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'quoteNumber' && typeof value === 'string') {
      return {
        display: (
          <Link
            to={`/crm/quotes/${row['id']}/edit`}
            className="text-primary hover:underline font-medium"
          >
            {value}
          </Link>
        ),
      }
    }
    if (key === 'quoteType' && typeof value === 'string') {
      return {
        display: (
          <Badge variant="outline" className="text-xs">
            {value === 'item-based' ? 'Item' : 'Description'}
          </Badge>
        ),
      }
    }
    if (key === 'total' && typeof value === 'number') {
      return {
        display: (
          <span className="font-semibold tabular-nums">{formatCurrency(value)}</span>
        ),
      }
    }
    if (key === 'status' && typeof value === 'string') {
      const variant = statusVariant[value] ?? 'neutral'
      return {
        display: <StatusBadge variant={variant}>{value}</StatusBadge>,
      }
    }
    if (key === 'version') {
      const ver = value as number
      return {
        display: (
          <Badge variant="outline" className="text-xs">
            v{ver}
          </Badge>
        ),
      }
    }
    if (key === 'validUntil' && typeof value === 'string') {
      const isExpired = new Date(value) < new Date()
      return {
        display: (
          <span className={isExpired ? 'text-destructive' : ''}>
            {formatDate(value)}
          </span>
        ),
      }
    }
    if (key === 'createdAt' && typeof value === 'string') {
      return { display: formatDate(value) }
    }
    if (key === 'items') {
      return {
        display: (
          <span className="text-muted-foreground">{String(value)}</span>
        ),
      }
    }
    if (key === 'actions') {
      const quoteId = row['id'] as string
      const status = row['_status'] as string
      return {
        display: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/crm/quotes/${quoteId}/edit`)}>
                <Eye className="size-4 mr-2" />
                View / Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success('Quote duplicated')}>
                <Copy className="size-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success('PDF downloading...')}>
                <Download className="size-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              {status === 'Draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.success('Quote sent!')}>
                    <Send className="size-4 mr-2" />
                    Send Quote
                  </DropdownMenuItem>
                </>
              )}
              {status === 'Accepted' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/crm/sales-orders/new?quoteId=${quoteId}`)}>
                    <CheckCircle2 className="size-4 mr-2" />
                    Convert to Sales Order
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }
    }
    // Row-level styling
    const status = row['status']
    if (status === 'Rejected' || status === 'Expired') {
      return { className: 'text-muted-foreground' }
    }
    return null
  }

  const kpiStats = [
    {
      label: 'Total Quotes',
      value: stats.total,
      icon: FileText,
      sub: `${formatFullCurrency(stats.totalValue)} value`,
      accent: 'primary' as const,
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: Clock,
      sub: 'pending review',
      accent: 'warning' as const,
    },
    {
      label: 'Sent',
      value: stats.sent,
      icon: Send,
      sub: 'awaiting response',
      accent: 'info' as const,
    },
    {
      label: 'Accepted',
      value: stats.accepted,
      icon: CheckCircle2,
      sub: formatCurrency(stats.acceptedValue),
      accent: 'success' as const,
    },
    {
      label: 'Win Rate',
      value: `${stats.conversionRate}%`,
      icon: Sparkles,
      sub: 'conversion',
      accent: 'teal' as const,
    },
  ]

  return (
    <ListPageShell
      title="Quotes"
      subtitle="Manage quotations, track versions, and convert accepted quotes into sales orders."
      breadcrumbs={[{ label: 'CRM' }, { label: 'Quotes' }]}
      actions={
        <>
          <Button variant="outline" onClick={() => navigate('/crm/quote-builder')}>
            <Sparkles className="size-4 mr-1.5" />
            Quote Builder
          </Button>
          <Button onClick={() => navigate('/crm/quotes/new')}>
            <Plus className="size-4 mr-1.5" />
            Create Quote
          </Button>
        </>
      }
      stats={<StatsRow stats={kpiStats} />}
    >
      <BusinessMetricsTable
        className="bmt-search-wide"
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        persistKey="crm-quotes"
        onRowClick={(row) => navigate(`/crm/quotes/${row.id}/edit`)}
        emptyState={{
          title: 'No quotes yet',
          description: 'Draft a quote directly or use the Quote Builder for guided creation.',
          action: {
            label: 'Create Quote',
            onClick: () => navigate('/crm/quotes/new'),
          },
        }}
      />
    </ListPageShell>
  )
}

export default QuotesPage
