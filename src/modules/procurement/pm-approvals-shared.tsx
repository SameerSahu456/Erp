import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, User, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TabsTrigger } from '@/components/ui/tabs'
import { materialInquiries } from '@/modules/crm/data/material-inquiries'
import { salesOrders } from '@/modules/crm/data/sales-orders'
import { purchaseRequests } from '@/modules/crm/data/purchase-requests'
import { demoRequests } from '@/modules/crm/data/demo-requests'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import type {
  PurchaseRequest,
  PRCategoryApproval,
  DemoRequest,
  MaterialInquiry,
  MaterialInquiryResponse,
  SalesOrder,
} from '@/modules/crm/types'
import type { PurchaseOrder } from '@/modules/procurement/types'

// ── Constants ──
export const PM_CATEGORIES: Record<string, string[]> = {
  'Vikram Singh': ['Servers', 'Networking', 'Desktops'],
  'Rahul Mehta': ['Laptops', 'UPS & Power', 'Cables & Accessories'],
  'Priya Sharma': ['Storage', 'Monitors', 'Software Licenses'],
}
export const ALL_PMS = Object.keys(PM_CATEGORIES)

export type PMAction = 'Approved' | 'Rejected'

// ── Formatters ──
export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function isPending(status: 'Pending' | 'Approved' | 'Rejected' | undefined) {
  return !status || status === 'Pending'
}

// ── Module-level mutable store so approvals persist across navigation ──
let _mis: MaterialInquiry[] = [...materialInquiries]
let _sos: SalesOrder[] = [...salesOrders]
let _prs: PurchaseRequest[] = [...purchaseRequests]
let _pos: PurchaseOrder[] = [...mockPurchaseOrders]
let _demos: DemoRequest[] = [...demoRequests]

type Listener = () => void
const listeners = new Set<Listener>()
function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
function notify() {
  listeners.forEach((l) => l())
}

function getMIs() {
  return _mis
}
function getSOs() {
  return _sos
}
function getPRs() {
  return _prs
}
function getPOs() {
  return _pos
}
function getDemos() {
  return _demos
}

export function useMIs() {
  return useSyncExternalStore(subscribe, getMIs, getMIs)
}
export function useSOs() {
  return useSyncExternalStore(subscribe, getSOs, getSOs)
}
export function usePRs() {
  return useSyncExternalStore(subscribe, getPRs, getPRs)
}
export function usePOs() {
  return useSyncExternalStore(subscribe, getPOs, getPOs)
}
export function useDemos() {
  return useSyncExternalStore(subscribe, getDemos, getDemos)
}

// Mutations
export function actOnMIResponse(
  miId: string,
  responseId: string,
  action: PMAction,
  pm: string,
  notes: string,
) {
  _mis = _mis.map((mi) =>
    mi.id !== miId
      ? mi
      : {
          ...mi,
          responses: mi.responses.map((r) =>
            r.id !== responseId
              ? r
              : {
                  ...r,
                  pmStatus: action,
                  pmNotes: notes || undefined,
                  pmActionedBy: pm,
                  pmActionedAt: new Date().toISOString(),
                },
          ),
        },
  )
  notify()
  toast.success(`Response ${action.toLowerCase()}`)
}

// Line-item-level: apply the action to every response tied to this item
export function actOnMIItem(
  miId: string,
  itemId: string,
  action: PMAction,
  pm: string,
  notes: string,
) {
  const now = new Date().toISOString()
  let matched = 0
  _mis = _mis.map((mi) => {
    if (mi.id !== miId) return mi
    return {
      ...mi,
      responses: mi.responses.map((r) => {
        if (r.inquiryItemId !== itemId) return r
        matched += 1
        return {
          ...r,
          pmStatus: action,
          pmNotes: notes || r.pmNotes,
          pmActionedBy: pm,
          pmActionedAt: now,
        }
      }),
    }
  })
  notify()
  if (matched === 0) {
    toast.info('No procurement response yet — cannot act on this item')
  } else {
    toast.success(
      `Item ${action.toLowerCase()} (${matched} response${matched !== 1 ? 's' : ''})`,
    )
  }
}

export function actOnSO(soId: string, action: PMAction, pm: string, notes: string) {
  _sos = _sos.map((so) =>
    so.id !== soId
      ? so
      : {
          ...so,
          pmApprovalStatus: action,
          pmApprovedBy: action === 'Approved' ? pm : undefined,
          pmApprovalDate: new Date().toISOString(),
          pmNotes: notes || undefined,
        },
  )
  notify()
  toast.success(`${soId} ${action.toLowerCase()}`)
}

