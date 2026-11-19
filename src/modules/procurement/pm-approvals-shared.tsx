import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, MapPin, ThumbsDown, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/currency'
import { Typography } from '@/components/ui/typography'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { PopupClampText } from '@/components/common/display/PopupClampText'
import type { DemoRequest } from '@/modules/crm/types'
import { formatIST_date } from "@shared/lib/date"
import { PM_APPROVALS_SHARED_STRINGS as S } from './pm-approvals-shared.strings'
import { AccountLink } from './components/pm-approvals/RecordLink'

// ── Formatters ──
export function formatDate(dateStr: string) {
  return formatIST_date(dateStr)
}

// One money formatter app-wide (§14.16): delegate to the shared `formatINR`
// instead of a second inline Intl.NumberFormat. Kept as a local alias so the
// demo card's call sites read unchanged.
export function formatCurrency(amount: number) {
  return formatINR(amount)
}

export function isPending(status: 'Pending' | 'Approved' | 'Rejected' | undefined) {
  return !status || status === 'Pending'
}

export function DemoApprovalCard({
  demo,
  onApprove,
}: {
  demo: DemoRequest
  onApprove: (
    demoId: string,
    action: 'PM Approved' | 'PM Rejected',
    remarks: string,
    pricedItems?: Array<{ id: string; unitPrice: number }>,
  ) => void
}) {
  const [pendingAction, setPendingAction] = useState<{
    action: 'PM Approved' | 'PM Rejected'
    item: DemoRequest['items'][number]
  } | null>(null)
  const [itemNote, setItemNote] = useState('')
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const pending = demo.status === 'Pending PM Approval'

  const decisionOpen = pendingAction !== null
  const decisionDirty = itemNote.trim() !== ''

  // Browser refresh / tab-close guard for the decision modal — only active
  // while the modal is open and the PM has typed something.
  useEffect(() => {
    if (!decisionOpen || !decisionDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [decisionOpen, decisionDirty])

  function closeDecision() {
    setPendingAction(null)
    setItemNote('')
  }
  const hasPendingItems = demo.items.some(
    (item) => (item.pmStatus ?? (pending ? 'Pending' : undefined)) === 'Pending',
  )

  // Only fed the commented-out "Approved value" headline.
  // const total = demo.items.reduce(
  //   (sum, item) => sum + (item.unitPrice ?? 0) * item.qty,
  //   0,
  // )

  function openAction(action: 'PM Approved' | 'PM Rejected', item: DemoRequest['items'][number]) {
    setPendingAction({ action, item })
    setItemNote('')
  }

  function handleConfirmAction() {
    if (!pendingAction) return
    const note = itemNote.trim()
    if (!note) return
    const priced = [
      {
        id: pendingAction.item.id,
        unitPrice: pendingAction.item.unitPrice ?? 0,
      },
    ]
    onApprove(demo.id, pendingAction.action, note, priced)
    setPendingAction(null)
    setItemNote('')
  }

  // Same frame as the SO approval panel (SalesOrderApprovalDetailPanel):
  // gradient summary header with a headline figure on the right + header
  // facts, then a padded line table with muted headers and outlined,
  // toned Approve / Reject buttons.
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Summary header ────────────────────────────────────────── */}
      <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
        {/* The demo number + status live in the page header (shown once).
            Line 1: "By … · date · Return by …". Line 2: account name (code). */}
        <Typography variant="helper" tone="muted" asChild>
          <p>
            {S.demoMeta.byLine(demo.requestedBy, formatDate(demo.createdAt), formatDate(demo.expectedReturnDate))}
          </p>
        </Typography>
        {demo.accountName ? (
          <Typography variant="helper" tone="muted" truncate className="mt-1 min-w-0" asChild>
            <p title={demo.accountName}>
              <AccountLink accountId={demo.accountId}>{demo.accountName}</AccountLink>
            </p>
          </Typography>
        ) : null}
        {/* "Approved value" headline — commented out per request.
        <div className="text-right">
          <Typography variant="micro" tone="muted" className="uppercase tracking-wider" asChild>
            <p>{S.demoTable.approvedValue}</p>
          </Typography>
          <Typography variant="section-title" numeric asChild>
            <p>{formatCurrency(total)}</p>
          </Typography>
        </div> */}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <HeaderFact label={S.demoTable.shipToLabel}>
              <span className="inline-flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="break-words font-normal text-foreground/90">
                  {demo.shippingAddress}
                </span>
              </span>
            </HeaderFact>
          </div>
          {demo.notes ? (
            <div className="sm:col-span-3">
              <HeaderFact label={S.demoTable.notesLabel}>
                <PopupClampText
                  text={demo.notes}
                  title={S.demoTable.notesLabel}
                  showMoreLabel={S.demoTable.showMore}
                  className="font-normal text-foreground/90"
                />
              </HeaderFact>
            </div>
          ) : null}
          {!hasPendingItems && demo.pmRemarks ? (
            <div className="sm:col-span-3">
              <HeaderFact label={S.demoTable.pmRemarksLabel}>
                <PopupClampText
                  text={demo.pmRemarks}
                  title={S.demoTable.pmRemarksLabel}
                  showMoreLabel={S.demoTable.showMore}
                  className="font-normal text-foreground/90"
                />
              </HeaderFact>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ── Lines table ───────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <DemoHeadCell>{S.demoTable.colItem}</DemoHeadCell>
              <DemoHeadCell className="text-right">{S.demoTable.colQty}</DemoHeadCell>
              <DemoHeadCell className="text-right">{S.demoTable.colUnitPrice}</DemoHeadCell>
              <DemoHeadCell className="text-right">{S.demoTable.colTax}</DemoHeadCell>
              <DemoHeadCell className="text-right">{S.demoTable.colAmount}</DemoHeadCell>
              <DemoHeadCell className="w-72 text-right">{S.demoTable.colDecision}</DemoHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demo.items.map((item) => {
              const lineAmount = (item.unitPrice ?? 0) * item.qty
              const lineStatus =
                item.pmStatus ??
                (demo.status === 'PM Approved'
                  ? 'Approved' // eslint-disable-line i18next/no-literal-string
                  : demo.status === 'PM Rejected'
                  ? 'Rejected' // eslint-disable-line i18next/no-literal-string
                  : pending
                  ? 'Pending' // eslint-disable-line i18next/no-literal-string
                  : undefined)
              return (
                <TableRow key={item.id} className="bg-muted/5">
                  <TableCell className="align-middle">
                    <div className="max-w-[420px]">
                      <Typography variant="body-strong" tone="inherit" truncate asChild>
                        <p className="text-foreground/90">{item.partName}</p>
                      </Typography>
                      <Typography variant="caption" truncate asChild>
                        <p>
                          {item.brand} · {item.partSku} · {item.category}
                        </p>
                      </Typography>
                    </div>
                  </TableCell>
                  <Typography variant="body" asChild>
                    <TableCell className="align-middle text-right tabular-nums">{item.qty}</TableCell>
                  </Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <TableCell className="align-middle text-right tabular-nums">
                      {formatCurrency(item.unitPrice ?? 0)}
                    </TableCell>
                  </Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <TableCell className="align-middle text-right tabular-nums">
                      {`${item.taxRate ?? 0}%`}
                    </TableCell>
                  </Typography>
                  <Typography variant="body" asChild>
                    <TableCell className="align-middle text-right font-semibold tabular-nums">
                      {formatCurrency(lineAmount)}
                    </TableCell>
                  </Typography>
                  <TableCell className="align-middle text-right">
                    {item.canApprove ? (
                      // Backend says this caller can act on this line right now.
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-success/40 text-success hover:bg-success/10"
                          onClick={() => openAction('PM Approved', item)}
                        >
                          <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                          {S.demoTable.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => openAction('PM Rejected', item)}
                        >
                          <ThumbsDown className="size-3.5" data-icon="inline-start" />
                          {S.demoTable.reject}
                        </Button>
                      </div>
                    ) : (
                      // Not actionable by this caller — read-only verdict,
                      // icon + status like the SO panel's decided row.
                      <div className="flex items-center justify-end gap-1.5">
                        {lineStatus === 'Approved' ? (
                          <CheckCircle2 className="size-3.5 text-success" />
                        ) : lineStatus === 'Rejected' ? (
                          <XCircle className="size-3.5 text-destructive" />
                        ) : (
                          <Clock className="size-3.5 text-muted-foreground" />
                        )}
                        <Typography
                          variant="caption"
                          tone={lineStatus === 'Approved' ? 'success' : lineStatus === 'Rejected' ? 'danger' : 'muted'}
                          className="font-semibold"
                          asChild
                        >
                          <span>
                            {lineStatus === 'Approved'
                              ? S.demoTable.approved
                              : lineStatus === 'Rejected'
                              ? S.demoTable.rejected
                              : S.demoTable.pending}
                          </span>
                        </Typography>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={decisionOpen}
        onOpenChange={(next) => {
          if (!next && decisionDirty) {
            // The PM typed a note — confirm before throwing it away on
            // outside-click / ESC / X.
            setConfirmCloseOpen(true)
            return
          }
          if (!next) closeDecision()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === 'PM Approved' ? S.decisionDialog.approveTitle : S.decisionDialog.rejectTitle}
            </DialogTitle>
            <DialogDescription>
              {S.decisionDialog.description(pendingAction?.item.partName ?? S.decisionDialog.fallbackPartName)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={itemNote}
            onChange={(e) => setItemNote(e.target.value)}
            placeholder={
              pendingAction?.action === 'PM Approved'
                ? S.decisionDialog.approvePlaceholder
                : S.decisionDialog.rejectPlaceholder
            }
            className="min-h-24"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (decisionDirty) {
                  setConfirmCloseOpen(true)
                  return
                }
                closeDecision()
              }}
            >
              {S.decisionDialog.cancel}
            </Button>
            <Button
              variant={pendingAction?.action === 'PM Rejected' ? 'destructive' : 'default'}
              disabled={!itemNote.trim()}
              onClick={handleConfirmAction}
            >
              {pendingAction?.action === 'PM Approved' ? S.decisionDialog.approveAction : S.decisionDialog.rejectAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onConfirm={() => {
          setConfirmCloseOpen(false)
          closeDecision()
        }}
      />
    </div>
  )
}

/** Muted uppercase label over a value — the SO approval panel's header fact. */
function HeaderFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Typography variant="micro" tone="muted" className="uppercase tracking-wider" asChild>
        <dt>{label}</dt>
      </Typography>
      <Typography variant="body" className="mt-0.5 font-medium" asChild>
        <dd>{children}</dd>
      </Typography>
    </div>
  )
}

function DemoHeadCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Typography variant="caption" tone="muted" asChild>
      <TableHead className={`font-medium ${className ?? ''}`}>{children}</TableHead>
    </Typography>
  )
}
