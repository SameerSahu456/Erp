import { useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Loader2, ThumbsDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { useAuth } from "@shared/auth/use-auth"
import { formatIST } from "@shared/lib/date"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import {
  useApproveReplacementItem,
  useRejectReplacementItem,
  useReplacementRequest,
  type ReplacementRequestItemWire,
} from "@modules/crm"
import {
  ITEM_APPROVAL_LABEL,
  REPLACEMENT_DECISION_LABEL,
  REPLACEMENT_MODE_LABEL,
  REPLACEMENT_PRIORITY_LABEL,
  REPLACEMENT_PRIORITY_VARIANT,
  type ItemApprovalStatus,
  type ReplacementDecision,
  type ReplacementMode,
  type ReplacementPriority,
} from "@modules/wms"

import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"
import { AccountLink } from "./RecordLink"
import {
  ApprovalFactGrid,
  DecidedStatus,
  HeadCell,
  HeaderFact,
  UnitsHeading,
} from "./approval-panel-primitives"

const S = PM_APPROVALS_STRINGS.rrPanel

/**
 * Replacement-request approval surface for the PM Approvals detail page —
 * the same frame, header and per-line Approve / Reject controls as the SO
 * approval panel (SalesOrderApprovalDetailPanel). Data + decision APIs are the
 * ones the WMS replacement detail page uses: `useReplacementRequest` for the
 * record, `useApproveReplacementItem` / `useRejectReplacementItem` (reason
 * required) per line.
 */
export function ReplacementApprovalPanel({ rrId }: { rrId: string }) {
  const { user } = useAuth()
  const { data: rr, isLoading, isError, error } = useReplacementRequest(rrId)
  const approveOne = useApproveReplacementItem()
  const rejectOne = useRejectReplacementItem()
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }
  if (isError || !rr) {
    return <LoadErrorState error={error} fallback={S.loadFailed} />
  }

  /** Same rule as the WMS detail page (and the server's decide check): a
   *  pending line is decidable when unassigned, or by its PM / a superuser. */
  const canDecide = (item: ReplacementRequestItemWire): boolean => {
    if (item.approval_status !== "pending") return false
    if (!item.product_manager_id) return true
    return user?.is_superuser === true || item.product_manager_id === user?.id
  }

  const priority = rr.priority as ReplacementPriority
  const items = rr.items ?? []

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Facts ─────────────────────────────────────────────────────
          The request number + status live in the page header (shown once);
          the facts sit in a 4-up grid with the listing's field names. */}
      <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
        <ApprovalFactGrid>
          <HeaderFact label={S.salesOrder}>
            {rr.sales_order_number && rr.entity_type === "sales_orders" ? (
              <Link to={`/crm/sales-orders/${rr.entity_id}`} className="text-primary hover:underline">
                {rr.sales_order_number}
              </Link>
            ) : (
              rr.sales_order_number ?? S.none
            )}
          </HeaderFact>
          <HeaderFact label={S.account}>
            {rr.account_name ? (
              <AccountLink accountId={rr.account_id}>{rr.account_name}</AccountLink>
            ) : (
              S.none
            )}
          </HeaderFact>
          <HeaderFact label={S.raisedDate}>{formatIST(rr.created_at)}</HeaderFact>
          <HeaderFact label={S.createdBy}>
            <TruncatedText value={rr.created_by_name} className="block max-w-full" />
          </HeaderFact>
          <HeaderFact label={S.replacementType}>
            {REPLACEMENT_MODE_LABEL[rr.replacement_mode as ReplacementMode] ?? rr.replacement_mode}
          </HeaderFact>
          {rr.external_ticket_no ? (
            // Wide cell so a long ticket spreads out instead of wrapping at
            // ~30 chars; clamps at 3 lines with Show more.
            <HeaderFact label={S.ticket} className="col-span-full lg:col-span-2">
              <ExpandableClampText
                text={rr.external_ticket_no}
                lines={3}
                className="font-medium"
                showMoreLabel={S.showMore}
                showLessLabel={S.showLess}
              />
            </HeaderFact>
          ) : null}
          {rr.reason ? (
            <HeaderFact label={S.reason} className="col-span-full">
              <ExpandableClampText
                text={rr.reason}
                lines={3}
                className="font-normal text-foreground/90"
                showMoreLabel={S.showMore}
                showLessLabel={S.showLess}
              />
            </HeaderFact>
          ) : null}
        </ApprovalFactGrid>
      </div>

      {/* Units heading with the request's priority beside it. */}
      <UnitsHeading
        label={S.units}
        count={items.length}
        countLabel={S.unitsCount(items.length)}
        extra={
          <StatusBadge variant={REPLACEMENT_PRIORITY_VARIANT[priority] ?? "neutral"}>
            {S.priority}: {REPLACEMENT_PRIORITY_LABEL[priority] ?? rr.priority}
          </StatusBadge>
        }
      />

      {/* ── Lines table ───────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <HeadCell>{S.cols.item}</HeadCell>
              <HeadCell>{S.cols.serial}</HeadCell>
              <HeadCell>{S.cols.decision}</HeadCell>
              <HeadCell>{S.cols.substitute}</HeadCell>
              <HeadCell className="w-72 text-right">{S.cols.actions}</HeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body" tone="muted" align="center" className="py-8">
                    {S.noLines}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isDifferent = item.replacement_decision === "different_part"
                const substitute =
                  item.replacement_variant_name &&
                  item.replacement_variant_name !== item.replacement_part_name
                    ? [item.replacement_part_name, item.replacement_variant_name]
                        .filter(Boolean)
                        .join(" · ")
                    : item.replacement_part_name ?? item.replacement_variant_name ?? S.none
                const busy =
                  (approveOne.isPending && approveOne.variables?.itemId === item.id) ||
                  (rejectOne.isPending && rejectOne.variables?.itemId === item.id)
                return (
                  <TableRow key={item.id} className="bg-muted/5">
                    <TableCell className="align-middle">
                      <div className="max-w-[280px]">
                        {/* Full name in the styled hover tooltip (§0.14). */}
                        <TruncatedText
                          value={item.original_part_name ?? S.unknownPart}
                          className="block max-w-full font-semibold text-foreground/90"
                        />
                        {item.original_variant_name &&
                        item.original_variant_name !== item.original_part_name ? (
                          <TruncatedText
                            value={item.original_variant_name}
                            className="block max-w-full text-muted-foreground"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle font-mono">
                      <Typography
                        variant="helper"
                        tone={item.original_internal_serial ? "default" : "muted"}
                      >
                        {item.original_internal_serial ?? S.anyUnit}
                      </Typography>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Typography variant="body" tone="muted">
                        {REPLACEMENT_DECISION_LABEL[item.replacement_decision as ReplacementDecision] ??
                          item.replacement_decision}
                      </Typography>
                    </TableCell>
                    <TableCell className="align-middle">
                      {isDifferent ? (
                        <TruncatedText value={substitute} className="block max-w-[14rem]" />
                      ) : (
                        <Typography variant="body" tone="muted">
                          {S.none}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-right">
                      {canDecide(item) ? (
                        // SO-approval line buttons: outlined, toned, with icons.
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-success/40 text-success hover:bg-success/10"
                            disabled={busy}
                            onClick={() => approveOne.mutate({ rrId: rr.id, itemId: item.id })}
                          >
                            {busy && approveOne.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
                            ) : (
                              <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                            )}
                            {S.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={busy}
                            onClick={() => {
                              setReason("")
                              setRejecting(item.id)
                            }}
                          >
                            <ThumbsDown className="size-3.5" data-icon="inline-start" />
                            {S.reject}
                          </Button>
                        </div>
                      ) : (
                        <DecidedStatus
                          label={
                            ITEM_APPROVAL_LABEL[item.approval_status as ItemApprovalStatus] ??
                            item.approval_status
                          }
                          tone={
                            item.approval_status === "approved"
                              ? "success"
                              : item.approval_status === "rejected"
                                ? "danger"
                                : "muted"
                          }
                          decidedAt={
                            item.approval_status === "approved"
                              ? item.approved_at
                              : item.approval_status === "rejected"
                                ? item.rejected_at
                                : null
                          }
                          rejectionReason={
                            item.approval_status === "rejected" ? item.rejection_reason : null
                          }
                          note={item.approval_status === "approved" ? item.approval_notes : null}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject needs a reason (the server requires it) — same flow as the WMS
          detail page's reject dialog. */}
      <OperationDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={S.rejectDialog.title}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {S.rejectDialog.cancel}
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={!reason.trim() || rejectOne.isPending}
              onClick={() => {
                if (!rejecting) return
                rejectOne.mutate(
                  { rrId: rr.id, itemId: rejecting, reason: reason.trim() },
                  { onSuccess: () => setRejecting(null) },
                )
              }}
            >
              {rejectOne.isPending && (
                <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
              )}
              {S.rejectDialog.confirm}
            </Button>
          </>
        }
      >
        <Typography variant="body" tone="muted" asChild>
          <p>{S.rejectDialog.body}</p>
        </Typography>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={S.rejectDialog.reasonPlaceholder}
          rows={3}
          autoFocus
        />
      </OperationDialog>
    </div>
  )
}