export function actOnPRCategory(
  prId: string,
  category: string,
  pm: string,
  action: PMAction,
  remarks: string,
) {
  _prs = _prs.map((pr) => {
    if (pr.id !== prId) return pr
    const updated = {
      ...pr,
      categoryApprovals: pr.categoryApprovals.map((a) => {
        if (a.category !== category || a.productManager !== pm) return a
        return {
          ...a,
          status: action,
          approvedAt: action === 'Approved' ? new Date().toISOString() : undefined,
          rejectedAt: action === 'Rejected' ? new Date().toISOString() : undefined,
          remarks: remarks || undefined,
        }
      }),
    }
    const allDone = updated.categoryApprovals.every((a) => a.status !== 'Pending')
    const allApproved = updated.categoryApprovals.every((a) => a.status === 'Approved')
    const anyRejected = updated.categoryApprovals.some((a) => a.status === 'Rejected')
    if (anyRejected) {
      updated.status = 'Rejected'
    } else if (allApproved) {
      updated.status = 'All PMs Approved'
    } else if (allDone) {
      updated.status = 'Partially Approved'
    } else {
      const someApproved = updated.categoryApprovals.some((a) => a.status === 'Approved')
      if (someApproved) updated.status = 'Partially Approved'
    }
    return updated
  })
  notify()
  toast.success(`${category} ${action.toLowerCase()} for ${prId}`)
}

export function actOnPO(poId: string, action: PMAction, pm: string, notes: string) {
  _pos = _pos.map((po) =>
    po.id !== poId
      ? po
      : {
          ...po,
          pmApprovalStatus: action,
          pmApprovedBy: action === 'Approved' ? pm : undefined,
          pmApprovalDate: new Date().toISOString(),
          pmNotes: notes || undefined,
        },
  )
  notify()
  toast.success(`${poId} ${action.toLowerCase()}`)
}

export function actOnDemo(
  demoId: string,
  action: 'PM Approved' | 'PM Rejected',
  pm: string,
  remarks: string,
) {
  _demos = _demos.map((d) =>
    d.id !== demoId
      ? d
      : {
          ...d,
          status: action,
          pmApprovalDate: new Date().toISOString(),
          pmRemarks: remarks || undefined,
          approvedBy: action === 'PM Approved' ? pm : undefined,
        },
  )
  notify()
  toast.success(`Demo ${demoId} ${action === 'PM Approved' ? 'approved' : 'rejected'}`)
}

// ── Small shared UI helpers ──
export function PremiumTabTrigger({
  value,
  icon,
  label,
  count,
}: {
  value: string
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <TabsTrigger
      value={value}
      className="group flex-none gap-2 px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-active:text-foreground"
    >
      <span className="text-muted-foreground transition-colors group-hover:text-foreground group-data-[active]:text-primary">
        {icon}
      </span>
      {label}
      {count > 0 && <TabPendingBadge count={count} />}
    </TabsTrigger>
  )
}

