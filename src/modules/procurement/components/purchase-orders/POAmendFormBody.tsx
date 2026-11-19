import { useMemo, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import {
  Plus,
  Building2,
  ListChecks,
  FileText,
  Warehouse,
  Package,
  Calendar,
  ReceiptText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { FormPageShell } from "@/components/page-shells"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"
import { type PickedPart } from "@modules/crm"
import { useUploadAttachment } from "@modules/attachments"

import {
  PODocumentsSection,
  INVOICE_DOC_TYPE,
  PO_ENTITY_TYPE,
} from "./PODocumentsSection"
import { SectionHead } from "./POAmendSectionHead"
import { ReadOnlyField } from "./ReadOnlyField"
import { AmendLineRow } from "./AmendLineRow"

import {
  usePurchaseOrder,
  usePurchaseOrderVersions,
  useAmendIssuedPurchaseOrder,
  useEditAmendment,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import {
  snapshotHeader,
  type PoVersionSnapshot,
  type PurchaseOrder,
  type PurchaseOrderAmendPayload,
} from "../../api"
import {
  amendLineToPayloadItem,
  lineLabel,
  newAmendLine,
  seedLines,
  type AmendLine,
} from "./poAmendLine"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import { AMEND_S, LINE_COLS } from "./po-amend-helpers"
import { orderTotals, taxFieldsForPart } from "./po-form-helpers"

// The amend line model + seeders + payload mapping live in `poAmendLine.ts`
// (pure, unit-tested). This file owns only the editor UI + state.

/** Route body for `/procurement/po/:id/amend`. Loads the PO (+ any staged draft)
 *  then renders the amend form once the data is ready, so the editor seeds from
 *  a settled baseline. */
export function POAmendFormBody() {
  const { id } = useParams<{ id: string }>()
  const { data: po, isLoading: poLoading, isError, error } = usePurchaseOrder(id)
  const { data: versions, isLoading: verLoading } = usePurchaseOrderVersions(id)

  if (poLoading || verLoading || (!po && !isError)) {
    return <FormCardSkeleton rows={4} sections={2} />
  }

  // A load failure (incl. a 403 permission boundary) routes through the shared
  // error slot, which keeps the backend message but styles it.
  if (isError) {
    return <LoadErrorState error={error} fallback={PURCHASE_ORDERS_STRINGS.detail.loadFailed} />
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <Typography variant="card-title">
          {PURCHASE_ORDERS_STRINGS.detail.notFoundTitle}
        </Typography>
        <Typography variant="body" tone="muted" asChild>
          <p>{PURCHASE_ORDERS_STRINGS.detail.notFoundDescription}</p>
        </Typography>
        <Button variant="outline" render={<Link to="/procurement/po" />}>
          {PURCHASE_ORDERS_STRINGS.detail.backToPOs}
        </Button>
      </div>
    )
  }

  const draft = versions?.find((v) => v.status === "draft") ?? null
  return <AmendForm po={po} draft={draft} />
}

/**
 * Issued-PO amend editor as a full page (Flow B), mirroring the Create PO form.
 *  • Fresh amend (no draft) → POST amend-issued, stages a DRAFT snapshot.
 *  • Edit staged draft (draft present) → PATCH amendment, replaces the draft's
 *    proposed lines.
 * Either way this only stages the proposal — a separate "Submit for approval"
 * step (on the detail's pending-changes panel) sends it to the PM. Warehouse +
 * vendor are locked (the backend amend accepts only line changes); existing
 * lines keep the received-lock; new lines pick a part or free-text + category.
 */
function AmendForm({ po, draft }: { po: PurchaseOrder; draft: PoVersionSnapshot | null }) {
  const navigate = useNavigate()
  const amend = useAmendIssuedPurchaseOrder()
  const editDraft = useEditAmendment()
  const uploadDoc = useUploadAttachment()
  const isEditing = !!draft
  // New documents are staged here and uploaded only on save, so cancelling the
  // amend never persists them. Existing docs stay live (view / delete).
  const [documents, setDocuments] = useState<File[]>([])
  const [lines, setLines] = useState<AmendLine[]>(() => seedLines(po, draft))
  // Commercial header is amendable too. Seed from the staged draft's snapshot
  // when re-editing, else from the live PO.
  const [paymentTerms, setPaymentTerms] = useState(
    () => (draft ? snapshotHeader(draft).payment_terms : po.payment_terms) ?? "",
  )
  const [deliveryTerms, setDeliveryTerms] = useState(
    () => (draft ? snapshotHeader(draft).delivery_terms : po.delivery_terms) ?? "",
  )
  const [otherReferences, setOtherReferences] = useState(
    () => (draft ? snapshotHeader(draft).other_references : po.other_references) ?? "",
  )
  const [notes, setNotes] = useState(
    () => (draft ? snapshotHeader(draft).notes : po.notes) ?? "",
  )

  // The warehouse is locked in an amendment; its display label comes straight
  // off the PO response (warehouse_name / warehouse_code) — no active-warehouse
  // list fetch just to resolve it.
  const warehouseLabel = po.warehouse_name
    ? po.warehouse_code
      ? `${po.warehouse_code} — ${po.warehouse_name}`
      : po.warehouse_name
    : "—"

  const detailHref = `/procurement/po/${po.id}`

  function updateLine(key: string, patch: Partial<AmendLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function pickPart(key: string, picked: PickedPart) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              part: {
                partId: picked.id,
                partSku: picked.sku,
                partName: picked.name,
                description: picked.description || l.part.description,
              },
              categoryId: picked.categoryId || l.categoryId,
              ...taxFieldsForPart(l, picked.hsnGstRate),
            }
          : l,
      ),
    )
  }

  function clearPart(key: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              part: { ...l.part, partId: undefined, partSku: undefined, partName: undefined },
              ...taxFieldsForPart(l, undefined),
            }
          : l,
      ),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newAmendLine()])
  }

  function removeLine(key: string) {
    // Allow removing any line, including the last — the amend just can't be
    // submitted with zero lines (validity requires lines.length > 0). Lines
    // with receipts stay protected via each row's lockedRemove.
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // A line is below-received only if it's an existing line whose new qty drops
  // below what's already received.
  const belowReceived = useMemo(
    () => lines.some((l) => l.original && l.qty < l.original.received_quantity),
    [lines],
  )

  const valid = useMemo(
    () =>
      !belowReceived &&
      !!paymentTerms.trim() &&
      !!deliveryTerms.trim() &&
      lines.length > 0 &&
      lines.every(
        (l) =>
          l.qty > 0 &&
          l.unitPrice > 0 &&
          (l.part.partId || (lineLabel(l) && l.categoryId)),
      ),
    [lines, belowReceived, paymentTerms, deliveryTerms],
  )

  const totals = useMemo(() => orderTotals(lines), [lines])

  // Unsaved-changes guard: snapshot the line data and compare to the baseline
  // captured on mount, so editing / adding / removing lines makes the form
  // dirty → Back / Cancel / sidebar links prompt to discard.
  const linesSnapshot = JSON.stringify(
    lines.map((l) => ({
      partId: l.part.partId ?? null,
      partName: l.part.partName ?? null,
      description: l.part.description ?? "",
      categoryId: l.categoryId,
      qty: l.qty,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
  )
  // Terms + notes ride in the same dirty signature so editing them prompts too.
  // Staged (not-yet-uploaded) documents ride in the dirty signature too,
  // so adding a file prompts the discard dialog on Cancel like any edit.
  const documentsSnapshot = documents.map((f) => `${f.name}:${f.size}`).join("|")
  const formSnapshot = `${linesSnapshot}${paymentTerms}${deliveryTerms}${otherReferences}${notes}${documentsSnapshot}`
  // Baseline captured once on mount (useState initializer) — the sanctioned
  // "compare a signature held in state" pattern, no ref read during render.
  const [initialSnapshot] = useState(formSnapshot)
  const isDirty = formSnapshot !== initialSnapshot
  const guard = useUnsavedChangesGuard({ isDirty })

  function buildPayload(): PurchaseOrderAmendPayload {
    return {
      items: lines.map(amendLineToPayloadItem),
      payment_terms: paymentTerms.trim() || null,
      delivery_terms: deliveryTerms.trim() || null,
      other_references: otherReferences.trim() || null,
      notes: notes.trim() || null,
    }
  }

  const saving = amend.isPending || editDraft.isPending

  function handleSubmit() {
    if (!valid) return
    const mutation = isEditing ? editDraft : amend
    mutation.mutate(
      { id: po.id, body: buildPayload() },
      {
        // Upload any staged documents to the PO, then clear the guard + pop its
        // sentinel and `replace` so Back from the detail doesn't return to the
        // amend form. Upload failures surface via the hook's own toast; we
        // don't block the navigation on a bad file.
        onSuccess: async () => {
          for (const file of documents) {
            await uploadDoc
              .mutateAsync({
                file,
                document_type: INVOICE_DOC_TYPE,
                entity_type: PO_ENTITY_TYPE,
                entity_id: po.id,
              })
              .catch(() => {})
          }
          guard.bypassOnce()
          await guard.popSentinelIfPresent()
          navigate(detailHref, { replace: true })
        },
      },
    )
  }

  return (
    <FormPageShell
      title={isEditing ? AMEND_S.titleEdit : AMEND_S.titleCreate}
      subtitle={AMEND_S.subtitle(po.po_number)}
      backHref={detailHref}
      saveLabel={isEditing ? AMEND_S.actions.saveDraft : AMEND_S.actions.stageAmendment}
      // Hand the shell OUR guard so the back-arrow prompts on unsaved changes
      // too (not just Cancel); the shell also renders the discard dialog (§10).
      guard={guard}
      isDirty={isDirty}
      saving={saving}
      canSave={valid}
      onSave={handleSubmit}
      // Cancel returns to the PO detail; the shell wraps this through the guard.
      onCancel={() => navigate(detailHref, { replace: true })}
    >
      {/* Warehouse & Vendor — locked (an amendment only changes lines). */}
      <Card className="gap-0 py-0">
        <SectionHead icon={Building2} title={AMEND_S.sections.warehouseVendor} />
        <CardContent className="grid grid-cols-1 gap-4 border-t border-border py-4 md:grid-cols-2">
          <ReadOnlyField label={AMEND_S.readOnly.warehouse} value={warehouseLabel} />
          <ReadOnlyField label={AMEND_S.readOnly.vendor} value={po.supplier?.name ?? "—"} />
          {/* Snapshot of who was contacted for this PO — locked here, since an
              amendment only changes lines. */}
          <ReadOnlyField label={AMEND_S.readOnly.contactedTo} value={po.vendor_contact_name ?? "—"} />
          {/* Condition is fixed for the PO's life — shown here as plain read-only
              text (never the New/Refurbished buttons of the create form). */}
          <ReadOnlyField
            label={AMEND_S.readOnly.condition}
            value={po.condition === "refurbished" ? AMEND_S.condition.refurbished : AMEND_S.condition.new}
          />
        </CardContent>
      </Card>

      {/* Line Items — same table as Create PO. */}
      <Card className="gap-0 py-0">
        <SectionHead icon={ListChecks} title={AMEND_S.sections.lineItems} />
        <Typography variant="helper" tone="muted" asChild>
          <p className="flex items-center gap-1.5 px-[18px] pb-1">
            <Warehouse className="size-3.5" />
            {isEditing ? AMEND_S.lineItems.noteEditing : AMEND_S.lineItems.noteFresh}
          </p>
        </Typography>
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-12 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecks className="size-5" />
            </span>
            <div className="space-y-1">
              <Typography variant="body-strong">{AMEND_S.lineItems.emptyTitle}</Typography>
              <Typography variant="helper" tone="muted" asChild>
                <p>{AMEND_S.lineItems.emptyDescription}</p>
              </Typography>
            </div>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 size-4" />
              {AMEND_S.lineItems.addLineItem}
            </Button>
          </div>
        ) : (
          <>
        <div className="overflow-x-auto border-t border-border">
          <Table className="min-w-[1320px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {LINE_COLS.map((c, i) => (
                  <TableHead key={i} className={c.cls}>
                    <Typography variant="badge" tone="muted">
                      {c.label}
                      {c.required && <span className="text-destructive"> *</span>}
                    </Typography>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => (
                <AmendLineRow
                  key={line.key}
                  line={line}
                  index={idx}
                  canRemove
                  condition={po.condition === "refurbished" ? "refurbished" : "new"}
                  onPick={(p) => pickPart(line.key, p)}
                  onClear={() => clearPart(line.key)}
                  onUpdate={(patch) => updateLine(line.key, patch)}
                  onRemove={() => removeLine(line.key)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-[18px] py-3">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 size-4" />
            {AMEND_S.lineItems.addLineItem}
          </Button>
        </div>
          </>
        )}
      </Card>

      {/* Terms & Notes — amendable alongside the lines. */}
      <Card className="gap-0 py-0">
        <SectionHead icon={ReceiptText} title={AMEND_S.sections.termsNotes} />
        <CardContent className="space-y-4 border-t border-border py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                {AMEND_S.termsNotes.paymentTermsLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder={AMEND_S.termsNotes.paymentTermsPlaceholder}
                maxLength={50}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {AMEND_S.termsNotes.deliveryTermsLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                placeholder={AMEND_S.termsNotes.deliveryTermsPlaceholder}
                maxLength={50}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{AMEND_S.termsNotes.otherReferencesLabel}</Label>
              <Input
                value={otherReferences}
                onChange={(e) => setOtherReferences(e.target.value)}
                placeholder={AMEND_S.termsNotes.otherReferencesPlaceholder}
                maxLength={50}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{AMEND_S.termsNotes.notesLabel}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={AMEND_S.termsNotes.notesPlaceholder}
              maxLength={2000}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents + Order Summary sit side by side on large screens: the tall
          upload panel is balanced by a compact receipt-style summary. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Documents — the PO already exists, so uploads/removes are live. */}
        <Card className="flex flex-col gap-0 py-0">
          <PODocumentsSection
            poId={po.id}
            editable
            stagedFiles={documents}
            onStagedChange={setDocuments}
          />
        </Card>

        {/* Order Summary — a compact receipt: metadata rows, then the Total as
            the hero on a faint band. */}
        <Card className="gap-0 py-0">
          <SectionHead icon={FileText} title={AMEND_S.sections.orderSummary} />
          <CardContent className="border-t border-border p-0">
            <dl>
              <div className="flex items-center justify-between gap-3 px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{AMEND_S.orderSummary.lineItems}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{lines.length}</dd>
                </Typography>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{AMEND_S.orderSummary.totalUnits}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{lines.reduce((s, l) => s + l.qty, 0)}</dd>
                </Typography>
              </div>
              {po.expected_delivery_date && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                  <Typography variant="body" tone="muted" asChild>
                    <dt>{AMEND_S.orderSummary.expectedDelivery}</dt>
                  </Typography>
                  <Typography variant="body" numeric asChild>
                    <dd className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {formatIST_date(po.expected_delivery_date)}
                    </dd>
                  </Typography>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{AMEND_S.orderSummary.subtotal}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{formatINR(totals.subtotal)}</dd>
                </Typography>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{AMEND_S.orderSummary.tax}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{formatINR(totals.tax)}</dd>
                </Typography>
              </div>
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t border-border bg-muted/40 px-[18px] py-3.5">
              <Typography variant="body-strong">{AMEND_S.orderSummary.total}</Typography>
              <Typography variant="section-title" numeric>
                {formatINR(totals.total)}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>

    </FormPageShell>
  )
}
