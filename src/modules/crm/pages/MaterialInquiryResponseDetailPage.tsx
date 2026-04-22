import { useParams, Link } from 'react-router-dom'
import {
  Package,
  CalendarDays,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  ArrowUpRight,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EntityHeader } from '../components/EntityHeader'
import { materialInquiries } from '../data/material-inquiries'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function MaterialInquiryResponseDetailPage() {
  const { id: miId, responseId } = useParams<{ id: string; responseId: string }>()
  const mi = materialInquiries.find((m) => m.id === miId)
  const response = mi?.responses.find((r) => r.id === responseId)
  const item = response ? mi?.items.find((i) => i.id === response.inquiryItemId) : undefined

  if (!mi || !response || !item) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Response not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This response may have been removed or the link is invalid.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            render={<Link to={miId ? `/crm/material-inquiries/${miId}` : '/crm/material-inquiries'} />}
          >
            Back to Inquiry
          </Button>
        </div>
      </div>
    )
  }

  const status = response.pmStatus ?? 'Pending'
  const total = response.qtyAvailable * response.pricePerUnit
  const withinBudget = item.clientBudgetPerUnit
    ? response.pricePerUnit <= item.clientBudgetPerUnit
    : undefined
  const shortfall = Math.max(0, item.qtyRequested - response.qtyAvailable)
  const overBudgetAmount =
    item.clientBudgetPerUnit && response.pricePerUnit > item.clientBudgetPerUnit
      ? (response.pricePerUnit - item.clientBudgetPerUnit) * response.qtyAvailable
      : 0

  return (
    <div className="space-y-6">
      <EntityHeader
        title={`Response for ${mi.inquiryNumber}`}
        subtitle={`${item.item} · ${item.category}`}
        backHref={`/crm/material-inquiries/${mi.id}`}
        status={{
          label:
            status === 'Approved'
              ? 'Approved by PM'
              : status === 'Rejected'
              ? 'Rejected by PM'
              : 'Pending PM review',
          variant:
            status === 'Approved'
              ? 'success'
              : status === 'Rejected'
              ? 'error'
              : 'warning',
        }}
      />

      {/* Hero stats strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <HeroStat
          label="Qty Available"
          value={response.qtyAvailable.toString()}
          sub={`of ${item.qtyRequested} requested`}
          icon={<Package className="size-4" />}
        />
        <HeroStat
          label="Price / Unit"
          value={formatCurrency(response.pricePerUnit)}
          sub={
            withinBudget === true
              ? 'Within client budget'
              : withinBudget === false
              ? 'Over client budget'
              : undefined
          }
          subVariant={
            withinBudget === true ? 'success' : withinBudget === false ? 'warning' : undefined
          }
          icon={<IndianRupee className="size-4" />}
        />
        <HeroStat
          label="Total Value"
          value={formatCurrency(total)}
          sub={response.qtyAvailable + ' units'}
          icon={<IndianRupee className="size-4" />}
        />
        <HeroStat
          label="Available On"
          value={formatDate(response.availableDate)}
          sub={response.respondedBy}
          icon={<CalendarDays className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Coverage & gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="size-3.5" />
                </span>
                Coverage Against Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric label="Client Requested" value={`${item.qtyRequested} units`} />
                <Metric
                  label="This Response Covers"
                  value={`${response.qtyAvailable} units`}
                  tone={
                    response.qtyAvailable >= item.qtyRequested
                      ? 'success'
                      : response.qtyAvailable >= item.qtyRequested / 2
                      ? 'warning'
                      : 'default'
                  }
                />
                <Metric
                  label="Shortfall"
                  value={shortfall === 0 ? 'Fully covered' : `${shortfall} units`}
                  tone={shortfall === 0 ? 'success' : 'warning'}
                />
                {item.clientBudgetPerUnit && (
                  <>
                    <Metric
                      label="Client Budget / Unit"
                      value={formatCurrency(item.clientBudgetPerUnit)}
                    />
                    <Metric
                      label="Price Offered / Unit"
                      value={formatCurrency(response.pricePerUnit)}
                      tone={withinBudget ? 'success' : 'warning'}
                    />
                    <Metric
                      label={withinBudget ? 'Budget Headroom' : 'Over Budget By'}
                      value={
                        withinBudget
                          ? formatCurrency(
                              (item.clientBudgetPerUnit - response.pricePerUnit) *
                                response.qtyAvailable,
                            )
                          : formatCurrency(overBudgetAmount)
                      }
                      tone={withinBudget ? 'success' : 'warning'}
                    />
                  </>
                )}
              </div>

              {/* Coverage bar */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium uppercase tracking-wider">Quantity Coverage</span>
                  <span className="font-semibold tabular-nums text-foreground/80">
                    {Math.min(
                      100,
                      Math.round((response.qtyAvailable / item.qtyRequested) * 100),
                    )}
                    %
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      response.qtyAvailable >= item.qtyRequested
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((response.qtyAvailable / item.qtyRequested) * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Procurement note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <User className="size-3.5" />
                </span>
                Procurement Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Responded By" value={response.respondedBy} />
                <Metric label="Responded On" value={formatDateTime(response.respondedAt)} />
              </div>
              {response.notes ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Sourcing Note
                  </p>
                  <p className="mt-1 text-sm italic leading-relaxed text-foreground/85">
                    &ldquo;{response.notes}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed py-3 text-center text-xs italic text-muted-foreground">
                  No sourcing note left
                </p>
              )}
            </CardContent>
          </Card>

          {/* PM decision */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-md ${
                    status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : status === 'Rejected'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {status === 'Approved' ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : status === 'Rejected' ? (
                    <XCircle className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </span>
                PM Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  variant={
                    status === 'Approved'
                      ? 'success'
                      : status === 'Rejected'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {status === 'Approved' ? (
                    <>
                      <CheckCircle2 className="mr-1 size-3" /> Approved
                    </>
                  ) : status === 'Rejected' ? (
                    <>
                      <XCircle className="mr-1 size-3" /> Rejected
                    </>
                  ) : (
                    <>
                      <Clock className="mr-1 size-3" /> Pending PM
                    </>
                  )}
                </StatusBadge>
                {response.pmActionedBy && (
                  <span className="text-xs text-muted-foreground">
                    by <span className="font-medium text-foreground/80">{response.pmActionedBy}</span>
                  </span>
                )}
                {response.pmActionedAt && (
                  <span className="text-xs text-muted-foreground">
                    · {formatDateTime(response.pmActionedAt)}
                  </span>
                )}
              </div>

              {response.pmNotes ? (
                <div
                  className={`rounded-lg border-l-[3px] px-4 py-3 ${
                    status === 'Approved'
                      ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-l-destructive bg-destructive/5'
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    PM Note
                  </p>
                  <p className="mt-1 text-sm italic leading-relaxed text-foreground/85">
                    &ldquo;{response.pmNotes}&rdquo;
                  </p>
                </div>
              ) : status !== 'Pending' ? (
                <p className="text-xs italic text-muted-foreground">
                  No note left by PM on this decision.
                </p>
              ) : (
                <p className="rounded-lg border border-dashed bg-muted/10 py-3 text-center text-xs italic text-muted-foreground">
                  Waiting for PM to approve or reject this option
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — context */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Inquiry Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="size-3" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{item.item}</p>
                  <Badge variant="secondary" className="mt-1">
                    {item.category}
                  </Badge>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <div className="space-y-1.5 border-t pt-2.5 text-xs">
                <KV label="Qty Requested" value={`${item.qtyRequested} units`} />
                {item.clientBudgetPerUnit && (
                  <KV
                    label="Client Budget / Unit"
                    value={formatCurrency(item.clientBudgetPerUnit)}
                  />
                )}
                {item.clientTimeline && <KV label="Client Timeline" value={item.clientTimeline} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Parent Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link
                to={`/crm/material-inquiries/${mi.id}`}
                className="group flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{mi.inquiryNumber}</p>
                  {mi.leadName && (
                    <p className="truncate text-xs text-muted-foreground">{mi.leadName}</p>
                  )}
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </Link>
              <div className="space-y-1.5 text-xs">
                <KV label="Requested By" value={mi.requestedBy} />
                {mi.assignedTo && <KV label="Assigned To" value={mi.assignedTo} />}
                {mi.productManagerNotified && (
                  <KV label="PM Notified" value={mi.productManagerNotified} />
                )}
                {mi.clientBudget && (
                  <KV label="Overall Budget" value={formatCurrency(mi.clientBudget)} />
                )}
                <KV label="Status" value={mi.status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function HeroStat({
  label,
  value,
  sub,
  subVariant,
  icon,
}: {
  label: string
  value: string
  sub?: string
  subVariant?: 'success' | 'warning'
  icon?: React.ReactNode
}) {
  const subClass =
    subVariant === 'success'
      ? 'text-emerald-600'
      : subVariant === 'warning'
      ? 'text-status-warning-text'
      : 'text-muted-foreground'
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className={`mt-0.5 text-[11px] ${subClass}`}>{sub}</p>}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'warning'
      ? 'text-status-warning-text'
      : 'text-foreground/90'
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/85">{value}</span>
    </div>
  )
}

export { MaterialInquiryResponseDetailPage }
export default MaterialInquiryResponseDetailPage
