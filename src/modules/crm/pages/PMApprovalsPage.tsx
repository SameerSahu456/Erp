import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Input } from '@/components/ui/input'
import { purchaseRequests } from '../data/purchase-requests'
import { demoRequests } from '../data/demo-requests'
import type { PurchaseRequest, PRCategoryApproval, DemoRequest } from '../types'

// PM → Category mapping (derived from Parts data)
const PM_CATEGORIES: Record<string, string[]> = {
  'Vikram Singh': ['Servers', 'Networking', 'Desktops'],
  'Rahul Mehta': ['Laptops', 'UPS & Power', 'Cables & Accessories'],
  'Priya Sharma': ['Storage', 'Monitors', 'Software Licenses'],
}

const ALL_PMS = Object.keys(PM_CATEGORIES)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function PMApprovalsPage() {
  const [currentPM, setCurrentPM] = useState(ALL_PMS[0])

  // ── PR approvals for this PM ──
  const myCategories = PM_CATEGORIES[currentPM] ?? []

  const [localPRs, setLocalPRs] = useState(purchaseRequests)
  const [localDemos, setLocalDemos] = useState(demoRequests)

  // Find PRs that have category approvals assigned to this PM
  const myPRApprovals = useMemo(() => {
    const results: {
      pr: PurchaseRequest
      approvals: PRCategoryApproval[]
      myItems: PurchaseRequest['items']
    }[] = []

    for (const pr of localPRs) {
      const myApprovals = pr.categoryApprovals.filter(
        (a) => a.productManager === currentPM
      )
      if (myApprovals.length > 0) {
        const myCats = myApprovals.map((a) => a.category)
        const myItems = pr.items.filter((item) => myCats.includes(item.category))
        results.push({ pr, approvals: myApprovals, myItems })
      }
    }
    return results
  }, [localPRs, currentPM])

  const pendingPRApprovals = myPRApprovals.filter((r) =>
    r.approvals.some((a) => a.status === 'Pending')
  )
  const completedPRApprovals = myPRApprovals.filter((r) =>
    r.approvals.every((a) => a.status !== 'Pending')
  )

  // ── Demo approvals for this PM ──
  const myDemoApprovals = useMemo(
    () => localDemos.filter((d) => d.productManager === currentPM),
    [localDemos, currentPM]
  )
  const pendingDemos = myDemoApprovals.filter(
    (d) => d.status === 'Pending PM Approval'
  )

  // Stats
  const stats: StatCardData[] = [
    { label: 'Pending PR Approvals', value: pendingPRApprovals.length, variant: pendingPRApprovals.length > 0 ? 'warning' : undefined },
    { label: 'Pending Demo Approvals', value: pendingDemos.length, variant: pendingDemos.length > 0 ? 'warning' : undefined },
    { label: 'My Categories', value: myCategories.length },
    { label: 'Total PRs (mine)', value: myPRApprovals.length },
  ]

  // ── Approve / Reject handlers ──
  const handlePRApproval = (prId: string, category: string, action: 'Approved' | 'Rejected', remarks: string) => {
    setLocalPRs((prev) =>
      prev.map((pr) => {
        if (pr.id !== prId) return pr
        const updated = {
          ...pr,
          categoryApprovals: pr.categoryApprovals.map((a) => {
            if (a.category !== category || a.productManager !== currentPM) return a
            return {
              ...a,
              status: action,
              approvedAt: action === 'Approved' ? new Date().toISOString() : undefined,
              rejectedAt: action === 'Rejected' ? new Date().toISOString() : undefined,
              remarks: remarks || undefined,
            }
          }),
        }
        // Check if all approvals are done
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
    )
    toast.success(`${category} ${action.toLowerCase()} for ${prId}`)
  }

  const handleDemoApproval = (demoId: string, action: 'PM Approved' | 'PM Rejected', remarks: string) => {
    setLocalDemos((prev) =>
      prev.map((d) => {
        if (d.id !== demoId) return d
        return {
          ...d,
          status: action,
          pmApprovalDate: new Date().toISOString(),
          pmRemarks: remarks || undefined,
          approvedBy: action === 'PM Approved' ? currentPM : undefined,
        }
      })
    )
    toast.success(`Demo ${demoId} ${action === 'PM Approved' ? 'approved' : 'rejected'}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            PM Approvals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve Purchase Requests and Demo Requests for your categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Viewing as:</span>
          <Select value={currentPM} onValueChange={(v: string | null) => v && setCurrentPM(v)}>
            <SelectTrigger className="w-52">
              <User className="mr-2 size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_PMS.map((pm) => (
                <SelectItem key={pm} value={pm}>
                  {pm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* My categories */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Your categories:</span>
        <div className="flex flex-wrap gap-1.5">
          {myCategories.map((cat) => (
            <span key={cat} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <StatsRow stats={stats} />

      {/* ── Pending PR Approvals ── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Purchase Request Approvals
          {pendingPRApprovals.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#f6c000]">
              ({pendingPRApprovals.length} pending)
            </span>
          )}
        </h2>

        {pendingPRApprovals.length === 0 && completedPRApprovals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No Purchase Requests require your approval
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending first */}
            {pendingPRApprovals.map(({ pr, approvals, myItems }) => (
              <PRApprovalCard
                key={pr.id}
                pr={pr}
                approvals={approvals}
                myItems={myItems}
                currentPM={currentPM}
                onApprove={handlePRApproval}
              />
            ))}

            {/* Already actioned */}
            {completedPRApprovals.map(({ pr, approvals, myItems }) => (
              <PRApprovalCard
                key={pr.id}
                pr={pr}
                approvals={approvals}
                myItems={myItems}
                currentPM={currentPM}
                onApprove={handlePRApproval}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pending Demo Approvals ── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Demo Request Approvals
          {pendingDemos.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#f6c000]">
              ({pendingDemos.length} pending)
            </span>
          )}
        </h2>

        {myDemoApprovals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No Demo Requests assigned to you
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending first */}
            {pendingDemos.map((demo) => (
              <DemoApprovalCard
                key={demo.id}
                demo={demo}
                onApprove={handleDemoApproval}
              />
            ))}
            {/* Already actioned */}
            {myDemoApprovals
              .filter((d) => d.status !== 'Pending PM Approval')
              .map((demo) => (
                <DemoApprovalCard
                  key={demo.id}
                  demo={demo}
                  onApprove={handleDemoApproval}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── PR Approval Card ──
function PRApprovalCard({
  pr,
  approvals,
  myItems,
  currentPM,
  onApprove,
}: {
  pr: PurchaseRequest
  approvals: PRCategoryApproval[]
  myItems: PurchaseRequest['items']
  currentPM: string
  onApprove: (prId: string, category: string, action: 'Approved' | 'Rejected', remarks: string) => void
}) {
  const [remarks, setRemarks] = useState<Record<string, string>>({})

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{pr.prNumber}</span>
            {pr.salesOrderNumber && (
              <span className="text-xs text-muted-foreground">→ {pr.salesOrderNumber}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            By {pr.requestedBy} · {formatDate(pr.createdAt)}
          </p>
        </div>
        <StatusBadge
          variant={
            pr.status === 'Rejected' ? 'error' :
            pr.status === 'All PMs Approved' || pr.status === 'Final Approved' || pr.status === 'Sent to Procurement' ? 'success' :
            'warning'
          }
        >
          {pr.status}
        </StatusBadge>
      </div>

      {/* Only show MY categories and items */}
      {approvals.map((approval) => {
        const categoryItems = myItems.filter((i) => i.category === approval.category)
        const isPending = approval.status === 'Pending'
        const catRemarks = remarks[approval.category] ?? ''
        const estimatedTotal = categoryItems.reduce(
          (s, i) => s + i.qty * (i.estimatedRate ?? 0),
          0
        )

        return (
          <div key={approval.id} className="border-b last:border-0">
            {/* Category header */}
            <div className={`flex items-center justify-between px-5 py-3 ${
              isPending ? 'bg-[#fff8dd]/60' : ''
            }`}>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {approval.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                  {estimatedTotal > 0 && ` · ${formatCurrency(estimatedTotal)}`}
                </span>
              </div>
              {!isPending && (
                <StatusBadge variant={approval.status === 'Approved' ? 'success' : 'error'}>
                  {approval.status === 'Approved' ? (
                    <><CheckCircle2 className="size-3 mr-1" /> Approved</>
                  ) : (
                    <><XCircle className="size-3 mr-1" /> Rejected</>
                  )}
                </StatusBadge>
              )}
            </div>

            {/* Items in this category */}
            <div className="px-5 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pb-1.5 text-left font-medium">Item</th>
                    <th className="pb-1.5 text-left font-medium">Description</th>
                    <th className="pb-1.5 text-right font-medium">Qty</th>
                    <th className="pb-1.5 text-right font-medium">Est. Rate</th>
                    <th className="pb-1.5 text-right font-medium">Est. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 font-medium">{item.item}</td>
                      <td className="py-2 text-muted-foreground text-xs">{item.description}</td>
                      <td className="py-2 text-right">{item.qty}</td>
                      <td className="py-2 text-right">
                        {item.estimatedRate ? formatCurrency(item.estimatedRate) : '—'}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {item.estimatedRate ? formatCurrency(item.qty * item.estimatedRate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Approval actions */}
              {isPending && (
                <div className="mt-3 flex items-end gap-3 rounded-md bg-muted/30 p-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Remarks (optional)
                    </label>
                    <Input
                      value={catRemarks}
                      onChange={(e) =>
                        setRemarks((prev) => ({ ...prev, [approval.category]: e.target.value }))
                      }
                      placeholder="e.g., Recommend negotiating for better pricing..."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#f1416c] border-[#f1416c]/30 hover:bg-[#fff5f8]"
                    onClick={() => onApprove(pr.id, approval.category, 'Rejected', catRemarks)}
                  >
                    <XCircle className="mr-1 size-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(pr.id, approval.category, 'Approved', catRemarks)}
                  >
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Approve
                  </Button>
                </div>
              )}

              {/* Show remarks if already actioned */}
              {!isPending && approval.remarks && (
                <div className="mt-2 rounded-md bg-muted/30 p-2.5 text-xs italic text-muted-foreground">
                  <span className="font-medium not-italic">Remarks:</span> {approval.remarks}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* PR notes */}
      {pr.notes && (
        <div className="border-t px-5 py-2.5">
          <p className="text-xs text-muted-foreground">{pr.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Demo Approval Card ──
function DemoApprovalCard({
  demo,
  onApprove,
}: {
  demo: DemoRequest
  onApprove: (demoId: string, action: 'PM Approved' | 'PM Rejected', remarks: string) => void
}) {
  const [remarks, setRemarks] = useState('')
  const isPending = demo.status === 'Pending PM Approval'
  const totalItems = demo.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Link to={`/crm/demo-requests/${demo.id}`} className="font-semibold text-primary hover:underline">
              {demo.demoNumber}
            </Link>
            <span className="text-sm text-muted-foreground">· {demo.accountName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            By {demo.requestedBy} · {formatDate(demo.createdAt)} · Return by {formatDate(demo.expectedReturnDate)}
          </p>
        </div>
        <StatusBadge
          variant={
            demo.status === 'PM Approved' ? 'success' :
            demo.status === 'PM Rejected' ? 'error' :
            isPending ? 'warning' : 'info'
          }
        >
          {demo.status}
        </StatusBadge>
      </div>

      {/* Demo items */}
      <div className="px-5 py-3">
        <div className="divide-y">
          {demo.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{item.partName}</p>
                <p className="text-xs text-muted-foreground">{item.brand} · {item.partSku} · {item.category}</p>
              </div>
              <span className="text-sm font-semibold">&times;{item.qty}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Ship to: {demo.shippingAddress}
        </div>

        {/* Approval actions */}
        {isPending && (
          <div className="mt-3 flex items-end gap-3 rounded-md bg-muted/30 p-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Remarks (optional)
              </label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Approved for 2-week demo. Track closely."
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-[#f1416c] border-[#f1416c]/30 hover:bg-[#fff5f8]"
              onClick={() => onApprove(demo.id, 'PM Rejected', remarks)}
            >
              <XCircle className="mr-1 size-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(demo.id, 'PM Approved', remarks)}
            >
              <CheckCircle2 className="mr-1 size-3.5" />
              Approve
            </Button>
          </div>
        )}

        {/* Show remarks if already actioned */}
        {!isPending && demo.pmRemarks && (
          <div className="mt-2 rounded-md bg-muted/30 p-2.5 text-xs italic text-muted-foreground">
            <span className="font-medium not-italic">PM Remarks:</span> {demo.pmRemarks}
          </div>
        )}
      </div>

      {demo.notes && (
        <div className="border-t px-5 py-2.5">
          <p className="text-xs text-muted-foreground">{demo.notes}</p>
        </div>
      )}
    </div>
  )
}

export { PMApprovalsPage }
export default PMApprovalsPage
