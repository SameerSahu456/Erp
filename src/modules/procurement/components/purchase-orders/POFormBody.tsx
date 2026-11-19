import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Plus,
  Save,
  Loader2,
  Building2,
  ListChecks,
  ReceiptText,
  FileText,
  Calendar,
  // ChevronDown, ChevronRight — only used by the disabled "Add BOM" action below.
  Package,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn, stripHtml } from "@/lib/utils"


import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { FormPageShell } from "@/components/page-shells"
import { formatINR } from "@/lib/currency"
import { formatIST_date, toISTDateKey, todayDateParam } from "@shared/lib/date"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { type PickedPart } from "@modules/crm"
// import { useCategory } from "@modules/ims" — only used by the disabled "Add BOM" action.

import { useVendorContactOptions, useVendorOptions } from "../../hooks/vendors/useVendors"
import { useWarehouseOptions } from "../../hooks/warehouses/useWarehouseOptions"
import {
  useCreatePurchaseOrder,
  usePurchaseOrder,
  useUpdateDraftPurchaseOrder,
  useSubmitPurchaseOrder,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import {
  PODocumentsSection,
  PO_ENTITY_TYPE,
  INVOICE_DOC_TYPE,
} from "./PODocumentsSection"
import { useUploadAttachment } from "@modules/attachments"
import type { PurchaseOrderItemCreatePayload } from "../../api"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import { SectionHead } from "./SectionHead"
import { LineRow } from "./LineRow"
import {
  type POLine,
  LINE_COLS,
  newLine,
  orderTotals,
  taxFieldsForPart,
  taxFieldsFromSaved,
} from "./po-form-helpers"

const S = PURCHASE_ORDERS_STRINGS.form

// Max length for the free-text Payment / Delivery terms fields — shared by the
// input's `maxLength` and its live character counter so the two never drift.
const TERMS_MAX_LENGTH = 50

// Header condition wire values (spec-po-condition) — iterated to render the
// New / Refurbished toggle. Enum values, not user copy: their display labels
// come from `S.condition.new` / `S.condition.refurbished`.
const CONDITION_OPTIONS = ["new", "refurbished"] as const

export function POFormBody() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const goBack = useNavigateBack("/procurement/po")
  const createPO = useCreatePurchaseOrder()
  const updateDraft = useUpdateDraftPurchaseOrder()
  const submitPo = useSubmitPurchaseOrder()
  const { data: editPo } = usePurchaseOrder(editId)
  const isEdit = !!editId

  // Warehouse is the SAME AsyncSelect as Vendor: store the whole {id,label}
  // option so a user's pick keeps its OWN label. Edit hydration seeds the label
  // straight from the PO response's own `warehouse_name` / `warehouse_code`
  // (below), so no separate active-warehouse list fetch is needed to resolve
  // the chip — a dropdown pick already carries its label too.
  const [warehouse, setWarehouse] = useState<AsyncSelectOption | null>(null)
  const warehouseId = warehouse?.id ?? ""
  // Vendor picker is server-searched + infinite (§16.11); the option carries
  // its own label so the trigger renders without the row being on page 1.
  const [supplier, setSupplier] = useState<AsyncSelectOption | null>(null)
  const supplierId = supplier?.id ?? ""
  // "Purchase Requested By" — a contact of the selected vendor. Cleared when
  // the vendor changes; its options are scoped to `supplierId`.
  const [vendorContact, setVendorContact] = useState<AsyncSelectOption | null>(null)
  // Named `use*` so lint treats it as a custom hook; binds the picker to the
  // currently-selected vendor.
  const useContactOptions = (search: string, opts: { enabled?: boolean } = {}) =>
    useVendorContactOptions(supplierId, search, opts)
  const [paymentTerms, setPaymentTerms] = useState("")
  const [deliveryTerms, setDeliveryTerms] = useState("")
  const [otherReferences, setOtherReferences] = useState("")
  const [expectedDelivery, setExpectedDelivery] = useState("")
  // Header condition (spec-po-condition): whether this PO procures new or
  // refurbished goods. Enforced at GRN receive. Defaults to 'new'.
  const [condition, setCondition] = useState<"new" | "refurbished">("new")
  // Condition switch guard: line items are entered against the header condition,
  // so switching invalidates them. When the user picks a different condition and
  // there are entered lines, confirm before clearing them back to the default.
  const [pendingCondition, setPendingCondition] = useState<
    "new" | "refurbished" | null
  >(null)
  const [notes, setNotes] = useState("")
  // Documents staged in the form; uploaded via the attachment API AFTER the PO
  // is created/updated (there's no PO id to attach to until then).
  const [documents, setDocuments] = useState<File[]>([])
  const uploadDoc = useUploadAttachment()
  const [lines, setLines] = useState<POLine[]>(() => [newLine()])
  const [prefilled, setPrefilled] = useState(false)

  // One-shot prefill when editing a draft — a legitimate server→form
  // hydration: copy the loaded draft into local form state exactly once
  // (guarded by `prefilled`). This is the documented exception to the
  // no-setState-in-effect guidance.
  useEffect(() => {
    if (!isEdit || prefilled || !editPo) return
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration, guarded by `prefilled` */
    setWarehouse({
      id: editPo.warehouse_id,
      // Name only — mirrors the picker's toLabel (code dropped).
      label: editPo.warehouse_name ?? "",
    })
    setSupplier(
      editPo.supplier
        ? { id: editPo.supplier.id, label: editPo.supplier.name }
        : null,
    )
    setVendorContact(
      editPo.vendor_contact_id
        ? { id: editPo.vendor_contact_id, label: editPo.vendor_contact_name ?? "" }
        : // Primary was picked: it stores no FK, so rebuild the option using the
          // vendor-id sentinel (matches the dropdown's primary option id).
          editPo.vendor_contact_name && editPo.supplier
          ? { id: editPo.supplier.id, label: editPo.vendor_contact_name }
          : null,
    )
    setPaymentTerms(editPo.payment_terms ?? "")
    setDeliveryTerms(editPo.delivery_terms ?? "")
    setOtherReferences(editPo.other_references ?? "")
    setExpectedDelivery(editPo.expected_delivery_date ?? "")
    setCondition(editPo.condition)
    setNotes(editPo.notes ?? "")
    setLines(
      editPo.items.map((it) => ({
        key: `line-${it.id}`,
        part: {
          partId: it.part_variant_id ?? undefined,
          partSku: it.variant_sku ?? undefined,
          partName: it.part_name ?? it.description ?? undefined,
          description: it.description ?? "",
        },
        partNumber: it.part_number ?? undefined,
        variantName: it.variant_name ?? undefined,
        partCondition: it.condition ?? undefined,
        categoryId: it.category_id ?? "",
        qty: it.ordered_quantity,
        unitPrice: it.unit_price ? Number(it.unit_price) : 0,
        ...taxFieldsFromSaved(it),
        bomOpen: false,
        bomComponents: [],
      })),
    )
    setPrefilled(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isEdit, prefilled, editPo])

  // Convenience: when the chosen vendor has exactly one contact, pick it
  // automatically so the operator isn't made to open a single-option dropdown.
  // A vendor change clears the contact (above), so this only fires for a fresh
  // vendor with nothing picked yet — it never overrides a manual choice or the
  // edit-mode prefill. Shares the contacts query cache with the picker (same
  // key), so it adds no extra fetch.
  const soleContactProbe = useVendorContactOptions(supplierId, "", {
    enabled: !!supplierId,
  })
  const firstContactPage = soleContactProbe.data?.pages[0]
  const soleContact =
    firstContactPage && firstContactPage.total === 1
      ? firstContactPage.items[0]
      : undefined
  useEffect(() => {
    if (!supplierId || vendorContact || !soleContact) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-pick of a vendor's sole contact */
    setVendorContact({ id: soleContact.id, label: soleContact.name })
  }, [supplierId, vendorContact, soleContact])

  const totals = useMemo(() => orderTotals(lines), [lines])

  // Unsaved-changes guard: snapshot the meaningful fields (excluding UI-only
  // state like BOM open/keys) and compare to the baseline captured once the
  // form is ready (immediately for create; after prefill for edit). Any real
  // edit makes the form dirty → Back / Cancel / sidebar links prompt to discard.
  const formSnapshot = JSON.stringify({
    warehouseId,
    supplierId,
    paymentTerms,
    deliveryTerms,
    otherReferences,
    expectedDelivery,
    notes,
    // Staged (not-yet-uploaded) documents count toward dirty, so adding a file
    // prompts the discard dialog on Cancel just like editing a field does.
    documents: documents.map((f) => `${f.name}:${f.size}`),
    lines: lines.map((l) => ({
      partId: l.part.partId ?? null,
      partName: l.part.partName ?? null,
      description: l.part.description ?? "",
      categoryId: l.categoryId,
      qty: l.qty,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      bom: l.bomComponents.map((c) => ({
        partId: c.part.partId ?? null,
        partName: c.part.partName ?? null,
        description: c.part.description ?? "",
        categoryId: c.categoryId,
        qty: c.qty,
        unitPrice: c.unitPrice,
        taxRate: c.taxRate,
      })),
    })),
  })
  // Baseline captured once the form is ready (immediately for create; after
  // prefill for edit) via the sanctioned "adjust state during render" pattern —
  // a signature held in state, no ref read during render.
  const [baseline, setBaseline] = useState<string | null>(null)
  if (baseline === null && (!isEdit || prefilled)) {
    setBaseline(formSnapshot)
  }
  const isDirty = baseline !== null && formSnapshot !== baseline
  const guard = useUnsavedChangesGuard({ isDirty })

  function updateLine(key: string, patch: Partial<POLine>) {
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
                // Just the part name (not the composed part_name — variant_name)
                // so the Part Name column matches what a reloaded PO shows.
                partName: picked.partName ?? picked.name,
                description: picked.description || l.part.description,
              },
              partNumber: picked.partNumber,
              variantName: picked.variantName,
              partCondition: picked.condition,
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
              // Clearing the part also clears the category + condition it
              // auto-filled on pick, so the row resets symmetrically.
              partNumber: undefined,
              variantName: undefined,
              categoryId: "",
              partCondition: undefined,
              ...taxFieldsForPart(l, undefined),
            }
          : l,
      ),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(key: string) {
    // Allow removing any line, including the last — the form just can't be
    // submitted with zero lines (canSubmit requires lines.length > 0).
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // Rich-text description carries HTML; strip tags to test for real content.
  function descText(line: POLine): string {
    return stripHtml(line.part.description ?? "").trim()
  }

  // Category is mandatory on every line. A line also needs content — either a
  // picked catalog part or a non-empty description. Amounts must be sane before
  // we let the user submit: qty at least 1, price never negative — so the backend never bounces the PO with a cryptic 422. No
  // upper cap on qty or price: order values legitimately run into crores.
  // Condition gate (spec-po-condition): every catalog line's variant must match
  // the PO header condition. A picked variant can only mismatch if the operator
  // switched the header condition after adding lines (the picker itself is
  // filtered) — so we surface the offenders and block save until they're fixed.
  const conditionMismatchLines = useMemo(
    () =>
      lines.filter(
        (l) => !!l.part.partId && !!l.partCondition && l.partCondition !== condition,
      ),
    [lines, condition],
  )
  const hasConditionMismatch = conditionMismatchLines.length > 0

  // A line the user has actually filled in (picked a part, or typed a name /
  // description). A lone pristine blank line doesn't count, so switching then
  // is harmless and needs no confirmation. `descText` strips the rich-text
  // HTML so an empty editor (`<p></p>`) doesn't read as content.
  const hasEnteredLines = lines.some(
    (l) => !!l.part.partId || !!l.part.partName || descText(l).length > 0,
  )

  // Switching the header condition invalidates every entered line (they were
  // priced/picked for the old condition). Confirm before clearing them.
  function requestConditionChange(next: "new" | "refurbished") {
    if (next === condition) return
    if (hasEnteredLines) {
      setPendingCondition(next)
    } else {
      setCondition(next)
    }
  }

  function confirmConditionSwitch() {
    if (pendingCondition) {
      setCondition(pendingCondition)
      setLines([newLine()])
    }
    setPendingCondition(null)
  }

  const conditionLabel = (c: "new" | "refurbished") =>
    c === "refurbished" ? S.condition.refurbished : S.condition.new

  const canSubmit =
    !!warehouseId &&
    !!supplierId &&
    !!vendorContact &&
    !!paymentTerms.trim() &&
    !!deliveryTerms.trim() &&
    lines.length > 0 &&
    !hasConditionMismatch &&
    lines.every(
      (l) =>
        l.qty >= 1 &&
        l.unitPrice > 0 &&
        !!l.categoryId &&
        (!!l.part.partId || descText(l).length > 0),
    )

  function buildItems(): PurchaseOrderItemCreatePayload[] {
    return lines.map((l) => {
      const item: PurchaseOrderItemCreatePayload = {
        ordered_quantity: l.qty,
        unit_price: l.unitPrice ? String(l.unitPrice) : null,
        // The backend overrides this with the HSN rate when the part has one.
        tax_rate: l.taxRate.toFixed(2),
      }
      const hasDesc = descText(l).length > 0
      if (l.part.partId) {
        item.part_variant_id = l.part.partId
        if (hasDesc) item.description = l.part.description ?? null
      } else {
        // Free-text line: the description is the line, plus its routing category.
        item.description = l.part.description ?? null
        if (l.categoryId) item.category_id = l.categoryId
      }
      return item
    })
  }

  function handleSubmit(asDraft: boolean) {
    if (!canSubmit) return
    const body = {
      warehouse_id: warehouseId,
      supplier_id: supplierId || null,
      vendor_contact_id: vendorContact?.id ?? null,
      condition,
      payment_terms: paymentTerms.trim() || null,
      delivery_terms: deliveryTerms.trim() || null,
      other_references: otherReferences.trim() || null,
      expected_delivery_date: expectedDelivery || null,
      // Always persist as a draft first; "Create PO" then submits it for
      // approval (→ pending) so the detail page surfaces the Approve action.
      as_draft: true,
      notes: notes.trim() || null,
      items: buildItems(),
    }
    // On success, clear the guard's dirty view + pop its sentinel so the
    // redirect goes through cleanly, then `replace` so Back from the detail
    // returns to the list, not the (submitted) form.
    const goDetail = async (id: string) => {
      guard.bypassOnce()
      await guard.popSentinelIfPresent()
      navigate(`/procurement/po/${id}`, { replace: true })
    }
    // "Save Draft" lands on the draft detail (which shows "Create PO");
    // "Create PO" submits the saved draft for approval, then lands on detail.
    // Upload any staged documents to the freshly saved PO, then continue.
    // Failures are surfaced by the upload hook's own toast; we don't block the
    // navigation on a bad file.
    const uploadStagedDocs = async (poId: string) => {
      for (const file of documents) {
        await uploadDoc
          .mutateAsync({
            file,
            document_type: INVOICE_DOC_TYPE,
            entity_type: PO_ENTITY_TYPE,
            entity_id: poId,
          })
          .catch(() => {})
      }
    }
    const afterSave = async (po: { id: string }) => {
      await uploadStagedDocs(po.id)
      if (asDraft) {
        goDetail(po.id)
      } else {
        submitPo.mutate(po.id, {
          onSuccess: () => goDetail(po.id),
          onError: () => goDetail(po.id),
        })
      }
    }
    if (isEdit && editId) {
      updateDraft.mutate({ id: editId, body }, { onSuccess: afterSave })
    } else {
      createPO.mutate(body, { onSuccess: afterSave })
    }
  }

  const busy = createPO.isPending || updateDraft.isPending || submitPo.isPending
  // Fallback day is TODAY in IST (§0.11) — never a raw UTC `toISOString()`,
  // which lands on the previous calendar day for the +5:30 evening.
  const summaryDate = expectedDelivery || toISTDateKey(new Date().toISOString())

  return (
    <FormPageShell
      title={isEdit ? S.titleEdit : S.titleCreate}
      subtitle={S.subtitle}
      backHref="/procurement/po"
      // Hand the shell OUR guard so the back-arrow prompts on unsaved changes
      // too (not just Cancel); the shell also renders the discard dialog (§10).
      guard={guard}
      isDirty={isDirty}
      saving={busy}
      canSave={canSubmit}
      // This form has three footer buttons (Cancel · Save Draft · Create PO),
      // so it renders a custom set instead of the shell's default Cancel/Save.
      footerActions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => guard.attempt(() => goBack())}
            className="h-9"
          >
            {S.actions.cancel}
          </Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || busy}
              onClick={() => handleSubmit(true)}
              className="h-9"
            >
              {createPO.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-1 size-4" />
              )}
              {createPO.isPending ? S.actions.saving : S.actions.saveDraft}
            </Button>
          )}
          <Button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => handleSubmit(isEdit ? true : false)}
            className="h-9 min-w-[120px]"
          >
            {busy && <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />}
            {isEdit
              ? updateDraft.isPending
                ? S.actions.saving
                : S.actions.saveChanges
              : busy
                ? S.actions.creating
                : S.actions.createPO}
          </Button>
        </>
      }
    >
      {/* Warehouse & Vendor */}
      <Card className="gap-0 py-0">
        <SectionHead icon={Building2} title={S.sections.warehouseVendor} />
        <CardContent className="space-y-4 border-t border-border py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                {S.warehouse.label} <span className="text-destructive">*</span>
              </Label>
              <AsyncSelect
                value={warehouse}
                onValueChange={setWarehouse}
                useOptions={useWarehouseOptions}
                // Name only — the internal warehouse code is noise here, and
                // leading with it truncated the name out of the picked-value
                // trigger.
                toLabel={(w) => w.name}
                searchable
                loadOnOpen
                // First field of the form focuses on open (§3).
                autoFocus
                placeholder={S.warehouse.placeholder}
                searchPlaceholder={S.warehouse.searchPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {S.vendor.label} <span className="text-destructive">*</span>
              </Label>
              <AsyncSelect
                value={supplier}
                onValueChange={(v) => {
                  setSupplier(v)
                  // A contact belongs to one vendor — reset it when the vendor changes.
                  setVendorContact(null)
                }}
                useOptions={useVendorOptions}
                toLabel={(v) => v.name}
                searchable
                loadOnOpen
                placeholder={S.vendor.placeholder}
                searchPlaceholder={S.vendor.searchPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {S.contact.label} <span className="text-destructive">*</span>
              </Label>
              <AsyncSelect
                value={vendorContact}
                onValueChange={setVendorContact}
                useOptions={useContactOptions}
                toLabel={(c) => c.name}
                searchable
                loadOnOpen
                disabled={!supplierId}
                placeholder={supplierId ? S.contact.placeholder : S.contact.placeholderNoVendor}
                searchPlaceholder={S.contact.searchPlaceholder}
              />
            </div>
            {/* Condition sits beside Contacted To in the same 2-column grid. */}
            <div className="space-y-1.5">
              <Label>
                {S.condition.label} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_OPTIONS.map((opt) => {
                  const selected = condition === opt
                  const Icon = opt === "refurbished" ? Sparkles : Package
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => requestConditionChange(opt)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-card hover:bg-muted/60",
                      )}
                    >
                      <Icon className="size-4" />
                      <Typography variant="body-strong">
                        {opt === "refurbished" ? S.condition.refurbished : S.condition.new}
                      </Typography>
                    </button>
                  )
                })}
              </div>
              <Typography variant="helper" tone="muted">
                {S.condition.helper}
              </Typography>
              <ConfirmDialog
                open={pendingCondition !== null}
                onOpenChange={(o) => {
                  if (!o) setPendingCondition(null)
                }}
                trigger={null}
                title={S.condition.switchTitle}
                description={S.condition.switchDescription(
                  conditionLabel(condition),
                  conditionLabel(pendingCondition ?? condition),
                )}
                confirmLabel={S.condition.switchConfirm}
                cancelLabel={S.condition.switchCancel}
                variant="destructive"
                onConfirm={confirmConditionSwitch}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="gap-0 py-0">
        <SectionHead icon={ListChecks} title={S.sections.lineItems} />
        {/* Fixed layout so every column keeps its LINE_COLS width and never
            shrinks when one cell's value is long. The table scrolls horizontally
            in this frame when the columns' total exceeds the card (§8.7). */}
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-12 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecks className="size-5" />
            </span>
            <div className="space-y-1">
              <Typography variant="body-strong">{S.lineItems.emptyTitle}</Typography>
              <Typography variant="helper" tone="muted" asChild>
                <p>{S.lineItems.emptyDescription}</p>
              </Typography>
            </div>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 size-4" />
              {S.lineItems.addLineItem}
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
                <LineRow
                  key={line.key}
                  line={line}
                  index={idx}
                  canRemove
                  condition={condition}
                  onPick={(p) => pickPart(line.key, p)}
                  onClear={() => clearPart(line.key)}
                  onUpdate={(patch) => updateLine(line.key, patch)}
                  onRemove={() => removeLine(line.key)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        {hasConditionMismatch && (
          <div className="mx-[18px] mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="min-w-0 space-y-0.5">
              <Typography variant="body-strong" tone="warning">
                {S.lineItems.mismatchTitle(conditionLabel(condition))}
              </Typography>
              <Typography variant="helper" tone="muted">
                {S.lineItems.mismatchHint}
                {conditionMismatchLines
                  .map(
                    (l) =>
                      `${l.part.partName ?? l.part.partSku ?? S.lineItems.lineFallback} (${l.partCondition})`,
                  )
                  .join(", ")}
              </Typography>
            </div>
          </div>
        )}
        <div className="px-[18px] py-3">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 size-4" />
            {S.lineItems.addLineItem}
          </Button>
        </div>
          </>
        )}
      </Card>

      {/* Terms & Notes */}
      <Card className="gap-0 py-0">
        <SectionHead icon={ReceiptText} title={S.sections.termsNotes} />
        <CardContent className="grid grid-cols-1 gap-4 border-t border-border py-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>
              {S.termsNotes.paymentTermsLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder={S.termsNotes.paymentTermsPlaceholder}
              maxLength={TERMS_MAX_LENGTH}
              className="h-9"
            />
            <Typography variant="helper" tone="muted" className="block text-right">
              {S.termsNotes.charCounter(paymentTerms.length, TERMS_MAX_LENGTH)}
            </Typography>
          </div>
          <div className="space-y-1.5">
            <Label>
              {S.termsNotes.deliveryTermsLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              placeholder={S.termsNotes.deliveryTermsPlaceholder}
              maxLength={TERMS_MAX_LENGTH}
              className="h-9"
            />
            <Typography variant="helper" tone="muted" className="block text-right">
              {S.termsNotes.charCounter(deliveryTerms.length, TERMS_MAX_LENGTH)}
            </Typography>
          </div>
          <div className="space-y-1.5">
            <Label>{S.termsNotes.otherReferencesLabel}</Label>
            <Input
              value={otherReferences}
              onChange={(e) => setOtherReferences(e.target.value)}
              placeholder={S.termsNotes.otherReferencesPlaceholder}
              maxLength={TERMS_MAX_LENGTH}
              className="h-9"
            />
            <Typography variant="helper" tone="muted" className="block text-right">
              {S.termsNotes.charCounter(otherReferences.length, TERMS_MAX_LENGTH)}
            </Typography>
          </div>
          <div className="space-y-1.5">
            <Label>{S.termsNotes.expectedDeliveryLabel}</Label>
            <Input
              type="date"
              value={expectedDelivery}
              // Block past dates — the native picker greys them out and typing
              // one is rejected on the min bound.
              min={todayDateParam()}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              // Open the calendar on a click anywhere in the field, not only on
              // the native calendar icon. `showPicker` is a no-op where unsupported.
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="h-9 cursor-pointer"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
            <Label>{S.termsNotes.notesLabel}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={S.termsNotes.notesPlaceholder}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents + Order Summary sit side by side on large screens: the tall
          upload panel is balanced by a compact receipt-style summary. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Documents — supplier invoice / paperwork. Newly-added files are
            STAGED in `documents` and only uploaded on save (see uploadStagedDocs),
            so cancelling never persists them. In edit we also pass the PO id to
            list/live-delete the already-saved documents alongside the staged ones. */}
        <Card className="flex flex-col gap-0 py-0">
          {isEdit && editId ? (
            // Edit: existing docs are live (view / delete); NEW docs stage and
            // upload only on Save, so a cancelled edit discards them.
            <PODocumentsSection
              poId={editId}
              editable
              stagedFiles={documents}
              onStagedChange={setDocuments}
            />
          ) : (
            // Create: stage docs; they upload to the PO after it's saved.
            <PODocumentsSection stagedFiles={documents} onStagedChange={setDocuments} />
          )}
        </Card>

        {/* Order Summary — a compact receipt: metadata rows, then the Total as
            the hero on a faint band. */}
        <Card className="gap-0 py-0">
          <SectionHead icon={FileText} title={S.sections.orderSummary} />
          <CardContent className="border-t border-border p-0">
            <dl>
              <div className="flex items-center justify-between gap-3 px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{S.orderSummary.lineItems}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{lines.length}</dd>
                </Typography>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{S.orderSummary.totalUnits}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{lines.reduce((s, l) => s + l.qty, 0)}</dd>
                </Typography>
              </div>
              {expectedDelivery && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                  <Typography variant="body" tone="muted" asChild>
                    <dt>{S.orderSummary.expectedDelivery}</dt>
                  </Typography>
                  <Typography variant="body" numeric asChild>
                    <dd className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {formatIST_date(summaryDate)}
                    </dd>
                  </Typography>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{S.orderSummary.subtotal}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{formatINR(totals.subtotal)}</dd>
                </Typography>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-2.5">
                <Typography variant="body" tone="muted" asChild>
                  <dt>{S.orderSummary.tax}</dt>
                </Typography>
                <Typography variant="body" numeric asChild>
                  <dd>{formatINR(totals.tax)}</dd>
                </Typography>
              </div>
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t border-border bg-muted/40 px-[18px] py-3.5">
              <Typography variant="body-strong">{S.orderSummary.total}</Typography>
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
