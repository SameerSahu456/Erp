import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  CheckCircle2,
  XCircle,
  User,
  Tag,
  FileText,
  ClipboardList,
  ShoppingCart,
  Search,
  Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  ALL_PMS,
  PM_CATEGORIES,
  PremiumTabTrigger,
  EmptyState,
  formatCurrency,
  formatDate,
  isPending,
  useMIs,
  useSOs,
  usePRs,
  usePOs,
  actOnMIItem,
  actOnSO,
  actOnPRCategory,
  actOnPO,
} from '../pm-approvals-shared'
import type {
  PurchaseRequest,
  PRCategoryApproval,
  PurchaseRequestItem,
  MaterialInquiry,
  MaterialInquiryItem,
  SalesOrder,
} from '@/modules/crm/types'
import type { PurchaseOrder } from '@/modules/procurement/types'

function PMApprovalsPage() {
  const navigate = useNavigate()
  const [currentPM, setCurrentPM] = usePersistedState<string>('procurement-pm-approvals:pm', ALL_PMS[0]!)
  const myCategories: string[] = PM_CATEGORIES[currentPM] ?? []

  const localMIs = useMIs()
  const localSOs = useSOs()
  const localPRs = usePRs()
  const localPOs = usePOs()

  // ── MI groups — one row per MI, with each line item actionable inside ──
  type MIItemLine = {
    item: MaterialInquiryItem
    responseCount: number
    approvedCount: number
    rejectedCount: number
    pendingCount: number
    derivedStatus: 'Pending' | 'Approved' | 'Rejected' | 'Awaiting'
  }
  type MIGroup = {
    mi: MaterialInquiry
    lines: MIItemLine[]
  }
  const miGroups = useMemo<MIGroup[]>(() => {
    const groups: MIGroup[] = []
    for (const mi of localMIs) {
      const myItems = mi.items.filter((i) => myCategories.includes(i.category))
      if (myItems.length === 0) continue
      const lines: MIItemLine[] = myItems.map((item) => {
        const resps = mi.responses.filter((r) => r.inquiryItemId === item.id)
        const approved = resps.filter((r) => r.pmStatus === 'Approved').length
        const rejected = resps.filter((r) => r.pmStatus === 'Rejected').length
        const pending = resps.filter((r) => isPending(r.pmStatus)).length
        let derived: MIItemLine['derivedStatus'] = 'Awaiting'
        if (resps.length > 0) {
          if (pending > 0) derived = 'Pending'
          else if (approved > 0 && rejected === 0) derived = 'Approved'
          else if (rejected > 0 && approved === 0) derived = 'Rejected'
          else derived = 'Pending'
        }
        return {
          item,
          responseCount: resps.length,
          approvedCount: approved,
          rejectedCount: rejected,
          pendingCount: pending,
          derivedStatus: derived,
        }
      })
      groups.push({ mi, lines })
    }
    return groups
  }, [localMIs, myCategories])
  const pendingMIItemsCount = miGroups.reduce(
    (sum, g) => sum + g.lines.filter((l) => l.derivedStatus === 'Pending').length,
    0,
  )

  // ── SO rows ──
  const mySOs = useMemo(
    () =>
      localSOs.filter((so) =>
        so.lineItems.some((li) => myCategories.includes(li.category)),
      ),
    [localSOs, myCategories],
  )
  const pendingSOs = mySOs.filter((so) => isPending(so.pmApprovalStatus))

  // ── PR groups — one card per PR; line items actionable inside ──
  type PRLine = {
    item: PurchaseRequestItem
    approval: PRCategoryApproval
  }
  type PRGroup = {
    pr: PurchaseRequest
    lines: PRLine[]
  }
  const prGroups = useMemo<PRGroup[]>(() => {
    const groups: PRGroup[] = []
    for (const pr of localPRs) {
      const myApprovals = pr.categoryApprovals.filter(
        (a) => a.productManager === currentPM,
      )
      if (myApprovals.length === 0) continue
      const lines: PRLine[] = []
      for (const a of myApprovals) {
        const catItems = pr.items.filter((i) => i.category === a.category)
        for (const item of catItems) {
          lines.push({ item, approval: a })
        }
      }
      if (lines.length > 0) groups.push({ pr, lines })
    }
    return groups
  }, [localPRs, currentPM])
  const pendingPRItemsCount = prGroups.reduce(
    (sum, g) => sum + g.lines.filter((l) => l.approval.status === 'Pending').length,
    0,
  )

  // ── PO rows ──
  const myPOs = useMemo(
    () =>
      localPOs.filter((po) =>
        po.items.some((i) => myCategories.includes(i.category)),
      ),
    [localPOs, myCategories],
  )
  const pendingPOs = myPOs.filter((po) => isPending(po.pmApprovalStatus))

  const stats: StatCardData[] = [
    { label: 'MI Line Items', value: pendingMIItemsCount, icon: Search },
    { label: 'Sales Orders', value: pendingSOs.length, icon: ShoppingCart },
    { label: 'PR Items', value: pendingPRItemsCount, icon: FileText },
    { label: 'Purchase Orders', value: pendingPOs.length, icon: ClipboardList },
  ]

  const pmInitials = currentPM
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card px-6 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" />
              </span>
              <h1 className="cpt-page-title">PM Approvals</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Approve or reject inline from the list, or click a row to open the detail view for a closer look.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Your categories
              </span>
              <div className="flex flex-wrap gap-1.5">
                {myCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    <Tag className="size-3" />
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card/80 p-2 pr-3 shadow-sm backdrop-blur">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground shadow-sm">
              {pmInitials}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Viewing as
              </p>
              <Select
                value={currentPM}
                onValueChange={(v: string | null) => v && setCurrentPM(v)}
              >
                <SelectTrigger className="h-7 w-44 border-none bg-transparent px-0 text-sm font-semibold shadow-none hover:text-primary focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PMS.map((pm) => (
                    <SelectItem key={pm} value={pm}>
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground" />
                        {pm}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <StatsRow stats={stats} />

      {/* 4-tab list views */}
      <Tabs defaultValue="mi">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-1 rounded-none border-b p-0"
        >
          <PremiumTabTrigger
            value="mi"
            icon={<Search className="size-4" />}
            label="Material Inquiry"
            count={pendingMIItemsCount}
          />
          <PremiumTabTrigger
            value="so"
            icon={<ShoppingCart className="size-4" />}
            label="Sales Order"
            count={pendingSOs.length}
          />
          <PremiumTabTrigger
            value="pr"
            icon={<FileText className="size-4" />}
            label="Purchase Request"
            count={pendingPRItemsCount}
          />
          <PremiumTabTrigger
            value="po"
            icon={<ClipboardList className="size-4" />}
            label="Purchase Order"
            count={pendingPOs.length}
          />
        </TabsList>

        <TabsContent value="mi" className="pt-4">
          {miGroups.length === 0 ? (
            <EmptyState message="No Material Inquiries match your categories" />
          ) : (
            <MIListView
              groups={miGroups}
              currentPM={currentPM}
              onOpen={(miId) => navigate(`/procurement/pm-approvals/mi/${miId}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="so" className="pt-4">
          {mySOs.length === 0 ? (
            <EmptyState message="No Sales Orders match your categories" />
          ) : (
            <SOListView
              sos={mySOs}
              myCategories={myCategories}
              currentPM={currentPM}
              onOpen={(id) => navigate(`/procurement/pm-approvals/so/${id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="pr" className="pt-4">
          {prGroups.length === 0 ? (
            <EmptyState message="No Purchase Requests require your approval" />
          ) : (
            <PRListView
              groups={prGroups}
              currentPM={currentPM}
              onOpen={(id) => navigate(`/procurement/pm-approvals/pr/${id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="po" className="pt-4">
          {myPOs.length === 0 ? (
            <EmptyState message="No Purchase Orders match your categories" />
          ) : (
            <POListView
              pos={myPOs}
              myCategories={myCategories}
              currentPM={currentPM}
              onOpen={(id) => navigate(`/procurement/pm-approvals/po/${id}`)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Inline action buttons ──
function InlineActions({
  status,
  onApprove,
  onReject,
}: {
  status: 'Pending' | 'Approved' | 'Rejected' | undefined
  onApprove: (e: React.MouseEvent) => void
  onReject: (e: React.MouseEvent) => void
}) {
  if (!isPending(status)) {
    return (
      <StatusBadge variant={status === 'Approved' ? 'success' : 'error'}>
        {status === 'Approved' ? (
          <>
            <CheckCircle2 className="mr-1 size-3" /> Approved
          </>
        ) : (
          <>
            <XCircle className="mr-1 size-3" /> Rejected
          </>
        )}
      </StatusBadge>
    )
  }
  return (
    <div className="flex justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px] border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5"
        onClick={onReject}
      >
        <XCircle className="mr-1 size-3" />
        Reject
      </Button>
      <Button
        size="sm"
        className="h-7 px-2 text-[11px] shadow-sm transition-shadow hover:shadow-md"
        onClick={onApprove}
      >
        <CheckCircle2 className="mr-1 size-3" />
        Approve
      </Button>
    </div>
  )
}

function ListShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card shadow-sm">{children}</div>
}

function RowAccent({ status }: { status: 'Pending' | 'Approved' | 'Rejected' | undefined }) {
  return (
    <span
      className={`absolute left-0 top-0 h-full w-[3px] ${
        status === 'Approved'
          ? 'bg-emerald-500'
          : status === 'Rejected'
          ? 'bg-destructive'
          : 'bg-transparent'
      }`}
    />
  )
}

// ── Material Inquiry list (grouped by MI; line-item approvals inside) ──
function MIListView({
  groups,
  currentPM,
  onOpen,
}: {
  groups: {
    mi: MaterialInquiry
    lines: {
      item: MaterialInquiryItem
      responseCount: number
      approvedCount: number
      rejectedCount: number
      pendingCount: number
      derivedStatus: 'Pending' | 'Approved' | 'Rejected' | 'Awaiting'
    }[]
  }[]
  currentPM: string
  onOpen: (miId: string) => void
}) {
  return (
    <div className="space-y-3">
      {groups.map((group, idx) => (
        <MIGroupCard
          key={group.mi.id}
          index={idx + 1}
          mi={group.mi}
          lines={group.lines}
          currentPM={currentPM}
          onOpen={() => onOpen(group.mi.id)}
        />
      ))}
    </div>
  )
}

function MIGroupCard({
  index,
  mi,
  lines,
  currentPM,
  onOpen,
}: {
  index: number
  mi: MaterialInquiry
  lines: {
    item: MaterialInquiryItem
    responseCount: number
    approvedCount: number
    rejectedCount: number
    pendingCount: number
    derivedStatus: 'Pending' | 'Approved' | 'Rejected' | 'Awaiting'
  }[]
  currentPM: string
  onOpen: () => void
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const pendingLines = lines.filter((l) => l.derivedStatus === 'Pending').length
  const approvedLines = lines.filter((l) => l.derivedStatus === 'Approved').length
  const rejectedLines = lines.filter((l) => l.derivedStatus === 'Rejected').length
  const awaitingLines = lines.filter((l) => l.derivedStatus === 'Awaiting').length

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
      onClick={onOpen}
    >
      {/* Group header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
            {String(index).padStart(2, '0')}
          </span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-primary">
                {mi.inquiryNumber}
              </span>
              {mi.leadName && (
                <span className="text-xs text-muted-foreground">· {mi.leadName}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              By {mi.requestedBy} · {formatDate(mi.createdAt)}
              {mi.clientBudget ? <> · Budget {formatCurrency(mi.clientBudget)}</> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-medium">
          <span className="text-muted-foreground">
            {lines.length} item{lines.length !== 1 ? 's' : ''}
          </span>
          {pendingLines > 0 && (
            <span className="inline-flex items-center gap-1 text-status-warning-text">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {pendingLines} pending
            </span>
          )}
          {approvedLines > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {approvedLines} approved
            </span>
          )}
          {rejectedLines > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <span className="size-1.5 rounded-full bg-destructive" />
              {rejectedLines} rejected
            </span>
          )}
          {awaitingLines > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" />
              {awaitingLines} awaiting
            </span>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="divide-y">
        {lines.map((line, i) => {
          const { item, responseCount, approvedCount, pendingCount, derivedStatus } = line
          const hasResponses = responseCount > 0
          const status =
            derivedStatus === 'Awaiting'
              ? undefined
              : (derivedStatus as 'Pending' | 'Approved' | 'Rejected')

          return (
            <div
              key={item.id}
              className="relative flex flex-wrap items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/20"
            >
              <RowAccent status={status} />
              <span className="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground/90">{item.item}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {item.category}
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{item.qtyRequested}</span>{' '}
                    units
                  </span>
                  {item.clientBudgetPerUnit && (
                    <span>{formatCurrency(item.clientBudgetPerUnit)}/unit</span>
                  )}
                  {hasResponses ? (
                    <span>
                      {responseCount} response{responseCount !== 1 ? 's' : ''}
                      {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
                      {approvedCount > 0 && pendingCount === 0
                        ? ` · ${approvedCount} approved`
                        : ''}
                    </span>
                  ) : (
                    <span className="italic">No responses yet</span>
                  )}
                </div>
              </div>
              <div className="shrink-0" onClick={stop}>
                {!hasResponses ? (
                  <StatusBadge variant="info">
                    <Clock className="mr-1 size-3" /> Awaiting response
                  </StatusBadge>
                ) : (
                  <InlineActions
                    status={status}
                    onApprove={(e) => {
                      e.stopPropagation()
                      actOnMIItem(mi.id, item.id, 'Approved', currentPM, '')
                    }}
                    onReject={(e) => {
                      e.stopPropagation()
                      actOnMIItem(mi.id, item.id, 'Rejected', currentPM, '')
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sales Order list ──
function SOListView({
  sos,
  myCategories,
  currentPM,
  onOpen,
}: {
  sos: SalesOrder[]
  myCategories: string[]
  currentPM: string
  onOpen: (id: string) => void
}) {
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <ListShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-14 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sr. No
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Order
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              My Lines
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </TableHead>
            <TableHead className="w-48 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sos.map((so, idx) => {
            const myLines = so.lineItems.filter((l) => myCategories.includes(l.category))
            return (
              <TableRow
                key={so.id}
                className="relative cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onOpen(so.id)}
              >
                <TableCell className="relative text-xs font-semibold tabular-nums text-muted-foreground">
                  <RowAccent status={so.pmApprovalStatus} />
                  {String(idx + 1).padStart(2, '0')}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-primary">{so.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(so.date)}</p>
                </TableCell>
                <TableCell className="text-sm">{so.accountName}</TableCell>
                <TableCell className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{myLines.length}</p>
                  <p className="text-[11px] text-muted-foreground">of {so.lineItems.length}</p>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(so.total)}
                </TableCell>
                <TableCell className="text-right" onClick={stopRowClick}>
                  <InlineActions
                    status={so.pmApprovalStatus}
                    onApprove={(e) => {
                      e.stopPropagation()
                      actOnSO(so.id, 'Approved', currentPM, '')
                    }}
                    onReject={(e) => {
                      e.stopPropagation()
                      actOnSO(so.id, 'Rejected', currentPM, '')
                    }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ListShell>
  )
}

// ── Purchase Request list (grouped by PR; line-item approvals inside) ──
function PRListView({
  groups,
  currentPM,
  onOpen,
}: {
  groups: {
    pr: PurchaseRequest
    lines: { item: PurchaseRequestItem; approval: PRCategoryApproval }[]
  }[]
  currentPM: string
  onOpen: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {groups.map((group, idx) => (
        <PRGroupCard
          key={group.pr.id}
          index={idx + 1}
          pr={group.pr}
          lines={group.lines}
          currentPM={currentPM}
          onOpen={() => onOpen(group.pr.id)}
        />
      ))}
    </div>
  )
}

function PRGroupCard({
  index,
  pr,
  lines,
  currentPM,
  onOpen,
}: {
  index: number
  pr: PurchaseRequest
  lines: { item: PurchaseRequestItem; approval: PRCategoryApproval }[]
  currentPM: string
  onOpen: () => void
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const pendingLines = lines.filter((l) => l.approval.status === 'Pending').length
  const approvedLines = lines.filter((l) => l.approval.status === 'Approved').length
  const rejectedLines = lines.filter((l) => l.approval.status === 'Rejected').length

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
      onClick={onOpen}
    >
      {/* Group header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
            {String(index).padStart(2, '0')}
          </span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-primary">
                {pr.prNumber}
              </span>
              {pr.salesOrderNumber && (
                <span className="text-xs text-muted-foreground">
                  → {pr.salesOrderNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              By {pr.requestedBy} · {formatDate(pr.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-medium">
          <span className="text-muted-foreground">
            {lines.length} item{lines.length !== 1 ? 's' : ''}
          </span>
          {pendingLines > 0 && (
            <span className="inline-flex items-center gap-1 text-status-warning-text">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {pendingLines} pending
            </span>
          )}
          {approvedLines > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {approvedLines} approved
            </span>
          )}
          {rejectedLines > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <span className="size-1.5 rounded-full bg-destructive" />
              {rejectedLines} rejected
            </span>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="divide-y">
        {lines.map(({ item, approval }, i) => {
          const estTotal = item.qty * (item.estimatedRate ?? 0)
          return (
            <div
              key={`${item.id}-${approval.id}`}
              className="relative flex flex-wrap items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/20"
            >
              <RowAccent status={approval.status} />
              <span className="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground/90">{item.item}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {item.category}
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{item.qty}</span> units
                  </span>
                  {item.estimatedRate && (
                    <span>@ {formatCurrency(item.estimatedRate)}/unit</span>
                  )}
                  {estTotal > 0 && (
                    <span>
                      Est.{' '}
                      <span className="font-medium text-foreground/80">
                        {formatCurrency(estTotal)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0" onClick={stop}>
                <InlineActions
                  status={approval.status}
                  onApprove={(e) => {
                    e.stopPropagation()
                    actOnPRCategory(pr.id, approval.category, currentPM, 'Approved', '')
                  }}
                  onReject={(e) => {
                    e.stopPropagation()
                    actOnPRCategory(pr.id, approval.category, currentPM, 'Rejected', '')
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Purchase Order list ──
function POListView({
  pos,
  myCategories,
  currentPM,
  onOpen,
}: {
  pos: PurchaseOrder[]
  myCategories: string[]
  currentPM: string
  onOpen: (id: string) => void
}) {
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <ListShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-14 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sr. No
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              PO
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vendor
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              My Items
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Grand Total
            </TableHead>
            <TableHead className="w-48 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pos.map((po, idx) => {
            const myItems = po.items.filter((i) => myCategories.includes(i.category))
            return (
              <TableRow
                key={po.id}
                className="relative cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onOpen(po.id)}
              >
                <TableCell className="relative text-xs font-semibold tabular-nums text-muted-foreground">
                  <RowAccent status={po.pmApprovalStatus} />
                  {String(idx + 1).padStart(2, '0')}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-primary">{po.poNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <Clock className="mr-0.5 inline size-3" />
                    {formatDate(po.expectedDelivery)}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{po.vendorName}</TableCell>
                <TableCell className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{myItems.length}</p>
                  <p className="text-[11px] text-muted-foreground">of {po.items.length}</p>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(po.grandTotal)}
                </TableCell>
                <TableCell className="text-right" onClick={stopRowClick}>
                  <InlineActions
                    status={po.pmApprovalStatus}
                    onApprove={(e) => {
                      e.stopPropagation()
                      actOnPO(po.id, 'Approved', currentPM, '')
                    }}
                    onReject={(e) => {
                      e.stopPropagation()
                      actOnPO(po.id, 'Rejected', currentPM, '')
                    }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ListShell>
  )
}

export { PMApprovalsPage }
export default PMApprovalsPage
