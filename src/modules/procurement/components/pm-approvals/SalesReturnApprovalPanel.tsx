import { useState } from "react"
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
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { useAuth } from "@shared/auth/use-auth"
import { formatIST, formatIST_date } from "@shared/lib/date"
import {
  useDecideSalesReturnRequestItems,
  useSalesReturnRequest,
  type SalesReturnRequestItemWire,
} from "@modules/crm"
import {
  SALES_RETURN_APPROVAL_LABEL,
  SALES_RETURN_REASON_LABEL,
  type SalesReturnLineApproval,
  type SalesReturnReason,
} from "@modules/wms"

import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"
import { AccountLink, RecordLink } from "./RecordLink"
import {
  ApprovalFactGrid,
  DecidedStatus,
  HeadCell,
  HeaderFact,
  UnitsHeading,
} from "./approval-panel-primitives"

const S = PM_APPROVALS_STRINGS.sretPanel

/**
 * Sales-return approval surface for the PM Approvals detail page — the same
 * frame, header and per-line Approve / Reject controls as the SO approval
 * panel. Data + decision APIs are the ones the WMS sales-return detail page
 * uses: `useSalesReturnRequest` for the record and the batch
 * `useDecideSalesReturnRequestItems` (one line per click; reject carries a
 * required reason).
 */
export function SalesReturnApprovalPanel({ sretId }: { sretId: string }) {
  const { user } = useAuth()
  const { data: sret, isLoading, isError, error } = useSalesReturnRequest(sretId)
  const decide = useDecideSalesReturnRequestItems()
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  // Which line a decision is in flight for (spinner + disable on that row).
  const [actingOn, setActingOn] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }
  if (isError || !sret) {
    return <LoadErrorState error={error} fallback={S.loadFailed} />
  }

  /** Same rule as the WMS detail page (and the server's decide check). */
  const canDecide = (item: SalesReturnRequestItemWire): boolean => {
    if (item.approval_status !== "pending") return false
    if (item.product_manager_id == null) return true
    return user?.is_superuser === true || item.product_manager_id === user?.id
  }

  const decideLine = (
    itemId: string,
    decision: "approved" | "rejected",
    rejectionReason?: string,
  ) => {
    setActingOn(itemId)
    decide.mutate(
      {
        sretId: sret.id,
        body: {
          decisions: [
            {
              item_id: itemId,
              decision,
              ...(decision === "rejected" ? { rejection_reason: rejectionReason } : {}),
            },
          ],
        },
      },
      {
        onSuccess: () => setRejecting(null),
        onSettled: () => setActingOn(null),
      },
    )
  }

  const items = sret.items ?? []

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Facts ─────────────────────────────────────────────────────
          Same layout, fields and names as the Replacement details page: the
          number + status live in the page header; a 4-up fact grid here. */}
      <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
        <ApprovalFactGrid>
          <HeaderFact label={S.salesOrder}>
            {sret.order_number && sret.entity_type === "sales_orders" ? (
              <RecordLink to={`/crm/sales-orders/${sret.entity_id}`}>{sret.order_number}</RecordLink>
            ) : (
              sret.order_number ?? S.unknown
            )}
          </HeaderFact>
          <HeaderFact label={S.account}>
            {sret.account_name ? (
              <AccountLink accountId={sret.account_id}>{sret.account_name}</AccountLink>
            ) : (
              S.unknown
            )}
          </HeaderFact>
          <HeaderFact label={S.raisedDate}>{formatIST(sret.created_at)}</HeaderFact>
          <HeaderFact label={S.createdBy}>
            <TruncatedText value={sret.created_by_name} className="block max-w-full" />
          </HeaderFact>
          <HeaderFact label={S.reason}>
            {SALES_RETURN_REASON_LABEL[sret.reason as SalesReturnReason] ?? sret.reason}
          </HeaderFact>
          {sret.description ? (
            <HeaderFact label={S.description} className="col-span-full">
              <ExpandableClampText
                text={sret.description}
                lines={3}
                className="font-normal text-foreground/90"
                showMoreLabel={S.showMore}
                showLessLabel={S.showLess}
              />
            </HeaderFact>
          ) : null}
          {sret.notes ? (
            <HeaderFact label={S.notes} className="col-span-full">
              <ExpandableClampText
                text={sret.notes}
                lines={3}
                className="font-normal text-foreground/90"
                showMoreLabel={S.showMore}
                showLessLabel={S.showLess}
              />
            </HeaderFact>
          ) : null}
        </ApprovalFactGrid>
      </div>

      <UnitsHeading
        label={S.units}
        count={items.length}
        countLabel={S.unitsCount(items.length)}
      />

      {/* ── Lines table ───────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <HeadCell>{S.cols.item}</HeadCell>
              <HeadCell>{S.cols.serial}</HeadCell>
              <HeadCell className="text-right">{S.cols.dispatchedDate}</HeadCell>
              <HeadCell className="w-72 text-right">{S.cols.actions}</HeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body" tone="muted" align="center" className="py-8">
                    {S.noLines}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const busy = decide.isPending && actingOn === item.id
                return (
                  <TableRow key={item.id} className="bg-muted/5">
                    <TableCell className="align-middle">
                      <div className="max-w-[280px]">
                        {/* Full name in the styled hover tooltip (§0.14). */}
                        <TruncatedText
                          value={item.part_name ?? S.unknownPart}
                          className="block max-w-full font-semibold text-foreground/90"
                        />
                        {item.variant_name && item.variant_name !== item.part_name ? (
                          <TruncatedText
                            value={item.variant_name}
                            className="block max-w-full text-muted-foreground"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      {/* The device serial of the pinned unit; an unpinned
                          line may be any unit of the model. */}
                      {item.pinned_internal_serial ? (
                        <TruncatedSerial
                          value={item.pinned_internal_serial}
                          className="max-w-[12rem]"
                        />
                      ) : (
                        <Typography variant="body" tone="muted">
                          {S.anyUnit}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-right">
                      <Typography
                        variant="body"
                        tone={item.dispatched_at ? "default" : "muted"}
                        numeric
                      >
                        {item.dispatched_at ? formatIST_date(item.dispatched_at) : S.unknown}
                      </Typography>
                    </TableCell>
                    <TableCell className="align-middle text-right">
                      {canDecide(item) ? (
                        // SO-approval line buttons: outlined, toned, with icons.
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-success/40 text-success hover:bg-success/10"
                            disabled={decide.isPending}
                            onClick={() => decideLine(item.id, "approved")}
                          >
                            {busy && !rejecting ? (
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
                            disabled={decide.isPending}
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
                            SALES_RETURN_APPROVAL_LABEL[
                              item.approval_status as SalesReturnLineApproval
                            ] ?? item.approval_status
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
              disabled={!reason.trim() || decide.isPending}
              onClick={() => rejecting && decideLine(rejecting, "rejected", reason.trim())}
            >
              {decide.isPending && (
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
