import { useMemo, useState } from "react"
import { Pencil, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { stripHtml } from "@/lib/utils"
import { EMPTY_VALUE } from "@/shared/constants"

import {
  useSubmitAmendment,
  useCancelAmendment,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import {
  snapshotLines,
  snapshotHeader,
  type PoVersionSnapshot,
  type PurchaseOrder,
} from "../../api"
import { diffAmendmentLines } from "./poAmendLine"
import { Delta } from "./Delta"
import { Plain } from "./Plain"
import { LineApproval } from "./LineApproval"
import { taxPercent } from "./po-detail-helpers"
import { money } from "./po-pending-changes-helpers"
import { lineLabel } from "./po-version-trail-helpers"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const PC_S = PURCHASE_ORDERS_STRINGS.detail.pending

interface PoPendingChangesProps {
  po: PurchaseOrder
  versions: PoVersionSnapshot[] | undefined
  /** Open the amendment editor (re-edit the staged draft). */
  onEdit: () => void
}

/**
 * The OPEN amendment (Flow B) rendered as the Line-items table itself — the
 * detail page hides the live Line-items card while one is open, so the amended
 * result reads like the order, not a diff.
 *
 * - **Draft (staged):** the maker's proposed lines, with Edit / Cancel / Submit
 *   in the header.
 * - **Pending (awaiting PM):** the same table plus an Approval column — the PM
 *   approves/rejects each amended line inline. No change-tracking decorations.
 *
 * Renders nothing when no amendment is open.
 */
export function PoPendingChanges({ po, versions, onEdit }: PoPendingChangesProps) {
  const submit = useSubmitAmendment()
  const cancel = useCancelAmendment()
  const approve = useApprovePurchaseOrder()
  const reject = useRejectPurchaseOrder()
  // The proposed line currently being rejected (drives the required-note
  // prompt); null when the prompt is closed.
  const [rejectLineId, setRejectLineId] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const open = useMemo(
    () => versions?.find((v) => v.status === "draft" || v.status === "pending") ?? null,
    [versions],
  )
  // The proposed lines (the resulting order) and the change-view diff of those
  // against the current live order (adds qty/price/amount/description
  // deltas + added/removed rows).
  const proposed = useMemo(() => (open ? snapshotLines(open) : []), [open])
  const diffRows = useMemo(
    () => (open ? diffAmendmentLines(proposed, po.items) : []),
    [open, proposed, po.items],
  )

  if (!open) return null

  const isDraft = open.status === "draft"
  const busy =
    submit.isPending || cancel.isPending || approve.isPending || reject.isPending
  // Pending: PMs act on the amended lines; unchanged carried-over lines come
  // back already approved and need no action. Removed rows are informational.
  const anyActionable =
    !isDraft && diffRows.some((r) => r.kind !== "removed" && r.line.can_act)

  // The amendment's own header notes, captured on the draft snapshot. Surface
  // them here so a note typed while amending is visible after saving the draft
  // — the live PO's `notes` stays untouched until the amendment is
  // approved, so without this the note is invisible on the detail page.
  const amendmentNotes = snapshotHeader(open).notes

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 px-[18px] py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Package className="size-4 shrink-0 text-muted-foreground" />
            <Typography variant="card-title">{PC_S.lineItems}</Typography>
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5">
              <Typography variant="caption" tone="muted" numeric>
                {proposed.length}
              </Typography>
            </span>
            <StatusBadge variant="warning">
              {isDraft ? PC_S.badgeDraft : PC_S.badgePending}
            </StatusBadge>
          </div>
          {!isDraft && (
            <Typography variant="helper" tone="muted" asChild>
              <p className="mt-1">
                {anyActionable ? PC_S.helperActionable : PC_S.helperSubmitted}
              </p>
            </Typography>
          )}
        </div>
        {isDraft && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
              <Pencil className="mr-1 size-4" />
              {PC_S.edit}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => cancel.mutate(po.id)}
            >
              {PC_S.cancelAmendment}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => submit.mutate(po.id)}>
              {submit.isPending ? PC_S.submitting : PC_S.submitForApproval}
            </Button>
          </div>
        )}
      </div>
      {amendmentNotes && (
        <div className="space-y-0.5 border-t border-border px-[18px] py-3.5">
          <Typography variant="caption" tone="muted">
            {PC_S.notes}
          </Typography>
          <Typography variant="body" asChild>
            <p className="whitespace-pre-wrap break-words">{amendmentNotes}</p>
          </Typography>
        </div>
      )}
      <div className="w-full overflow-x-auto border-t border-border">
        <Typography variant="body" asChild>
        <table
          className={`w-full table-fixed ${
            isDraft ? "min-w-[660px]" : "min-w-[900px]"
          }`}
        >
          <colgroup>
            {isDraft ? (
              <>
                <col className="w-[6%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[24%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
              </>
            ) : (
              <>
                <col className="w-[5%]" />
                <col className="w-[15%]" />
                <col className="w-[11%]" />
                <col className="w-[21%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
              </>
            )}
          </colgroup>
          <thead>
            <Typography variant="caption" tone="muted" asChild>
            <tr className="border-b border-border text-left font-semibold uppercase tracking-wider">
              <th className="px-3 py-3 whitespace-nowrap">{PC_S.columns.srNo}</th>
              <th className="px-3 py-3">{PC_S.columns.item}</th>
              <th className="px-3 py-3">{PC_S.columns.category}</th>
              <th className="px-3 py-3">{PC_S.columns.description}</th>
              <th className="px-2 py-3 text-right">{PC_S.columns.qty}</th>
              <th className="px-2 py-3 text-right">{PC_S.columns.unitPrice}</th>
              <th className="px-2 py-3 text-right">{PC_S.columns.tax}</th>
              <th className="px-3 py-3 text-right">{PC_S.columns.amount}</th>
              {!isDraft && <th className="px-3 py-3">{PC_S.columns.approval}</th>}
            </tr>
            </Typography>
          </thead>
          <tbody>
            {diffRows.map((row, i) => {
              const line = row.line
              const c = row.changes
              const prev = row.prev
              const removed = row.kind === "removed"
              const lbl = lineLabel(line)
              return (
                <tr
                  key={row.key}
                  className={`border-b border-border last:border-b-0 [&>td]:align-top ${
                    removed ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className={removed ? "line-through" : undefined}>
                      {/* A description-only line has no item label: its text is
                          in the Description column, so a dash here. */}
                      {lbl.primary ? (
                        <ExpandableClampText text={lbl.primary} lines={3} variant="body-strong" />
                      ) : (
                        <span className="text-muted-foreground/60">{EMPTY_VALUE}</span>
                      )}
                      {lbl.secondary && (
                        <Typography variant="helper" tone="muted" asChild>
                          <p className="break-words">{lbl.secondary}</p>
                        </Typography>
                      )}
                    </div>
                    {(row.kind === "added" || removed) && (
                      <div className="mt-1">
                        <StatusBadge variant={removed ? "error" : "success"}>
                          {removed ? PC_S.removed : PC_S.added}
                        </StatusBadge>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {line.category_name ? (
                      <span className="break-words">{line.category_name}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  {/* Description — stacked old-above-new when the visible text changed. */}
                  <td className="px-3 py-3 text-muted-foreground">
                    {c.desc && prev ? (
                      <div className="space-y-1">
                        <Typography variant="helper" tone="muted" asChild>
                          <p className="break-words line-through">
                            {stripHtml(prev.description ?? "").trim() || "—"}
                          </p>
                        </Typography>
                        {/* New description with its styling intact. */}
                        <Typography variant="body-sm" tone="muted" asChild>
                          <RichTextView html={line.description ?? ""} lines={3} />
                        </Typography>
                      </div>
                    ) : line.description ? (
                      <div className={removed ? "line-through" : undefined}>
                        <Typography variant="body-sm" tone="muted" asChild>
                          <RichTextView html={line.description} lines={3} />
                        </Typography>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  {/* Qty */}
                  <td className="px-2 py-3 text-right tabular-nums">
                    {c.qty && prev ? (
                      <Delta from={String(prev.ordered_quantity)} to={String(line.ordered_quantity)} />
                    ) : (
                      <Plain text={String(line.ordered_quantity)} removed={removed} />
                    )}
                  </td>
                  {/* Unit price */}
                  <td className="px-2 py-3 break-words text-right tabular-nums">
                    {c.price && prev ? (
                      <Delta from={money(prev.unit_price)} to={money(line.unit_price)} />
                    ) : (
                      <Plain text={money(line.unit_price)} removed={removed} />
                    )}
                  </td>
                  {/* Tax */}
                  <td className="px-2 py-3 break-words text-right tabular-nums">
                    {c.tax && prev ? (
                      <Delta from={taxPercent(prev.tax_rate)} to={taxPercent(line.tax_rate)} />
                    ) : (
                      <Plain text={taxPercent(line.tax_rate)} removed={removed} />
                    )}
                  </td>
                  {/* Amount — pre-tax line amount. */}
                  <td className="px-3 py-3 break-words text-right tabular-nums">
                    {c.amount && prev ? (
                      <Delta from={money(prev.line_total)} to={money(line.line_total)} />
                    ) : (
                      <span
                        className={
                          removed
                            ? "text-muted-foreground line-through tabular-nums"
                            : "font-semibold tabular-nums"
                        }
                      >
                        {money(line.line_total)}
                      </span>
                    )}
                  </td>
                  {!isDraft && (
                    <td className="px-3 py-3">
                      {/* Removed rows are informational — approving the amendment
                          enacts the drop, so no per-line control. */}
                      {removed ? null : (
                        <LineApproval
                          line={line}
                          busy={busy}
                          onApprove={() =>
                            approve.mutate({ id: po.id, body: { line_ids: [line.line_id] } })
                          }
                          onReject={() => {
                            setNote("")
                            setRejectLineId(line.line_id)
                          }}
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        </Typography>
      </div>

      <OperationDialog
        open={rejectLineId !== null}
        onOpenChange={(o) => !o && setRejectLineId(null)}
        title={PC_S.rejectDialog.title}
        bodyClassName="space-y-4"
        // The typed reason is unsaved input — guard every close path so it isn't
        // dropped on Esc / backdrop / Cancel (§3.1/§9).
        isDirty={!!note.trim()}
        footer={({ requestClose }) => (
          <>
            <Button variant="outline" onClick={requestClose}>
              {PC_S.rejectDialog.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!note.trim() || busy}
              onClick={() =>
                reject.mutate(
                  {
                    id: po.id,
                    body: { line_ids: [rejectLineId as string], notes: note.trim() },
                  },
                  { onSuccess: () => setRejectLineId(null) },
                )
              }
            >
              {PC_S.rejectDialog.confirm}
            </Button>
          </>
        )}
      >
        <Typography variant="body" tone="muted" asChild>
          <p>{PC_S.rejectDialog.body}</p>
        </Typography>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={PURCHASE_ORDERS_STRINGS.detail.rejectionReasonPlaceholder}
          autoFocus
        />
      </OperationDialog>
    </Card>
  )
}
