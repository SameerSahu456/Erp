import { useMemo } from 'react'
import { Plus, FileText, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Sparkles, Download, Eye, MoreHorizontal, Copy } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BusinessMetricsTable } from '@/components/common/BusinessMetricsTable'
import type { TabConfig, CellFormatter } from '@/components/common/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusBadgeVariant } from '@/components/common/StatusBadge'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="cpt-page-title">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage quotations, track versions, and convert to sales orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/crm/quote-builder')}>
            <Sparkles className="size-4 mr-1.5" />
            Quote Builder
          </Button>
          <Button onClick={() => navigate('/crm/quotes/new')}>
            <Plus className="size-4 mr-1.5" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Total Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatFullCurrency(stats.totalValue)} value
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.draft}</p>
            <p className="text-xs text-muted-foreground mt-0.5">pending review</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Send className="size-3.5" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            <p className="text-xs text-muted-foreground mt-0.5">awaiting response</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(stats.acceptedValue)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-normal flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Table */}
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        pageSize={10}
        onRowClick={(row) => navigate(`/crm/quotes/${row.id}/edit`)}
      />
    </div>
  )
}

export default QuotesPage