export function TabPendingBadge({ count }: { count: number }) {
  return (
    <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-status-warning-bg px-1.5 py-px text-[10px] font-semibold leading-none text-status-warning-text ring-1 ring-inset ring-status-warning-text/20">
      {count}
    </span>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 p-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        <Clock className="size-4" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function CardHeader({
  title,
  subtitle,
  meta,
  statusVariant,
  statusText,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  statusVariant: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  statusText: string
}) {
  return (
    <div className="relative flex items-center justify-between gap-4 border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-4">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight">{title}</span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      <StatusBadge variant={statusVariant}>{statusText}</StatusBadge>
    </div>
  )
}

function ApprovalActionRow({
  notes,
  onNotesChange,
  onApprove,
  onReject,
  placeholder,
}: {
  notes: string
  onNotesChange: (v: string) => void
  onApprove: () => void
  onReject: () => void
  placeholder: string
}) {
  return (
    <div className="mt-4 rounded-xl border bg-gradient-to-br from-muted/30 to-muted/5 p-4 shadow-inner">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Notes (optional)
          </label>
          <Input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={placeholder}
            className="h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5"
            onClick={onReject}
          >
            <XCircle className="mr-1.5 size-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            className="shadow-sm transition-shadow hover:shadow-md"
          >
            <CheckCircle2 className="mr-1.5 size-3.5" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}

function NotesBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/30 px-3.5 py-2.5">
      <span className="mt-0.5 inline-flex size-1.5 shrink-0 rounded-full bg-primary/60" />
      <div className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/80">{label}</span>
        <span className="mx-1.5 text-muted-foreground/40">·</span>
        <span className="italic">{value}</span>
      </div>
    </div>
  )
}

// ── MI card ──
export function MIApprovalCard({
  mi,
  myCategories,
  onRespond,
}: {
  mi: MaterialInquiry
  myCategories: string[]
  onRespond: (miId: string, responseId: string, action: PMAction, notes: string) => void
}) {
  const myItems = mi.items.filter((i) => myCategories.includes(i.category))
  const shownItems = myItems.length > 0 ? myItems : mi.items

  const myItemIds = new Set(myItems.map((i) => i.id))
  const myResponses = mi.responses.filter((r) => myItemIds.has(r.inquiryItemId))

  const anyPending = myResponses.some((r) => isPending(r.pmStatus))
  const anyResponses = myResponses.length > 0

  let headerVariant: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'info'
  let headerText = 'Awaiting procurement'
  if (anyResponses) {
    if (anyPending) {
      headerVariant = 'warning'
      headerText = 'Pending PM review'
    } else {
      const allApproved = myResponses.every((r) => r.pmStatus === 'Approved')
      const allRejected = myResponses.every((r) => r.pmStatus === 'Rejected')
      if (allApproved) {
        headerVariant = 'success'
        headerText = 'All approved'
      } else if (allRejected) {
        headerVariant = 'error'
        headerText = 'All rejected'
      } else {
        headerVariant = 'success'
        headerText = 'Reviewed'
      }
    }
  }

  return (
    <div className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all">
      <CardHeader
        title={
          <Link
            to={`/crm/material-inquiries/${mi.id}`}
            className="text-primary underline-offset-4 transition-all hover:underline"
          >
            {mi.inquiryNumber}
          </Link>
        }
        subtitle={mi.leadName ? <span>· {mi.leadName}</span> : undefined}
        meta={
          <>
            By {mi.requestedBy} · {formatDate(mi.createdAt)}
            {mi.clientBudget ? <> · Budget {formatCurrency(mi.clientBudget)}</> : null}
          </>
        }
        statusVariant={headerVariant}
        statusText={headerText}
      />

      <div className="space-y-5 px-6 py-5">
        {mi.description && (
          <p className="rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {mi.description}
          </p>
        )}

        <div className="space-y-4">
          {shownItems.map((item) => {
            const itemResponses = mi.responses.filter((r) => r.inquiryItemId === item.id)
            const approvedQty = itemResponses
              .filter((r) => r.pmStatus === 'Approved')
              .reduce((s, r) => s + r.qtyAvailable, 0)
            const coveragePct = Math.min(
              100,
              Math.round((approvedQty / item.qtyRequested) * 100),
            )
            const coverageColor =
              approvedQty === 0
                ? 'text-muted-foreground'
                : approvedQty >= item.qtyRequested
                ? 'text-emerald-600'
                : 'text-status-warning-text'

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-5 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight">{item.item}</span>
                      <span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-0.5 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Requested
                    </div>
                    <div className="text-base font-semibold tabular-nums">
                      {item.qtyRequested}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        units
                      </span>
                    </div>
                    {item.clientBudgetPerUnit && (
                      <div className="text-[11px] text-muted-foreground">
                        {formatCurrency(item.clientBudgetPerUnit)}/unit
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4">
                  {itemResponses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 py-6 text-center">
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <Clock className="size-3.5" />
                      </span>
                      <p className="text-xs italic text-muted-foreground">
                        Waiting for procurement response
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Procurement Responses ({itemResponses.length})
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                approvedQty === 0
                                  ? 'bg-muted-foreground/20'
                                  : approvedQty >= item.qtyRequested
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${coveragePct}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold tabular-nums ${coverageColor}`}
                          >
                            {approvedQty}/{item.qtyRequested}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {itemResponses.map((r, idx) => (
                          <ResponseRow
                            key={r.id}
                            index={idx + 1}
                            response={r}
                            budget={item.clientBudgetPerUnit}
                            onAction={(action, notes) => onRespond(mi.id, r.id, action, notes)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ResponseRow({
  index,
  response,
  budget,
  onAction,
}: {
  index: number
  response: MaterialInquiryResponse
  budget?: number
  onAction: (action: PMAction, notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)
  const pending = isPending(response.pmStatus)
  const approved = response.pmStatus === 'Approved'
  const rejected = response.pmStatus === 'Rejected'
  const withinBudget = budget ? response.pricePerUnit <= budget : undefined
  const total = response.qtyAvailable * response.pricePerUnit

  const accentClasses = approved
    ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/60 to-transparent dark:border-l-emerald-400 dark:from-emerald-950/20'
    : rejected
    ? 'border-l-destructive bg-gradient-to-r from-destructive/5 to-transparent'
    : 'border-l-primary/30'

  return (
    <div
      className={`overflow-hidden rounded-lg border border-l-[3px] bg-card shadow-sm ${accentClasses}`}
    >
      <div className="flex items-start gap-4 p-3.5">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
            approved
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : rejected
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-foreground/70'
          }`}
        >
          {index}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-semibold tabular-nums tracking-tight">
              {response.qtyAvailable}
            </span>
            <span className="text-xs text-muted-foreground">units</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(response.pricePerUnit)}
              <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                /unit
              </span>
            </span>
            {withinBudget === true && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle2 className="size-2.5" /> Within budget
              </span>
            )}
            {withinBudget === false && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-status-warning-bg px-1.5 py-px text-[10px] font-medium text-status-warning-text">
                Over budget
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              Total{' '}
              <span className="font-medium text-foreground/80">{formatCurrency(total)}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {formatDate(response.availableDate)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <User className="size-3" /> {response.respondedBy}
            </span>
          </div>

          {response.notes && (
            <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] italic leading-relaxed text-muted-foreground">
              &ldquo;{response.notes}&rdquo;
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pending ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5"
                onClick={() => onAction('Rejected', notes)}
              >
                <XCircle className="mr-1 size-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => onAction('Approved', notes)}
                className="h-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <CheckCircle2 className="mr-1 size-3.5" />
                Approve
              </Button>
            </>
          ) : (
            <StatusBadge variant={approved ? 'success' : 'error'}>
              {approved ? (
                <>
                  <CheckCircle2 className="mr-1 size-3" /> Approved
                </>
              ) : (
                <>
                  <XCircle className="mr-1 size-3" /> Rejected
                </>
              )}
            </StatusBadge>
          )}
        </div>
      </div>

      {pending ? (
        <div className="border-t bg-muted/10 px-3.5 py-2">
          {expanded ? (
            <Input
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note for this option"
              className="h-7 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
              onBlur={() => !notes && setExpanded(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[11px] font-medium text-primary/70 transition-colors hover:text-primary"
            >
              + Add note
            </button>
          )}
        </div>
      ) : (
        response.pmNotes && (
          <div className="flex items-start gap-2 border-t bg-muted/20 px-3.5 py-2">
            <span
              className={`mt-0.5 inline-flex size-1.5 shrink-0 rounded-full ${
                approved ? 'bg-emerald-500' : 'bg-destructive'
              }`}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                {response.pmActionedBy ?? 'PM'}
              </span>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="italic">{response.pmNotes}</span>
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ── Sales Order card ──
export function SOApprovalCard({
  so,
  myCategories,
  onApprove,
}: {
  so: SalesOrder
  myCategories: string[]
  onApprove: (soId: string, action: PMAction, notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const pending = isPending(so.pmApprovalStatus)
  const approved = so.pmApprovalStatus === 'Approved'
  const myLines = so.lineItems.filter((li) => myCategories.includes(li.category))
  const shownLines = myLines.length > 0 ? myLines : so.lineItems
  const myTotal = myLines.reduce((s, li) => s + li.amount, 0)

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <CardHeader
        title={
          <Link to={`/crm/sales-orders/${so.id}`} className="text-primary hover:underline">
            {so.orderNumber}
          </Link>
        }
        subtitle={<span>· {so.accountName}</span>}
        meta={
          <>
            {so.quoteName ? <>From {so.quoteName} · </> : null}
            {formatDate(so.date)} · Order total {formatCurrency(so.total)}
            {myLines.length > 0 ? <> · Your categories {formatCurrency(myTotal)}</> : null}
          </>
        }
        statusVariant={pending ? 'warning' : approved ? 'success' : 'error'}
        statusText={pending ? 'Pending PM' : approved ? 'Approved' : 'Rejected'}
      />

      <div className="px-6 py-5">
        {shownLines.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No line items on this order.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">Part</th>
                <th className="pb-2 text-left font-medium">Category</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {shownLines.map((li) => (
                <tr key={li.id}>
                  <td className="py-2.5">
                    <div className="font-medium">{li.partName}</div>
                    <div className="text-xs text-muted-foreground">
                      {li.brand} · {li.partSku}
                    </div>
                  </td>
                  <td className="py-2.5 text-xs">{li.category}</td>
                  <td className="py-2.5 text-right tabular-nums">{li.qty}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatCurrency(li.rate)}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatCurrency(li.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pending ? (
          <ApprovalActionRow
            notes={notes}
            onNotesChange={setNotes}
            onApprove={() => onApprove(so.id, 'Approved', notes)}
            onReject={() => onApprove(so.id, 'Rejected', notes)}
            placeholder="e.g., Approved. Priority build for key account."
          />
        ) : (
          so.pmNotes && <NotesBox label="PM Notes" value={so.pmNotes} />
        )}
      </div>
    </div>
  )
}

// ── Purchase Request card ──
export function PRApprovalCard({
  pr,
  approvals,
  myItems,
  onApprove,
}: {
  pr: PurchaseRequest
  approvals: PRCategoryApproval[]
  myItems: PurchaseRequest['items']
  onApprove: (prId: string, category: string, action: PMAction, remarks: string) => void
}) {
  const [remarks, setRemarks] = useState<Record<string, string>>({})

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <CardHeader
        title={pr.prNumber}
        subtitle={
          pr.salesOrderNumber ? (
            <>
              <span className="mr-1 text-muted-foreground/50">&rarr;</span>
              {pr.salesOrderNumber}
            </>
          ) : undefined
        }
        meta={
          <>
            By {pr.requestedBy} · {formatDate(pr.createdAt)}
          </>
        }
        statusVariant={
          pr.status === 'Rejected'
            ? 'error'
            : pr.status === 'All PMs Approved' ||
              pr.status === 'Final Approved' ||
              pr.status === 'Sent to Procurement'
            ? 'success'
            : 'warning'
        }
        statusText={pr.status}
      />

      {approvals.map((approval) => {
        const categoryItems = myItems.filter((i) => i.category === approval.category)
        const pending = approval.status === 'Pending'
        const catRemarks = remarks[approval.category] ?? ''
        const estimatedTotal = categoryItems.reduce(
          (s, i) => s + i.qty * (i.estimatedRate ?? 0),
          0,
        )

        return (
          <div key={approval.id} className="border-b last:border-b-0">
            <div
              className={`flex items-center justify-between border-l-[3px] px-5 py-3 ${
                pending
                  ? 'border-l-status-warning-text bg-status-warning-bg/40'
                  : approval.status === 'Approved'
                  ? 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
                  : 'border-l-destructive bg-destructive/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {approval.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                  {estimatedTotal > 0 && (
                    <span className="ml-1">· {formatCurrency(estimatedTotal)}</span>
                  )}
                </span>
              </div>
              {!pending && (
                <StatusBadge variant={approval.status === 'Approved' ? 'success' : 'error'}>
                  {approval.status === 'Approved' ? (
                    <>
                      <CheckCircle2 className="mr-1 size-3" /> Approved
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 size-3" /> Rejected
                    </>
                  )}
                </StatusBadge>
              )}
            </div>

            <div className="px-5 pb-4 pt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Item</th>
                    <th className="pb-2 text-left font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Est. Rate</th>
                    <th className="pb-2 text-right font-medium">Est. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {categoryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 font-medium">{item.item}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">{item.description}</td>
                      <td className="py-2.5 text-right tabular-nums">{item.qty}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {item.estimatedRate ? formatCurrency(item.estimatedRate) : '—'}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {item.estimatedRate
                          ? formatCurrency(item.qty * item.estimatedRate)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pending ? (
                <ApprovalActionRow
                  notes={catRemarks}
                  onNotesChange={(v) =>
                    setRemarks((prev) => ({ ...prev, [approval.category]: v }))
                  }
                  onApprove={() => onApprove(pr.id, approval.category, 'Approved', catRemarks)}
                  onReject={() => onApprove(pr.id, approval.category, 'Rejected', catRemarks)}
                  placeholder="e.g., Recommend negotiating for better pricing..."
                />
              ) : (
                approval.remarks && <NotesBox label="Remarks" value={approval.remarks} />
              )}
            </div>
          </div>
        )
      })}

      {pr.notes && (
        <div className="border-t bg-muted/20 px-5 py-2.5">
          <p className="text-xs text-muted-foreground">{pr.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Purchase Order card ──
export function POApprovalCard({
  po,
  myCategories,
  onApprove,
}: {
  po: PurchaseOrder
  myCategories: string[]
  onApprove: (poId: string, action: PMAction, notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const pending = isPending(po.pmApprovalStatus)
  const approved = po.pmApprovalStatus === 'Approved'
  const myItems = po.items.filter((i) => myCategories.includes(i.category))
  const shownItems = myItems.length > 0 ? myItems : po.items
  const myTotal = myItems.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <CardHeader
        title={
          <Link to={`/procurement/po/${po.id}`} className="text-primary hover:underline">
            {po.poNumber}
          </Link>
        }
        subtitle={<span>· {po.vendorName}</span>}
        meta={
          <>
            {po.prNumber ? <>From {po.prNumber} · </> : null}
            Expected {formatDate(po.expectedDelivery)} · Grand Total{' '}
            {formatCurrency(po.grandTotal)}
            {myItems.length > 0 ? <> · Your categories {formatCurrency(myTotal)}</> : null}
          </>
        }
        statusVariant={pending ? 'warning' : approved ? 'success' : 'error'}
        statusText={pending ? 'Pending PM' : approved ? 'Approved' : 'Rejected'}
      />

      <div className="px-6 py-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 text-left font-medium">Part</th>
              <th className="pb-2 text-left font-medium">Category</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit Price</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {shownItems.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5">
                  <div className="font-medium">{item.partName}</div>
                  <div className="text-xs text-muted-foreground">{item.partSku}</div>
                </td>
                <td className="py-2.5 text-xs">{item.category}</td>
                <td className="py-2.5 text-right tabular-nums">{item.qtyOrdered}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pending ? (
          <ApprovalActionRow
            notes={notes}
            onNotesChange={setNotes}
            onApprove={() => onApprove(po.id, 'Approved', notes)}
            onReject={() => onApprove(po.id, 'Rejected', notes)}
            placeholder="e.g., Approved. Payment terms acceptable."
          />
        ) : (
          po.pmNotes && <NotesBox label="PM Notes" value={po.pmNotes} />
        )}
      </div>
    </div>
  )
}

// ── Demo Request card ──
export function DemoApprovalCard({
  demo,
  onApprove,
}: {
  demo: DemoRequest
  onApprove: (demoId: string, action: 'PM Approved' | 'PM Rejected', remarks: string) => void
}) {
  const [remarks, setRemarks] = useState('')
  const pending = demo.status === 'Pending PM Approval'

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <Link
              to={`/crm/demo-requests/${demo.id}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {demo.demoNumber}
            </Link>
            <span className="text-sm text-muted-foreground">· {demo.accountName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            By {demo.requestedBy} · {formatDate(demo.createdAt)} · Return by{' '}
            {formatDate(demo.expectedReturnDate)}
          </p>
        </div>
        <StatusBadge
          variant={
            demo.status === 'PM Approved'
              ? 'success'
              : demo.status === 'PM Rejected'
              ? 'error'
              : pending
              ? 'warning'
              : 'info'
          }
        >
          {demo.status}
        </StatusBadge>
      </div>

      <div className="px-5 py-4">
        <div className="divide-y divide-border/50">
          {demo.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{item.partName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.brand} · {item.partSku} · {item.category}
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">
                ×{item.qty}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Ship to:</span> {demo.shippingAddress}
          </p>
        </div>

        {pending ? (
          <ApprovalActionRow
            notes={remarks}
            onNotesChange={setRemarks}
            onApprove={() => onApprove(demo.id, 'PM Approved', remarks)}
            onReject={() => onApprove(demo.id, 'PM Rejected', remarks)}
            placeholder="e.g., Approved for 2-week demo. Track closely."
          />
        ) : (
          demo.pmRemarks && <NotesBox label="PM Remarks" value={demo.pmRemarks} />
        )}
      </div>

      {demo.notes && (
        <div className="border-t bg-muted/20 px-5 py-2.5">
          <p className="text-xs text-muted-foreground">{demo.notes}</p>
        </div>
      )}
    </div>
  )
}
