import { useMemo, useState } from 'react'
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
  Monitor,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  useDemos,
  actOnMIItem,
  actOnSO,
  actOnPRCategory,
  actOnPO,
  actOnDemo,
} from '../pm-approvals-shared'
import type {
  PurchaseRequest,
  PRCategoryApproval,
  PurchaseRequestItem,
  MaterialInquiry,
  MaterialInquiryItem,
  SalesOrder,
  DemoRequest,
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
  const localDemos = useDemos()

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

  // ── Demo Request rows ──
  const myDemos = useMemo(
    () => localDemos.filter((d) => d.productManager === currentPM),
    [localDemos, currentPM],
  )
  const pendingDemos = myDemos.filter((d) => d.status === 'Pending PM Approval')

  const stats: StatCardData[] = [
    { label: 'MI Line Items', value: pendingMIItemsCount, icon: Search, accent: 'info' as const },
    { label: 'Sales Orders', value: pendingSOs.length, icon: ShoppingCart, accent: 'violet' as const },
    { label: 'PR Items', value: pendingPRItemsCount, icon: FileText, accent: 'warning' as const },
    { label: 'Purchase Orders', value: pendingPOs.length, icon: ClipboardList, accent: 'primary' as const },
    { label: 'Demo Requests', value: pendingDemos.length, icon: Monitor, accent: 'teal' as const },
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
          <PremiumTabTrigger
            value="demo"
            icon={<Monitor className="size-4" />}
            label="Demo Request"
            count={pendingDemos.length}
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

        <TabsContent value="demo" className="pt-4">
          {myDemos.length === 0 ? (
            <EmptyState message="No Demo Requests assigned to you" />
          ) : (
            <DemoListView
              demos={myDemos}
              currentPM={currentPM}
              onOpen={(id) => navigate(`/procurement/pm-approvals/demo/${id}`)}
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
  const [pending, setPending] = useState<null | 'approve' | 'reject'>(null)

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
    <>
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5"
          onClick={(e) => { e.stopPropagation(); setPending('reject') }}
        >
          <XCircle className="mr-1 size-3" />
          Reject
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-[11px] shadow-sm transition-shadow hover:shadow-md"
          onClick={(e) => { e.stopPropagation(); setPending('approve') }}
        >
          <CheckCircle2 className="mr-1 size-3" />
          Approve
        </Button>
      </div>
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'approve' ? 'Approve this request?' : 'Reject this request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'approve'
                ? 'This will mark the item as approved and notify downstream stakeholders.'
                : 'This will mark the item as rejected. The requester will be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pending === 'reject' ? 'destructive' : 'default'}
              onClick={(e) => {
                if (pending === 'approve') onApprove(e as unknown as React.MouseEvent)
                else if (pending === 'reject') onReject(e as unknown as React.MouseEvent)
                setPending(null)
              }}
            >
              {pending === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

// ── Material Inquiry list — flat table; line-item level approvals ──
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
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <ListShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Inquiry
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Item
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Qty
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Responses
            </TableHead>
            <TableHead className="w-44 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group, groupIdx) =>
            group.lines.map((line, lineIdx) => {
              const { item, responseCount, pendingCount, derivedStatus } = line
              const hasResponses = responseCount > 0
              const isMulti = group.lines.length > 1
              const isFirst = lineIdx === 0
              const isLastInGroup = lineIdx === group.lines.length - 1
              const status =
                derivedStatus === 'Awaiting'
                  ? undefined
                  : (derivedStatus as 'Pending' | 'Approved' | 'Rejected')

              return (
                <TableRow
                  key={`${group.mi.id}-${item.id}`}
                  className={`relative cursor-pointer transition-colors hover:bg-muted/30 ${
                    isMulti && !isLastInGroup ? '[&>td]:border-b-0' : ''
                  }`}
                  onClick={() => onOpen(group.mi.id)}
                >
                  <TableCell className="relative align-middle text-xs font-semibold tabular-nums text-muted-foreground">
                    <RowAccent status={status} />
                    {isFirst ? String(groupIdx + 1).padStart(2, '0') : ''}
                  </TableCell>
                  <TableCell className="align-middle">
                    {isFirst ? (
                      <>
                        <p className="text-sm font-semibold text-primary">
                          {group.mi.inquiryNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {group.mi.leadName || formatDate(group.mi.createdAt)}
                          {isMulti ? ` · ${group.lines.length} items` : ''}
                        </p>
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-middle">
                    <p className="text-sm font-medium text-foreground/90">{item.item}</p>
                    <p className="text-[11px] text-muted-foreground">{item.category}</p>
                  </TableCell>
                  <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
                    {item.qtyRequested}
                  </TableCell>
                  <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                    {hasResponses
                      ? pendingCount > 0
                        ? `${responseCount} · ${pendingCount} pending`
                        : `${responseCount}`
                      : '—'}
                  </TableCell>
                  <TableCell className="align-middle text-right" onClick={stopRowClick}>
                    {!hasResponses ? (
                      <span className="text-[11px] italic text-muted-foreground">Awaiting</span>
                    ) : (
                      <InlineActions
                        status={status}
                        onApprove={(e) => {
                          e.stopPropagation()
                          actOnMIItem(group.mi.id, item.id, 'Approved', currentPM, '')
                        }}
                        onReject={(e) => {
                          e.stopPropagation()
                          actOnMIItem(group.mi.id, item.id, 'Rejected', currentPM, '')
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            }),
          )}
        </TableBody>
      </Table>
    </ListShell>
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
            <TableHead className="w-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Order
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lines
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </TableHead>
            <TableHead className="w-44 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                <TableCell className="relative align-middle text-xs font-semibold tabular-nums text-muted-foreground">
                  <RowAccent status={so.pmApprovalStatus} />
                  {String(idx + 1).padStart(2, '0')}
                </TableCell>
                <TableCell className="align-middle">
                  <p className="text-sm font-semibold text-primary">{so.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(so.date)}</p>
                </TableCell>
                <TableCell className="align-middle text-sm">{so.accountName}</TableCell>
                <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                  {myLines.length} / {so.lineItems.length}
                </TableCell>
                <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(so.total)}
                </TableCell>
                <TableCell className="align-middle text-right" onClick={stopRowClick}>
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

// ── Purchase Request list — flat table; line-item level approvals ──
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
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <ListShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              PR
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Item
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Qty
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Total
            </TableHead>
            <TableHead className="w-44 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group, groupIdx) =>
            group.lines.map(({ item, approval }, lineIdx) => {
              const estTotal = item.qty * (item.estimatedRate ?? 0)
              const isMulti = group.lines.length > 1
              const isFirst = lineIdx === 0
              const isLastInGroup = lineIdx === group.lines.length - 1
              return (
                <TableRow
                  key={`${group.pr.id}-${item.id}-${approval.id}`}
                  className={`relative cursor-pointer transition-colors hover:bg-muted/30 ${
                    isMulti && !isLastInGroup ? '[&>td]:border-b-0' : ''
                  }`}
                  onClick={() => onOpen(group.pr.id)}
                >
                  <TableCell className="relative align-middle text-xs font-semibold tabular-nums text-muted-foreground">
                    <RowAccent status={approval.status} />
                    {isFirst ? String(groupIdx + 1).padStart(2, '0') : ''}
                  </TableCell>
                  <TableCell className="align-middle">
                    {isFirst ? (
                      <>
                        <p className="text-sm font-semibold text-primary">{group.pr.prNumber}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {group.pr.salesOrderNumber || formatDate(group.pr.createdAt)}
                          {isMulti ? ` · ${group.lines.length} items` : ''}
                        </p>
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-middle">
                    <p className="text-sm font-medium text-foreground/90">{item.item}</p>
                    <p className="text-[11px] text-muted-foreground">{item.category}</p>
                  </TableCell>
                  <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
                    {item.qty}
                  </TableCell>
                  <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                    {estTotal > 0 ? formatCurrency(estTotal) : '—'}
                  </TableCell>
                  <TableCell className="align-middle text-right" onClick={stopRowClick}>
                    <InlineActions
                      status={approval.status}
                      onApprove={(e) => {
                        e.stopPropagation()
                        actOnPRCategory(group.pr.id, approval.category, currentPM, 'Approved', '')
                      }}
                      onReject={(e) => {
                        e.stopPropagation()
                        actOnPRCategory(group.pr.id, approval.category, currentPM, 'Rejected', '')
                      }}
                    />
                  </TableCell>
                </TableRow>
              )
            }),
          )}
        </TableBody>
      </Table>
    </ListShell>
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
            <TableHead className="w-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              PO
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vendor
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </TableHead>
            <TableHead className="w-44 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                <TableCell className="relative align-middle text-xs font-semibold tabular-nums text-muted-foreground">
                  <RowAccent status={po.pmApprovalStatus} />
                  {String(idx + 1).padStart(2, '0')}
                </TableCell>
                <TableCell className="align-middle">
                  <p className="text-sm font-semibold text-primary">{po.poNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(po.expectedDelivery)}
                  </p>
                </TableCell>
                <TableCell className="align-middle text-sm">{po.vendorName}</TableCell>
                <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                  {myItems.length} / {po.items.length}
                </TableCell>
                <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(po.grandTotal)}
                </TableCell>
                <TableCell className="align-middle text-right" onClick={stopRowClick}>
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

// ── Demo Request list ──
function DemoListView({
  demos,
  currentPM,
  onOpen,
}: {
  demos: DemoRequest[]
  currentPM: string
  onOpen: (id: string) => void
}) {
  const stopRowClick = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <ListShell>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-12 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              #
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Demo
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Return By
            </TableHead>
            <TableHead className="w-44 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demos.map((demo, idx) => {
            const pending = demo.status === 'Pending PM Approval'
            const approved = demo.status === 'PM Approved'
            const rejected = demo.status === 'PM Rejected'
            const accentStatus: 'Pending' | 'Approved' | 'Rejected' | undefined = pending
              ? 'Pending'
              : approved
              ? 'Approved'
              : rejected
              ? 'Rejected'
              : undefined
            const totalQty = demo.items.reduce((s, i) => s + i.qty, 0)
            return (
              <TableRow
                key={demo.id}
                className="relative cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onOpen(demo.id)}
              >
                <TableCell className="relative align-middle text-xs font-semibold tabular-nums text-muted-foreground">
                  <RowAccent status={accentStatus} />
                  {String(idx + 1).padStart(2, '0')}
                </TableCell>
                <TableCell className="align-middle">
                  <p className="text-sm font-semibold text-primary">{demo.demoNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {demo.dealName || demo.leadName || formatDate(demo.createdAt)}
                  </p>
                </TableCell>
                <TableCell className="align-middle text-sm">{demo.accountName}</TableCell>
                <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                  {demo.items.length} line{demo.items.length !== 1 ? 's' : ''} · {totalQty} units
                </TableCell>
                <TableCell className="align-middle text-sm text-muted-foreground">
                  {formatDate(demo.expectedReturnDate)}
                  {demo.isOverdue && demo.overdueByDays ? (
                    <span className="ml-1 text-[11px] font-medium text-destructive">
                      · {demo.overdueByDays}d late
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="align-middle text-right" onClick={stopRowClick}>
                  {pending ? (
                    <InlineActions
                      status="Pending"
                      onApprove={(e) => {
                        e.stopPropagation()
                        actOnDemo(demo.id, 'PM Approved', currentPM, '')
                      }}
                      onReject={(e) => {
                        e.stopPropagation()
                        actOnDemo(demo.id, 'PM Rejected', currentPM, '')
                      }}
                    />
                  ) : approved || rejected ? (
                    <InlineActions
                      status={approved ? 'Approved' : 'Rejected'}
                      onApprove={() => {}}
                      onReject={() => {}}
                    />
                  ) : (
                    <span className="text-[11px] italic text-muted-foreground">
                      {demo.status}
                    </span>
                  )}
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
