import { useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { formatINRCompact } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"
import { useCanSeePmScopedItem } from "@shared/rbac"

import {
  useApproveMIResponse,
  useMIProcurementDetail,
  useMIResponsesForItem,
  useRejectMIResponse,
} from "../../hooks/pm-approvals/useMIResponses"
import type {
  ItemProcurementViewWire,
  MIResponseFullViewWire,
  MIResponsePMStatus,
} from "../../api"
import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"

const S = PM_APPROVALS_STRINGS

const pmStatusVariant: Record<MIResponsePMStatus, StatusBadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
}


// Detail-page card driven by the procurement-side MI detail
// (`GET /procurement/inquiries/{mi_id}`). Lists each item with its response
// summary; each item expands to a per-response table where the PM can
// approve / reject directly. State of each pending response is preserved
// across approvals / rejections via targeted invalidation in the hooks.
export function MIPMApprovalCard({ miId }: { miId: string }) {
  const detailQuery = useMIProcurementDetail(miId)
  const detail = detailQuery.data
  const canSeeItem = useCanSeePmScopedItem()

  if (detailQuery.isLoading && !detail) {
    return <FormCardSkeleton rows={3} />
  }

  if (detailQuery.isError || !detail) {
    return (
      <LoadErrorState
        error={detailQuery.error}
        fallback={S.inquiryCard.loadError}
      />
    )
  }

  // Scope items to the logged-in PM. Superusers see every line; everyone
  // else sees only lines where `product_manager_id` matches their user id.
  // Items without an assignee are hidden from regular PMs (unassigned work
  // doesn't belong on anyone's queue).
  const visibleItems = detail.items.filter((item) =>
    canSeeItem(item.product_manager_id),
  )

  const totalPending = visibleItems.reduce(
    (sum, it) => sum + it.response_summary.pending,
    0,
  )

  return (
    <div className="space-y-6">
      {/* ── Header card — inquiry meta + lead embed ───────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* The inquiry number + status live in the page header (shown once). */}
            <div>
              <Typography variant="helper" asChild>
                <p>
                  {stripHtml(detail.description) || S.inquiryCard.noDescription}
                </p>
              </Typography>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Typography variant="caption" tone="muted" asChild>
                <span>{S.inquiryCard.responsesAwaitingPm(totalPending)}</span>
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {detail.lead && (
              <div>
                <Typography variant="caption" tone="muted" asChild>
                  <dt className="font-semibold uppercase tracking-wider">
                    {S.inquiryCard.metaLabels.lead}
                  </dt>
                </Typography>
                <dd>
                  <Typography variant="body-sm" tone="primary" asChild>
                    <Link to={`/crm/leads/${detail.lead.id}`} className="hover:underline">
                      {detail.lead.lead_code}
                      {detail.lead.company_name
                        ? ` · ${detail.lead.company_name}`
                        : ""}
                    </Link>
                  </Typography>
                  <Typography variant="caption" tone="muted" className="mt-0.5" asChild>
                    <p>
                      {detail.lead.stage} · {detail.lead.priority}
                    </p>
                  </Typography>
                </dd>
              </div>
            )}
            {detail.deal && (
              <div>
                <Typography variant="caption" tone="muted" asChild>
                  <dt className="font-semibold uppercase tracking-wider">
                    {S.inquiryCard.metaLabels.deal}
                  </dt>
                </Typography>
                <dd>
                  <Typography variant="body-sm" tone="primary" asChild>
                    <Link to={`/crm/deals/${detail.deal.id}`} className="hover:underline">
                      {detail.deal.deal_number}
                      {detail.deal.company_name
                        ? ` · ${detail.deal.company_name}`
                        : ""}
                    </Link>
                  </Typography>
                  <Typography variant="caption" tone="muted" className="mt-0.5" asChild>
                    <p>
                      {detail.deal.stage} · {detail.deal.priority}
                    </p>
                  </Typography>
                </dd>
              </div>
            )}
            {detail.client_budget != null && detail.client_budget > 0 && (
              <div>
                <Typography variant="caption" tone="muted" asChild>
                  <dt className="font-semibold uppercase tracking-wider">
                    {S.inquiryCard.metaLabels.clientBudget}
                  </dt>
                </Typography>
                <Typography variant="body-strong" numeric asChild>
                  <dd>{formatINRCompact(detail.client_budget)}</dd>
                </Typography>
              </div>
            )}
            {detail.client_timeline && (
              <div>
                <Typography variant="caption" tone="muted" asChild>
                  <dt className="font-semibold uppercase tracking-wider">
                    {S.inquiryCard.metaLabels.timeline}
                  </dt>
                </Typography>
                <Typography variant="body-sm" asChild>
                  <dd>{detail.client_timeline}</dd>
                </Typography>
              </div>
            )}
          </dl>
          {detail.notes && (
            <div className="mt-4 rounded-md bg-muted/30 p-3">
              <Typography variant="caption" tone="muted" asChild>
                <div className="font-semibold uppercase tracking-wider">
                  {S.inquiryCard.metaLabels.notes}
                </div>
              </Typography>
              <Typography variant="body-sm" className="mt-1" asChild>
                <p className="whitespace-pre-wrap break-words">{stripHtml(detail.notes)}</p>
              </Typography>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Per-item response cards ──────────────────────────── */}
      {visibleItems.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <Typography variant="body" tone="muted" asChild>
              <p>
                {detail.items.length === 0
                  ? S.inquiryCard.noItems
                  : S.inquiryCard.noAssignedItems}
              </p>
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => (
            <ItemApprovalCard key={item.id} miId={miId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemApprovalCard({
  miId,
  item,
}: {
  miId: string
  item: ItemProcurementViewWire
}) {
  const responsesQuery = useMIResponsesForItem(miId, item.id)
  const responses = responsesQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography variant="card-title">{item.item_name}</Typography>
            <Typography variant="helper" className="mt-1" asChild>
              <p>
                {S.itemCard.qtyPrefix} {item.qty_requested}
                {item.client_budget_per_unit != null
                  ? ` · ${S.itemCard.budgetPerUnit(formatINRCompact(item.client_budget_per_unit))}`
                  : ""}
                {item.client_timeline ? ` · ${item.client_timeline}` : ""}
                {item.category ? ` · ${item.category.name}` : ""}
              </p>
            </Typography>
          </div>
          <div className="text-right">
            <Typography variant="caption" tone="muted" asChild>
              <div>
                <span className="font-semibold text-foreground tabular-nums">
                  {item.qty_allocated_total}
                </span>{" "}
                {S.itemCard.allocated} · {item.qty_remaining} {S.itemCard.remaining}
              </div>
            </Typography>
            {item.blended_sell_price != null && (
              <Typography variant="caption" tone="muted" asChild>
                <div>
                  {S.itemCard.blendedSell(formatINRCompact(item.blended_sell_price))}
                </div>
              </Typography>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {responsesQuery.isLoading && responses.length === 0 ? (
          <Typography variant="helper" align="center" className="py-6" asChild>
            <p>
              {S.itemCard.loadingResponses}
            </p>
          </Typography>
        ) : responsesQuery.isError ? (
          <LoadErrorState
            error={responsesQuery.error}
            fallback={S.itemCard.cantLoadResponses}
            compact
          />
        ) : responses.length === 0 ? (
          <Typography variant="body" tone="muted" align="center" asChild>
            <div className="rounded-md border border-dashed py-6">
              {S.itemCard.noResponses}
            </div>
          </Typography>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{S.itemCard.columns.vendor}</TableHead>
                  <TableHead className="text-right">{S.itemCard.columns.qtyAvail}</TableHead>
                  <TableHead className="text-right">{S.itemCard.columns.costPerUnit}</TableHead>
                  <TableHead className="text-right">{S.itemCard.columns.sellPerUnit}</TableHead>
                  <TableHead>{S.itemCard.columns.available}</TableHead>
                  <TableHead>{S.itemCard.columns.status}</TableHead>
                  <TableHead className="w-32 text-right">{S.itemCard.columns.action}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((r) => (
                  <ResponseActionRow
                    key={r.id}
                    miId={miId}
                    itemId={item.id}
                    response={r}
                    qtyRemaining={item.qty_remaining}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ResponseActionRow({
  miId,
  itemId,
  response,
  qtyRemaining,
}: {
  miId: string
  itemId: string
  response: MIResponseFullViewWire
  qtyRemaining: number
}) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const canAct = response.pm_status === "pending"

  return (
    <TableRow>
      <TableCell>
        <div>
          <Typography variant="body-strong" asChild><p>{response.vendor.name}</p></Typography>
          <Typography variant="caption" tone="muted" asChild>
            <p className="font-mono">{response.vendor.code}</p>
          </Typography>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {response.qty_available}
        {response.qty_allocated > 0 && (
          <Typography variant="caption" tone="muted" className="ml-1" asChild>
            <span>{S.responseRow.allocSuffix(response.qty_allocated)}</span>
          </Typography>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatINRCompact(response.cost_price)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {response.sell_price != null ? (
          `${formatINRCompact(response.sell_price)}`
        ) : (
          <Typography variant="helper" asChild><span>—</span></Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body-sm" asChild>
          <span>
            {response.available_date ? formatIST_date(response.available_date) : "—"}
          </span>
        </Typography>
      </TableCell>
      <TableCell>
        <PMDecisionBadge status={response.pm_status} />
        {response.pm_actioned_at && (
          <Typography variant="caption" tone="muted" className="mt-0.5" asChild>
            <div>{formatIST_date(response.pm_actioned_at)}</div>
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {canAct ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="text-success hover:bg-success/10"
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle2 className="mr-1 size-3.5" />
              {S.responseRow.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="mr-1 size-3.5" />
              {S.responseRow.reject}
            </Button>
            <ApproveDialog
              open={approveOpen}
              onOpenChange={setApproveOpen}
              miId={miId}
              itemId={itemId}
              response={response}
              qtyRemaining={qtyRemaining}
            />
            <RejectDialog
              open={rejectOpen}
              onOpenChange={setRejectOpen}
              miId={miId}
              itemId={itemId}
              response={response}
            />
          </div>
        ) : (
          <Typography variant="helper" className="italic" asChild><span>—</span></Typography>
        )}
      </TableCell>
    </TableRow>
  )
}

function PMDecisionBadge({ status }: { status: MIResponsePMStatus }) {
  if (status === "approved") {
    return (
      <StatusBadge variant={pmStatusVariant.approved}>
        <CheckCircle2 className="mr-1 size-3" />
        {S.pmStatus.approved}
      </StatusBadge>
    )
  }
  if (status === "rejected") {
    return (
      <StatusBadge variant={pmStatusVariant.rejected}>
        <XCircle className="mr-1 size-3" />
        {S.pmStatus.rejected}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge variant={pmStatusVariant.pending}>
      <Clock className="mr-1 size-3" />
      {S.pmStatus.pending}
    </StatusBadge>
  )
}

// ── Approve dialog ──────────────────────────────────────────────
//
// Backend (MIResponsePMApprove): qty_allocated required; margin_pct and
// sell_price both optional — leave either or both blank and the server
// fills in (default margin) or derives the missing side. Service then
// validates margin/sell consistency if both are supplied.

function ApproveDialog({
  open,
  onOpenChange,
  miId,
  itemId,
  response,
  qtyRemaining,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  miId: string
  itemId: string
  response: MIResponseFullViewWire
  qtyRemaining: number
}) {
  // Default qty allocated to min(qty_available, qty_remaining) so the PM
  // doesn't over-allocate by accident. They can still bump it up — backend
  // will 422 if it exceeds the line cap.
  const defaultQty = Math.max(0, Math.min(response.qty_available, qtyRemaining))

  const [qtyAllocated, setQtyAllocated] = useState(String(defaultQty))
  const [marginPct, setMarginPct] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [pmNotes, setPmNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  const approveMut = useApproveMIResponse(miId)

  // Any typed input makes the modal dirty → OperationDialog's discard guard
  // fires on Cancel / Esc / backdrop / × instead of dropping the work silently.
  const dirty =
    qtyAllocated !== String(defaultQty) ||
    marginPct.trim() !== "" ||
    sellPrice.trim() !== "" ||
    pmNotes.trim() !== ""

  function reset() {
    setQtyAllocated(String(defaultQty))
    setMarginPct("")
    setSellPrice("")
    setPmNotes("")
    setError(null)
  }

  async function handleApprove() {
    setError(null)
    const qty = parseInt(qtyAllocated, 10)
    if (!Number.isFinite(qty) || qty < 0) return setError(S.approveDialog.qtyError)

    const body: Parameters<typeof approveMut.mutateAsync>[0]["body"] = {
      qty_allocated: qty,
    }

    if (marginPct.trim() !== "") {
      const m = Number(marginPct)
      if (!Number.isFinite(m) || m < 0 || m > 100) {
        return setError(S.approveDialog.marginError)
      }
      body.margin_pct = m
    }
    if (sellPrice.trim() !== "") {
      const s = Number(sellPrice)
      if (!Number.isFinite(s) || s < 0) return setError(S.approveDialog.sellPriceError)
      if (s < response.cost_price) {
        return setError(S.approveDialog.sellPriceBelowCost(s, response.cost_price))
      }
      body.sell_price = s
    }
    if (pmNotes.trim()) body.pm_notes = pmNotes.trim()

    try {
      await approveMut.mutateAsync({ respId: response.id, itemId, body })
      reset()
      onOpenChange(false)
    } catch {
      // hook already toasts
    }
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
      title={S.approveDialog.title}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={approveMut.isPending}
          >
            {S.approveDialog.cancel}
          </Button>
          <Button onClick={handleApprove} disabled={approveMut.isPending}>
            {approveMut.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {approveMut.isPending ? S.approveDialog.approving : S.approveDialog.approve}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <Typography variant="body-strong" asChild>
            <p>{response.vendor.name}</p>
          </Typography>
          <Typography variant="helper" tone="muted" asChild>
            <p>
              {S.approveDialog.vendorSummary(
                response.vendor.name,
                response.qty_available,
                formatINRCompact(response.cost_price),
                qtyRemaining,
              )}
            </p>
          </Typography>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mi-approve-qty">
            {S.approveDialog.qtyAllocatedLabel}{" "}
            <span className="text-destructive">{S.approveDialog.qtyAllocatedRequired}</span>
          </Label>
          <Input
            id="mi-approve-qty"
            type="number"
            min={0}
            max={response.qty_available}
            value={qtyAllocated}
            onChange={(e) => setQtyAllocated(e.target.value)}
          />
          <Typography variant="helper" tone="muted" asChild>
            <p>{S.approveDialog.qtyAllocatedHint(response.qty_available)}</p>
          </Typography>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mi-approve-margin">{S.approveDialog.marginPctLabel}</Label>
            <Input
              id="mi-approve-margin"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={marginPct}
              onChange={(e) => setMarginPct(e.target.value)}
              placeholder={S.approveDialog.marginPctPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mi-approve-sell">{S.approveDialog.sellPriceLabel}</Label>
            <Input
              id="mi-approve-sell"
              type="number"
              min={response.cost_price}
              step="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder={String(response.cost_price)}
            />
          </div>
          <Typography variant="helper" tone="muted" className="col-span-2" asChild>
            <p>{S.approveDialog.pricingHint(formatINRCompact(response.cost_price))}</p>
          </Typography>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mi-approve-notes">{S.approveDialog.pmNotesLabel}</Label>
          <Textarea
            id="mi-approve-notes"
            value={pmNotes}
            onChange={(e) => setPmNotes(e.target.value)}
            placeholder={S.approveDialog.pmNotesPlaceholder}
            rows={2}
          />
        </div>

        {error && (
          <Typography variant="helper" tone="danger" role="alert" asChild>
            <p>{error}</p>
          </Typography>
        )}
      </div>
    </OperationDialog>
  )
}

function RejectDialog({
  open,
  onOpenChange,
  miId,
  itemId,
  response,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  miId: string
  itemId: string
  response: MIResponseFullViewWire
}) {
  const rejectMut = useRejectMIResponse(miId)
  const [pmNotes, setPmNotes] = useState("")

  const dirty = pmNotes.trim() !== ""

  async function handleReject() {
    try {
      await rejectMut.mutateAsync({
        respId: response.id,
        itemId,
        body: pmNotes.trim() ? { pm_notes: pmNotes.trim() } : undefined,
      })
      setPmNotes("")
      onOpenChange(false)
    } catch {
      // hook already toasts
    }
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setPmNotes("")
      }}
      title={S.rejectDialog.title}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={rejectMut.isPending}
          >
            {S.rejectDialog.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectMut.isPending}
          >
            {rejectMut.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {rejectMut.isPending ? S.rejectDialog.rejecting : S.rejectDialog.confirmRejection}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <Typography variant="body" tone="muted" asChild>
          <p>
            {S.rejectDialog.bodyPrefix}{" "}
            <span className="font-medium text-foreground">{response.vendor.name}</span>
            {S.rejectDialog.bodySuffix}
          </p>
        </Typography>
        <div className="space-y-1.5">
          <Label htmlFor="mi-reject-notes">{S.rejectDialog.reasonLabel}</Label>
          <Textarea
            id="mi-reject-notes"
            value={pmNotes}
            onChange={(e) => setPmNotes(e.target.value)}
            placeholder={S.rejectDialog.reasonPlaceholder}
            rows={3}
          />
        </div>
      </div>
    </OperationDialog>
  )
}
