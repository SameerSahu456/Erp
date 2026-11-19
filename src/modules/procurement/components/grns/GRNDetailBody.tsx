import { useParams, Link } from 'react-router-dom'
import {
  Package,
  Calendar,
  Hash,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'

import { mockGRNMatches } from '@/modules/procurement/data/grn-matching'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import { formatIST_date } from "@shared/lib/date"
import { formatINR } from '@/lib/currency'
import { GRN_STRINGS } from './grns.strings'
import { getGRNStatusVariant } from '../../constants/grn-status'


export const formatDate = (dateStr?: string) =>
  dateStr
    ? formatIST_date(dateStr)
    : '-'

export { getGRNStatusVariant }


export function GRNDetailBody() {
  const { id } = useParams<{ id: string }>()

  const entry = mockGRNMatches.find((g) => g.id === id)

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold">{GRN_STRINGS.notFound.heading}</h2>
        <Typography variant="body" tone="muted" asChild>
          <p>
            {GRN_STRINGS.notFound.description}
          </p>
        </Typography>
        <Button variant="outline" render={<Link to="/procurement/grn-matching" />}>
          {GRN_STRINGS.notFound.backButton}
        </Button>
      </div>
    )
  }

  const po = mockPurchaseOrders.find((p) => p.id === entry.poId)
  const poItem = po?.items.find((i) => i.id === entry.poItemId)

  const matchPct = entry.qtyOrdered > 0
    ? Math.min(100, Math.round((entry.qtyReceived / entry.qtyOrdered) * 100))
    : 0
  const isDiscrepancy = entry.status === 'Discrepancy' || entry.status === 'Over Received'

  // Receipt tab
  const receiptContent = (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-semibold">{GRN_STRINGS.receipt.sectionHeader}</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.receipt.part}</dt></Typography>
            <Typography variant="body-strong" className="mt-0.5" asChild><dd>{entry.partName}</dd></Typography>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.receipt.batchNumber}</dt></Typography>
            <dd className="mt-0.5 text-sm font-mono">{entry.batchNumber ?? '—'}</dd>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.receipt.receivedDate}</dt></Typography>
            <Typography variant="body" className="mt-0.5" asChild><dd>{formatDate(entry.receivedDate)}</dd></Typography>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.receipt.status}</dt></Typography>
            <dd className="mt-0.5">
              <StatusBadge variant={getGRNStatusVariant(entry.status)}>{entry.status}</StatusBadge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-semibold">{GRN_STRINGS.receipt.quantityMatchHeader}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <Typography variant="helper" asChild><p>{GRN_STRINGS.receipt.ordered}</p></Typography>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyOrdered}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <Typography variant="helper" asChild><p>{GRN_STRINGS.receipt.receivedQty}</p></Typography>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyReceived}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <Typography variant="helper" asChild><p>{GRN_STRINGS.receipt.pendingQty}</p></Typography>
            <p className="text-2xl font-bold tabular-nums">{entry.qtyPending}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{GRN_STRINGS.receipt.fulfilment}</span>
            <span className="font-medium tabular-nums">{matchPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                matchPct === 100 ? 'bg-status-success-text'
                  : matchPct > 0 ? 'bg-status-warning-text'
                    : 'bg-muted-foreground/30'
              }`}
              style={{ width: `${matchPct}%` }}
            />
          </div>
        </div>
      </div>

      {entry.discrepancyNotes && (
        <div className="flex items-start gap-2.5 rounded-lg border border-status-error-text/20 bg-status-error-bg/50 p-4">
          <AlertTriangle className="mt-0.5 size-4 text-status-error-text" />
          <div>
            <p className="text-sm font-medium text-status-error-text">{GRN_STRINGS.receipt.discrepancyNotesLabel}</p>
            <p className="mt-1 text-sm text-status-error-text/80">{entry.discrepancyNotes}</p>
          </div>
        </div>
      )}
    </div>
  )

  // PO Reference tab
  const poRefContent = po ? (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{GRN_STRINGS.poRef.sectionHeader}</h3>
          <Link
            to={`/procurement/po/${po.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {GRN_STRINGS.poRef.viewPo}
            <ExternalLink className="size-3" />
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.poNumber}</dt></Typography>
            <dd className="mt-0.5 text-sm font-mono">{po.poNumber}</dd>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.vendor}</dt></Typography>
            <Typography variant="body" className="mt-0.5" asChild><dd>{po.vendorName}</dd></Typography>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.expectedDelivery}</dt></Typography>
            <Typography variant="body" className="mt-0.5" asChild><dd>{formatDate(po.expectedDelivery)}</dd></Typography>
          </div>
          <div>
            <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.poStatus}</dt></Typography>
            <Typography variant="body" className="mt-0.5" asChild><dd>{po.status}</dd></Typography>
          </div>
        </dl>
      </div>

      {poItem && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-semibold">{GRN_STRINGS.poRef.lineItemHeader}</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.partSku}</dt></Typography>
              <dd className="mt-0.5 text-sm font-mono">{poItem.partSku}</dd>
            </div>
            <div>
              <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.unitPrice}</dt></Typography>
              <Typography variant="body" numeric className="mt-0.5" asChild><dd>{formatINR(poItem.unitPrice)}</dd></Typography>
            </div>
            <div>
              <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.poQuantity}</dt></Typography>
              <Typography variant="body" numeric className="mt-0.5" asChild><dd>{poItem.qtyOrdered}</dd></Typography>
            </div>
            <div>
              <Typography variant="helper" asChild><dt>{GRN_STRINGS.poRef.lineTotal}</dt></Typography>
              <Typography variant="body" numeric className="mt-0.5" asChild><dd>{formatINR(poItem.amount)}</dd></Typography>
            </div>
          </dl>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
      <Package className="size-8 text-muted-foreground/40 mb-3" />
      <Typography variant="body" tone="muted" asChild><p>{GRN_STRINGS.poRef.noPOAvailable}</p></Typography>
    </div>
  )

  // Activity tab
  const activityContent = (
    <div className="space-y-3">
      {entry.receivedDate && (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <div className="mt-0.5 rounded-full bg-status-success-bg p-1.5">
            <CheckCircle2 className="size-3.5 text-status-success-text" />
          </div>
          <div>
            <Typography variant="body-strong" asChild><p>{GRN_STRINGS.activity.goodsReceived}</p></Typography>
            <Typography variant="helper" asChild>
              <p>
                {GRN_STRINGS.activity.goodsReceivedDetail(entry.qtyReceived, entry.qtyOrdered)}
                {entry.batchNumber && GRN_STRINGS.activity.batchSuffix(entry.batchNumber)}
              </p>
            </Typography>
            <Typography variant="helper" className="mt-0.5" asChild><p>{formatDate(entry.receivedDate)}</p></Typography>
          </div>
        </div>
      )}
      {isDiscrepancy && (
        <div className="flex items-start gap-3 rounded-lg border border-status-error-text/20 bg-status-error-bg/30 p-3">
          <div className="mt-0.5 rounded-full bg-status-error-bg p-1.5">
            <AlertTriangle className="size-3.5 text-status-error-text" />
          </div>
          <div>
            <Typography variant="body-strong" asChild><p>{GRN_STRINGS.activity.discrepancyFlagged}</p></Typography>
            <Typography variant="helper" asChild>
              <p>
                {GRN_STRINGS.activity.statusChangedTo(entry.status)}
              </p>
            </Typography>
          </div>
        </div>
      )}
      {entry.qtyPending > 0 && entry.status !== 'Pending' && (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <div className="mt-0.5 rounded-full bg-status-warning-bg p-1.5">
            <ClipboardList className="size-3.5 text-status-warning-text" />
          </div>
          <div>
            <Typography variant="body-strong" asChild><p>{GRN_STRINGS.activity.pendingBalance}</p></Typography>
            <Typography variant="helper" asChild>
              <p>
                {GRN_STRINGS.activity.pendingBalanceDetail(entry.qtyPending)}
              </p>
            </Typography>
          </div>
        </div>
      )}
      {!entry.receivedDate && entry.status === 'Pending' && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ClipboardList className="size-8 text-muted-foreground/40 mb-3" />
          <Typography variant="body" tone="muted" asChild><p>{GRN_STRINGS.activity.noReceiptsLogged}</p></Typography>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: GRN_STRINGS.detailTabs.receipt.id, label: GRN_STRINGS.detailTabs.receipt.label, content: receiptContent },
    { id: GRN_STRINGS.detailTabs.po.id, label: GRN_STRINGS.detailTabs.po.label, content: poRefContent },
    { id: GRN_STRINGS.detailTabs.activity.id, label: GRN_STRINGS.detailTabs.activity.label, content: activityContent },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`${entry.id} — ${entry.partName}`}
        subtitle={entry.poNumber}
        status={{ label: entry.status, variant: getGRNStatusVariant(entry.status) }}
        backHref="/procurement/grn-matching"
      />

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Package className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{GRN_STRINGS.strip.orderedReceived}</p></Typography>
            <Typography variant="body-strong" numeric asChild><p>{entry.qtyOrdered} / {entry.qtyReceived}</p></Typography>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Hash className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{GRN_STRINGS.strip.batch}</p></Typography>
            <p className="text-sm font-mono truncate">{entry.batchNumber ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{GRN_STRINGS.strip.received}</p></Typography>
            <Typography variant="body-strong" asChild><p>{formatDate(entry.receivedDate)}</p></Typography>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <div className="rounded-md bg-primary/8 p-1.5">
            <CheckCircle2 className="size-3.5 text-primary" />
          </div>
          <div>
            <Typography variant="caption" asChild><p>{GRN_STRINGS.strip.fulfilment}</p></Typography>
            <p className="text-sm font-semibold tabular-nums">{matchPct}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailTabs cardContent tabs={tabs} defaultTab="receipt" />
        </div>

        <div className="space-y-4">
          {isDiscrepancy && (
            <div className="flex items-start gap-2.5 rounded-lg border border-status-error-text/20 bg-status-error-bg/50 p-3">
              <AlertTriangle className="mt-0.5 size-4 text-status-error-text" />
              <div>
                <p className="text-sm font-medium text-status-error-text">{GRN_STRINGS.discrepancyAlert.actionRequired}</p>
                <p className="text-xs text-status-error-text/80">
                  {GRN_STRINGS.discrepancyAlert.resolveHint(entry.status.toLowerCase())}
                </p>
              </div>
            </div>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle>{GRN_STRINGS.summary.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{GRN_STRINGS.summary.grnId}</dt>
                  <dd className="text-sm font-mono">{entry.id}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{GRN_STRINGS.summary.poNumber}</dt>
                  <dd className="text-sm">
                    <Link to={`/procurement/po/${entry.poId}`} className="font-mono text-primary hover:underline">
                      {entry.poNumber}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{GRN_STRINGS.summary.qtyOrdered}</dt>
                  <Typography variant="body-strong" numeric asChild><dd>{entry.qtyOrdered}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{GRN_STRINGS.summary.qtyReceived}</dt>
                  <Typography variant="body-strong" numeric asChild><dd>{entry.qtyReceived}</dd></Typography>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-ui text-muted-foreground">{GRN_STRINGS.summary.qtyPending}</dt>
                  <Typography variant="body-strong" numeric asChild><dd>{entry.qtyPending}</dd></Typography>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{GRN_STRINGS.quickActions.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entry.qtyPending > 0 && (
                  <Button size="sm" className="w-full">{GRN_STRINGS.quickActions.recordReceipt}</Button>
                )}
                {isDiscrepancy && (
                  <Button size="sm" variant="outline" className="w-full">{GRN_STRINGS.quickActions.raiseVendorQuery}</Button>
                )}
                <Button size="sm" variant="outline" className="w-full" render={<Link to={`/procurement/po/${entry.poId}`} />}>
                  {GRN_STRINGS.quickActions.viewPurchaseOrder}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


