import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Calendar,
  CreditCard,
  Building2,
  Warehouse,
  User,
  Gauge,
  Package,
  Receipt,
  FileDown,
  NotebookText,
  History,
  Contact,
  OctagonX,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { EntityHeader } from "@/components/page-shells/EntityHeader"
import { usePermission } from "@shared/rbac"

import { procurementCan } from "../../permissions"


import { StatusBadge } from "@/components/common/display/StatusBadge"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { formatIST_date } from "@shared/lib/date"

import {
  useDownloadPurchaseOrderPdf,
  usePurchaseOrder,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useClonePurchaseOrder,
  useAmendPurchaseOrder,
  usePurchaseOrderVersions,
  usePurchaseOrderReturns,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import {
  poStatusLabel,
  poStatusVariant,
  approvalLabel,
  approvalVariant,
} from "../../constants"
import { PoPendingChanges } from "./PoPendingChanges"
import { PoVersionTrail } from "./PoVersionTrail"
import { POCloseDialog, POCancelDialog } from "./POCloseCancelDialogs"
import { PODocumentsSection } from "./PODocumentsSection"
import { POCreditBanner } from "./POCreditBanner"
import { POReturnsTab } from "./POReturnsTab"
import { POGrnsTab } from "./POGrnsTab"
import { PODevicesTab } from "./PODevicesTab"
import { poDeviceParams, poGrnParams } from "./po-receipts-query"
import { useDevices, useGrnBatches, wmsCan, wmsPermissions } from "@modules/wms"
import { DetailTabs, type DetailTab } from "@/components/page-shells/DetailTabs"
import { isRejectedSnapshot, snapshotLines, snapshotRejections } from "../../api"
import { poLineKey, summarizeRejectedChange } from "./poAmendLine"
import type {
  PurchaseReturnItem,
} from "../../api"
import { InfoCard } from "./InfoCard"
import { MiniBar } from "./MiniBar"
import { LineItemsTable } from "./LineItemsTable"
import { DetailRow } from "./DetailRow"
import { DASH, DETAIL_S, money, pct } from "./po-detail-helpers"

export function PODetailBody() {
  // Backend gate: every PO write path (submit / edit / clone / amend / close /
  // cancel) → writePo. Approve / reject → approvePo. Compute once and gate the
  // buttons below.
  const { can } = usePermission()
  const canWrite = can(procurementCan.writePo)
  const canApprove = can(procurementCan.approvePo)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // `include: "returns"` attaches `credit_rollup` (returned / undecided unit
  // counts + credit totals) that the credit banner + close-block need.
  const { data: po, isLoading, isError, error } = usePurchaseOrder(id, {
    include: "returns",
  })
  const { data: returns } = usePurchaseOrderReturns(id)
  // Tab counts for GRNs / Devices. Same params as each tab's page 1, so the
  // open tab reuses this request instead of firing a second one. GRNs need
  // wms:inward_* (the list endpoint 403s otherwise) — the tab hides without it.
  const canSeeGrns = can(wmsCan.inwardView)
  // The Devices tab's engineer filter lists the warehouse team (wms:team_*).
  const canPickEngineer = can([wmsPermissions.TEAM_READ, wmsPermissions.TEAM_MANAGE])
  const { data: grnPage } = useGrnBatches(poGrnParams(id ?? ""), {
    enabled: !!id && canSeeGrns,
  })
  const { data: devicePage } = useDevices(poDeviceParams(id ?? ""), { enabled: !!id })
  const submitPo = useSubmitPurchaseOrder()
  const approvePo = useApprovePurchaseOrder()
  const rejectPo = useRejectPurchaseOrder()
  const clonePo = useClonePurchaseOrder()
  const downloadPdf = useDownloadPurchaseOrderPdf()
  const amendPo = useAmendPurchaseOrder()
  const { data: versions } = usePurchaseOrderVersions(id)
  const [closeOpen, setCloseOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  // A load failure (incl. a 403 permission boundary) routes through the shared
  // error slot, which keeps the backend message but styles it — and shows the
  // friendly NoAccess view for a 403 instead of "not found".
  if (isError) {
    return <LoadErrorState error={error} fallback={DETAIL_S.loadFailed} />
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <Typography variant="card-title">{DETAIL_S.notFoundTitle}</Typography>
        <Typography variant="body" tone="muted" asChild>
          <p>{DETAIL_S.notFoundDescription}</p>
        </Typography>
        <Button variant="outline" render={<Link to="/procurement/po" />}>
          {DETAIL_S.backToPOs}
        </Button>
      </div>
    )
  }

  const creatorName = po.created_by_name ?? DASH
  // "Approved By" — the approver's name off the PO response, with the
  // approval timestamp appended when present (the row layout truncates).
  const approvedByValue = po.approved_by
    ? po.approved_at
      ? `${po.approved_by} · ${formatIST_date(po.approved_at)}`
      : po.approved_by
    : DASH
  // Vendor postal address (SupplierBrief, PROCUREMENT_BE_CHANGES #3) — composed
  // like the warehouse address; undefined when the vendor has none on file.
  const vendorAddress = po.supplier
    ? [
        po.supplier.line1,
        po.supplier.line2,
        po.supplier.city,
        po.supplier.state,
        po.supplier.pincode,
      ]
        .filter(Boolean)
        .join(", ") || undefined
    : undefined

  const totalOrdered = po.items.reduce((s, it) => s + it.ordered_quantity, 0)
  const totalReceived = po.items.reduce((s, it) => s + it.received_quantity, 0)
  const fulfilment = pct(totalReceived, totalOrdered)

  // Returns audit trail: group each return's units by their source PO line so
  // the line table can show a live per-line `Returned` count, and keep the flat
  // list for the Returns section + credit banner + close-block.
  const returnsList = returns ?? []
  const returnsByLine = new Map<string, PurchaseReturnItem[]>()
  for (const ret of returnsList) {
    for (const it of ret.items) {
      const arr = returnsByLine.get(it.purchase_order_item_id) ?? []
      arr.push(it)
      returnsByLine.set(it.purchase_order_item_id, arr)
    }
  }
  const creditRollup = po.credit_rollup ?? null
  const hasCredit = creditRollup !== null && Number(creditRollup.credit_total) > 0

  const poId = po.id
  const isDraft = po.status === "draft"
  const isPending =
    po.approval_status === "pending" || po.approval_status === "partially_approved"
  const isRejected = po.approval_status === "rejected"
  // Reason(s) a first-time rejection carries on its lines (pm_notes) — shown once
  // in a banner above the line items, deduped (the whole PO is usually rejected
  // with a single note), instead of under each line's status badge.
  const rejectionReasons = isRejected
    ? Array.from(
        new Set(
          po.items
            .filter((it) => it.pm_status === "rejected" && it.pm_notes)
            .map((it) => it.pm_notes as string),
        ),
      )
    : []
  const isReceivable = po.status === "issued" || po.status === "partially_received"
  // Amend + Close share the same status window: issued / partially_received /
  // received. A fully received PO is NOT terminal — an approved additive
  // amendment reopens it (spec-po-close-cancel-and-documents §A).
  const isAmendable = isReceivable || po.status === "received"
  const hasOpenAmendment = versions?.some(
    (v) => v.status === "draft" || v.status === "pending",
  )
  // An open amendment (draft OR pending) replaces the live Line-items card with
  // its own amended-lines table (rendered by PoPendingChanges), so hide the
  // live one while one is open.
  const openAmendment =
    versions?.find((v) => v.status === "draft" || v.status === "pending") ?? null
  // While an amendment is open, the Order Details totals reflect the proposed
  // (amended) lines — from the snapshot's per-line money — so they match the
  // amended line-items table shown above. The live po.* totals are stale until
  // the amendment is applied.
  const stagedTotals = openAmendment
    ? snapshotLines(openAmendment).reduce(
        (acc, l) => ({
          subtotal: acc.subtotal + Number(l.line_total || 0),
          tax: acc.tax + Number(l.line_tax || 0),
          grand: acc.grand + Number(l.line_total_with_tax || 0),
        }),
        { subtotal: 0, tax: 0, grand: 0 },
      )
    : null
  const canAmendIssued =
    isAmendable &&
    !hasOpenAmendment &&
    (po.approval_status === "not_required" || po.approval_status === "approved")
  // Close is the terminal action, offered ONLY once the PO is fully received
  // ("received"). The backend also permits short-closing an issued /
  // partially-received PO, but per product decision (2026-07-08) that path is
  // intentionally not surfaced in the UI — Close appears only at Fully Received.
  // Still blocked while an open amendment exists (the backend rejects it) —
  // shown disabled with a hint rather than hidden, so the user learns why.
  const canClose = po.status === "received"
  const closeBlocked = Boolean(hasOpenAmendment)
  // Cancel = "created in error": backend only allows an issued PO with zero
  // receipts. Anything received must be short-closed instead.
  const canCancel = po.status === "issued" && totalReceived === 0
  const isTerminal = po.status === "closed" || po.status === "cancelled"
  const isShortClosed = po.status === "closed" && totalReceived < totalOrdered
  // The PO document is only downloadable once it's an approved, placed order —
  // never while it's a draft or still awaiting approval (submitted / partially
  // approved / rejected all count as "not approved yet").
  const canDownload =
    po.status !== "draft" &&
    po.approval_status !== "pending" &&
    po.approval_status !== "partially_approved" &&
    po.approval_status !== "rejected"
  const anyPending = [submitPo, approvePo, rejectPo, clonePo, amendPo].some((m) => m.isPending)
  const hasActionableCategories = po.items.some((it) => it.can_act)
  const historicalVersions = (versions ?? []).filter((v) => v.status === "historical")
  // The live PO sits at its newest APPLIED snapshot. A rejected amendment is a
  // historical snapshot too but never became the live version, so exclude it —
  // and the current version is that snapshot's OWN version_number, not a count
  // (v1 is the baseline; counting snapshots double-counted it and any rejects,
  // which is why a brand-new PO wrongly read "v2").
  const appliedVersions = historicalVersions.filter((v) => !isRejectedSnapshot(v))
  const currentVersion = appliedVersions[0]?.version_number ?? 1
  // Show the rejection callout only when the MOST RECENT amendment was rejected
  // (versions are newest-first). Once the maker re-amends, the newest snapshot
  // becomes a draft/pending (open) again, or an applied historical on success —
  // either way this auto-hides, so a superseded rejection never lingers.
  const latestVersion = versions?.[0]
  const rejectedAmendment =
    latestVersion && isRejectedSnapshot(latestVersion) ? latestVersion : null

  // Live line ids whose most recent amendment was rejected — each such line sits
  // at its APPROVED value but gets an "Amendment rejected" marker in the table.
  // Correlate the rejected snapshot line to its live line by source_line_id
  // (survives a description edit), falling back to the content key. Plain const
  // (not useMemo) — it sits after the loading/error early returns, and the work
  // is trivially cheap.
  const amendmentRejections = ((): Map<string, { reason: string; changes: string[] }> => {
    const map = new Map<string, { reason: string; changes: string[] }>()
    if (!rejectedAmendment) return map
    const liveById = new Map(po.items.map((it) => [it.id, it]))
    const liveByKey = new Map(po.items.map((it) => [poLineKey(it), it]))
    for (const { line, reason } of snapshotRejections(rejectedAmendment)) {
      const live =
        (line.source_line_id ? liveById.get(line.source_line_id) : undefined) ??
        liveByKey.get(poLineKey(line))
      if (live) map.set(live.id, { reason: reason ?? "", changes: summarizeRejectedChange(line, live) })
    }
    return map
  })()

  // A first-attempt rejection keeps the lifecycle at `draft`, so the header used
  // to show BOTH a "Draft" pill and a "Rejected" chip. Fold the rejection into
  // the single status pill (see the `status` prop below) and drop the duplicate
  // chip (`isRejected` is derived above). Once the PO is amended, approval_status
  // flips to `not_required` and the pill correctly reads "Draft" again at the top.
  // Chips beside the status pill: approval state + version number (when the
  // PO has been amended at least once).
  const approvalBadge =
    po.approval_status !== "not_required" && !isRejected ? (
      <StatusBadge variant={approvalVariant(po.approval_status)}>
        {approvalLabel(po.approval_status)}
      </StatusBadge>
    ) : null
  const revBadge =
    currentVersion > 1 ? (
      // Only once the PO has actually been amended (past the v1 baseline). Same
      // chip style as the condition / approval badges beside it, so the version
      // reads as a proper badge rather than a cramped bordered span.
      <StatusBadge variant="neutral">{DETAIL_S.versionLabel(currentVersion)}</StatusBadge>
    ) : null
  // Distinct from the lifecycle status pill: an issued PO whose amendment was
  // rejected stays receivable, but this chip flags that a line needs
  // re-amendment (backend `has_rejected_amendment`, spec-po-amendment-partial-apply §5).
  const amendmentRejectedBadge = po.has_rejected_amendment ? (
    <StatusBadge variant="error">{DETAIL_S.amendmentRejection.title}</StatusBadge>
  ) : null

  // Per-status action set, mirroring the reference inline layout. The primary
  // (dark) action changes with the lifecycle; Download PO / Preview are always
  // present. ≤ 4 buttons in every state, so the header row never crowds.
  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite && isDraft && po.approval_status === "not_required" && (
        <Button size="sm" disabled={anyPending} onClick={() => submitPo.mutate(poId)}>
          {/* A reopened/amended draft (already issued once → has history) reads as
              an update, not a fresh create. "Create PO" is only for a brand-new draft. */}
          {historicalVersions.length > 0 ? DETAIL_S.actions.updatePO : DETAIL_S.actions.createPO}
        </Button>
      )}
      {canApprove && isPending && hasActionableCategories && (
        <Button
          size="sm"
          disabled={anyPending}
          onClick={() => approvePo.mutate({ id: poId, body: { line_ids: [] } })}
        >
          {DETAIL_S.actions.approveAllMine}
        </Button>
      )}
      {canWrite && isRejected && (
        <Button
          size="sm"
          disabled={anyPending}
          onClick={() =>
            amendPo.mutate(poId, {
              // Reopening a rejected PO resets it to a draft — take the user
              // straight into the edit form so they can actually fix it,
              // instead of stranding them on the read-only detail page.
              onSuccess: (po) => navigate(`/procurement/po/${po.id}/edit`),
            })
          }
        >
          {DETAIL_S.actions.amend}
        </Button>
      )}
      {/* "Mark Received" intentionally removed — receiving happens in GRN, not
          from the PO detail. The PO's received counts + status are driven
          entirely by the backend as goods are booked in. */}
      {canWrite && canClose && (
        <Button
          size="sm"
          disabled={anyPending || closeBlocked}
          title={closeBlocked ? DETAIL_S.actions.closeBlockedByAmendment : undefined}
          onClick={() => setCloseOpen(true)}
        >
          {DETAIL_S.actions.closePO}
        </Button>
      )}
      {canWrite && isDraft && po.approval_status === "not_required" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/procurement/po/${poId}/edit`)}
        >
          {DETAIL_S.actions.edit}
        </Button>
      )}
      {canWrite && canAmendIssued && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/procurement/po/${poId}/amend`)}
        >
          {DETAIL_S.actions.amend}
        </Button>
      )}
      {canWrite && canCancel && (
        <Button
          size="sm"
          variant="outline"
          disabled={anyPending}
          onClick={() => setCancelOpen(true)}
        >
          {DETAIL_S.actions.cancelPO}
        </Button>
      )}
      {canWrite && isRejected && (
        <Button
          size="sm"
          variant="outline"
          disabled={anyPending}
          onClick={() =>
            clonePo.mutate(poId, {
              // REPLACE, not push: a clone is usually made from a rejected PO, so
              // pushing would leave that rejected PO on the history stack and the
              // clone's Back button would land there instead of the listing.
              // Replacing swaps it out so Back reaches the list.
              onSuccess: (clone) =>
                navigate(`/procurement/po/${clone.id}`, { replace: true }),
            })
          }
        >
          {DETAIL_S.actions.clone}
        </Button>
      )}
      {canDownload && (
        <Button
          size="sm"
          variant="outline"
          disabled={downloadPdf.isPending}
          onClick={() => downloadPdf.mutate(po)}
        >
          <FileDown className="mr-1 size-4" />
          {DETAIL_S.actions.downloadPO}
        </Button>
      )}
    </div>
  )

  // Line Items is hidden while an amendment is open (draft OR pending):
  // PoPendingChanges renders the amended-lines table above in its place.
  const detailTabs: DetailTab[] = [
    ...(hasOpenAmendment
      ? []
      : [
          {
            id: "line-items",
            label: DETAIL_S.tabs.lineItems,
            count: po.items.length,
            content: (
              <LineItemsTable
                po={po}
                returnsByLine={returnsByLine}
                amendmentRejections={amendmentRejections}
              />
            ),
          },
        ]),
    ...(canSeeGrns
      ? [
          {
            id: "grns",
            label: DETAIL_S.tabs.grns,
            count: grnPage?.total,
            content: <POGrnsTab poId={poId} />,
          },
        ]
      : []),
    {
      id: "devices",
      label: DETAIL_S.tabs.devices,
      count: devicePage?.total,
      content: (
        <PODevicesTab
          poId={poId}
          lineItems={po.items}
          warehouseId={po.warehouse_id ?? null}
          canSeeGrns={canSeeGrns}
          canPickEngineer={canPickEngineer}
        />
      ),
    },
    {
      id: "returns",
      label: DETAIL_S.tabs.returns,
      count: returnsList.length,
      content: <POReturnsTab returns={returnsList} />,
    },
  ]

  return (
    <div className="space-y-6">
      <EntityHeader
        className="mb-8"
        title={po.po_number}
        subtitle={po.supplier?.name ?? undefined}
        status={
          isRejected
            ? { label: approvalLabel("rejected"), variant: approvalVariant("rejected") }
            : { label: poStatusLabel(po.status), variant: poStatusVariant(po.status) }
        }
        badges={
          <>
            <StatusBadge variant={po.condition === "refurbished" ? "warning" : "info"}>
              {po.condition === "refurbished"
                ? DETAIL_S.conditionBadge.refurbished
                : DETAIL_S.conditionBadge.new}
            </StatusBadge>
            {approvalBadge}
            {amendmentRejectedBadge}
            {revBadge}
          </>
        }
        backHref="/procurement/po"
        actions={actions}
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1.5 md:grid-cols-4 xl:grid-cols-7">
        <InfoCard
          icon={Building2}
          label={DETAIL_S.infoCards.vendor}
          value={po.supplier?.name ?? DASH}
          secondary={vendorAddress ?? DASH}
        />
        <InfoCard
          icon={Contact}
          label={DETAIL_S.infoCards.contactedTo}
          value={po.vendor_contact_name ?? DASH}
          // Snapshotted phone and email of the contacted person, on their own
          // lines (mobile above, email below) rather than side by side. Each is
          // a single truncating line so a long email shows in full on hover
          // instead of being clipped by the card's line-clamp.
          secondary={
            po.vendor_contact_phone || po.vendor_contact_email ? (
              <span className="flex flex-col">
                {po.vendor_contact_phone ? (
                  <TruncatedText value={po.vendor_contact_phone} className="max-w-full" />
                ) : null}
                {po.vendor_contact_email ? (
                  <TruncatedText value={po.vendor_contact_email} className="max-w-full" breakAll />
                ) : null}
              </span>
            ) : undefined
          }
        />
        <InfoCard
          icon={Warehouse}
          label={DETAIL_S.infoCards.warehouse}
          value={po.warehouse_name ?? DASH}
        />
        <InfoCard
          icon={Calendar}
          label={DETAIL_S.infoCards.expectedDelivery}
          value={formatIST_date(po.expected_delivery_date)}
        />
        <InfoCard icon={CreditCard} label={DETAIL_S.infoCards.payment} value={po.payment_terms ?? DASH} />
        <InfoCard icon={User} label={DETAIL_S.infoCards.createdBy} value={creatorName} />
        <InfoCard
          icon={Gauge}
          label={DETAIL_S.infoCards.fulfillment}
          value={`${fulfilment}%`}
          secondary={<MiniBar value={fulfilment} className="mt-1" />}
        />
      </div>

      {hasCredit && creditRollup && (
        <POCreditBanner rollup={creditRollup} returns={returnsList} />
      )}

      {isTerminal && (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-2 px-[18px] py-3.5">
            <Typography variant="card-title">
              {po.status === "cancelled"
                ? DETAIL_S.closure.cancelledTitle
                : isShortClosed
                  ? DETAIL_S.closure.shortClosedTitle
                  : DETAIL_S.closure.closedTitle}
            </Typography>
            {po.closed_by_name && po.closed_at && (
              <Typography variant="caption" tone="muted">
                {DETAIL_S.closure.byOn(po.closed_by_name, formatIST_date(po.closed_at))}
              </Typography>
            )}
          </div>
          <CardContent className="border-t border-border py-3.5">
            {po.closure_notes ? (
              // A long close reason must not push the layout — clamp to 3 lines
              // with a Show more / Show less toggle. Mirrors the
              // rejection-reason treatment below.
              <ExpandableClampText text={po.closure_notes} lines={3} variant="body" />
            ) : (
              <Typography variant="body" tone="muted">
                {DETAIL_S.closure.noNotes}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* An issued PO's amendment rejection is shown INLINE at each rejected line
          (below its row) — the reason + what was proposed appear right where the
          "Amendment rejected" status is, so no separate callout is needed here. */}

      <PoPendingChanges
        po={po}
        versions={versions}
        onEdit={() => navigate(`/procurement/po/${poId}/amend`)}
      />

      {/* Rejection reason(s) — shown once here, directly above the line items,
          rather than under each rejected line's status badge. */}
      {rejectionReasons.length > 0 && (
        <Card className="gap-0 border-destructive/30 bg-destructive/5 py-0">
          <div className="flex items-center gap-2 px-[18px] py-3.5">
            <OctagonX className="size-4 shrink-0 text-destructive" />
            <Typography variant="card-title" tone="danger">
              {DETAIL_S.rejectedCallout.title}
            </Typography>
          </div>
          <CardContent className="space-y-3 border-t border-destructive/20 py-3.5">
            <Typography variant="body" tone="muted">
              {DETAIL_S.rejectedCallout.body}
            </Typography>
            <div className="space-y-2">
              <Typography variant="badge" tone="muted">
                {DETAIL_S.rejectedCallout.reasonLabel}
              </Typography>
              {rejectionReasons.map((reason, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-destructive/25 bg-background/60 p-3"
                >
                  <ExpandableClampText text={reason} lines={4} variant="body" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line items + everything received / returned against this PO, as
          tabs (`?tab=` deep-links). */}
      <DetailTabs cardContent contentClassName="min-w-0 overflow-hidden p-0" tabs={detailTabs} />


      {/* Documents (70%) + Order Details (30%) — side by side below line items. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* View-only here — documents are uploaded/removed from the Create /
            Edit / Amend forms, not the detail page. The section renders its own
            header. */}
        <Card className="flex h-fit flex-col gap-0 py-0">
          <PODocumentsSection poId={poId} editable={false} visibleRows={4} />
        </Card>

        <Card className="h-fit gap-0 py-0">
          <div className="flex items-center gap-2 px-[18px] py-3.5">
            <Receipt className="size-4 text-muted-foreground" />
            <Typography variant="card-title">{DETAIL_S.orderDetails.cardTitle}</Typography>
          </div>
          <CardContent className="border-t border-border py-2">
            <DetailRow label={DETAIL_S.orderDetails.deliveryTerms} value={po.delivery_terms ?? DASH} />
            <DetailRow label={DETAIL_S.orderDetails.otherReferences} value={po.other_references ?? DASH} />
            {(po.approver_names?.length ?? 0) > 1 ? (
              // Different PMs approved different lines (different categories) —
              // show every approver as a pill with a popover list, not just the
              // most recent one. Falls back to the single-name row
              // below when there's one approver or none.
              <div className="flex flex-col gap-0.5 py-2">
                <Typography variant="helper" tone="muted">
                  {DETAIL_S.orderDetails.approvedBy}
                </Typography>
                <OverflowPillList
                  items={po.approver_names ?? []}
                  getItemLabel={(name) => name}
                  columns={[
                    {
                      key: "index",
                      header: DETAIL_S.orderDetails.approverSrNo,
                      render: (_name, i) => i + 1,
                      className: "w-14 whitespace-nowrap text-muted-foreground",
                    },
                    {
                      key: "name",
                      header: DETAIL_S.orderDetails.approverPm,
                      render: (name) => name,
                    },
                  ]}
                />
              </div>
            ) : (
              <DetailRow label={DETAIL_S.orderDetails.approvedBy} value={approvedByValue} />
            )}
            <DetailRow label={DETAIL_S.orderDetails.created} value={formatIST_date(po.created_at)} />
            <div className="my-1 border-t border-border" />
            <div className="flex items-baseline justify-between gap-3 py-1">
              <Typography variant="body" tone="muted">{DETAIL_S.sectionTitles.subtotal}</Typography>
              <Typography variant="body" numeric>
                {money(stagedTotals ? String(stagedTotals.subtotal) : po.subtotal)}
              </Typography>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-1">
              <Typography variant="body" tone="muted">{DETAIL_S.sectionTitles.tax}</Typography>
              <Typography variant="body" numeric>
                {/* A PO saved before tax was captured has no rate on any line. */}
                {stagedTotals
                  ? money(String(stagedTotals.tax))
                  : po.items.some((it) => it.tax_rate != null)
                    ? money(po.tax_amount)
                    : DASH}
              </Typography>
            </div>
            {/* Total is the headline figure — set larger than the rows above. */}
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <Typography variant="body-strong">{DETAIL_S.sectionTitles.total}</Typography>
              <Typography variant="section-title" numeric>
                {money(stagedTotals ? String(stagedTotals.grand) : po.grand_total)}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>

      {po.notes && (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-2 px-[18px] py-3.5">
            <NotebookText className="size-4 text-muted-foreground" />
            <Typography variant="card-title">{DETAIL_S.notes.cardTitle}</Typography>
          </div>
          <CardContent className="border-t border-border py-3.5">
            {/* Clamp to 3 lines with a Show more/less toggle; the component
                keeps the author's line breaks and breaks long unbroken strings
                so the clamp engages instead of blowing out the card (§8.7). */}
            <ExpandableClampText text={po.notes} lines={3} variant="body" />
          </CardContent>
        </Card>
      )}

      {historicalVersions.length > 0 && (
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-2 px-[18px] py-3.5">
            <History className="size-4 text-muted-foreground" />
            <Typography variant="card-title">{DETAIL_S.sectionTitles.versionHistory}</Typography>
          </div>
          <CardContent className="border-t border-border py-3.5">
            <PoVersionTrail po={po} versions={historicalVersions} />
          </CardContent>
        </Card>
      )}

      <POCloseDialog
        po={po}
        rollup={creditRollup}
        returns={returnsList}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
      <POCancelDialog po={po} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  )
}
