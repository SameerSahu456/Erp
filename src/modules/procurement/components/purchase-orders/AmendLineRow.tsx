import { Trash2, Lock, ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { TableRow, TableCell } from "@/components/ui/table"
import { NumericInput } from "@/components/common/forms/NumericInput"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { PartCombobox, type PickedPart } from "@modules/crm"
import { useAllCategories } from "@modules/ims"

import { BomPanel, newBomComponent, type BomComponent } from "./POBomPanel"
import { LineTaxCell } from "./LineTaxCell"
import { type AmendLine } from "./poAmendLine"
import { AMEND_S } from "./po-amend-helpers"

/** One editable line row, matching the Create PO table. Existing lines show the
 *  part read-only + keep the received-lock; new lines pick a part (or free text)
 *  + a routing category. */
export function AmendLineRow({
  line,
  index,
  canRemove,
  condition,
  onPick,
  onClear,
  onUpdate,
  onRemove,
}: {
  line: AmendLine
  index: number
  canRemove: boolean
  /** PO header condition — restricts the part picker to matching-condition
   *  variants (a New PO must not surface Refurbished parts, and vice versa). */
  condition: "new" | "refurbished"
  onPick: (p: PickedPart) => void
  onClear: () => void
  onUpdate: (patch: Partial<AmendLine>) => void
  onRemove: () => void
}) {
  const isNew = !line.original
  const received = line.original?.received_quantity ?? 0
  const lockedRemove = received > 0
  const qtyInvalid = !!line.original && line.qty < received
  const changed = !!line.original && line.qty !== line.original.ordered_quantity
  // Pre-tax line total (qty × unit price); GST rolls into the Tax line below.
  const amount = line.qty * line.unitPrice

  // BOM editor (NEW lines only) — same shared panel as Create PO, gated on the
  // line's category being BOM-eligible. Read eligibility off the full category
  // list that the CategoryPicker already loads (shared React-Query cache, same
  // key) instead of firing a per-line single-category fetch.
  const { data: allCategories } = useAllCategories({ enabled: !!line.categoryId })
  const bomEligible = !!allCategories?.find((c) => c.id === line.categoryId)?.is_bom_eligible
  function toggleBom() {
    const open = !line.bomOpen
    onUpdate({
      bomOpen: open,
      bomComponents:
        open && line.bomComponents.length === 0 ? [newBomComponent()] : line.bomComponents,
    })
  }
  function patchBom(compKey: string, patch: Partial<BomComponent>) {
    onUpdate({
      bomComponents: line.bomComponents.map((c) => (c.key === compKey ? { ...c, ...patch } : c)),
    })
  }
  function addBomComponent() {
    onUpdate({ bomComponents: [...line.bomComponents, newBomComponent()] })
  }
  function removeBomComponent(compKey: string) {
    onUpdate({ bomComponents: line.bomComponents.filter((c) => c.key !== compKey) })
  }
  function pickBomPart(compKey: string, picked: PickedPart) {
    onUpdate({
      bomComponents: line.bomComponents.map((c) =>
        c.key === compKey
          ? {
              ...c,
              part: {
                partId: picked.id,
                partSku: picked.sku,
                partName: picked.name,
                description: picked.description || c.part.description,
              },
              categoryId: picked.categoryId || c.categoryId,
              taxRate: picked.hsnGstRate != null ? picked.hsnGstRate : c.taxRate,
            }
          : c,
      ),
    })
  }
  function clearBomPart(compKey: string) {
    onUpdate({
      bomComponents: line.bomComponents.map((c) =>
        c.key === compKey
          ? { ...c, part: { ...c.part, partId: undefined, partSku: undefined, partName: undefined } }
          : c,
      ),
    })
  }

  return (
    <>
    <TableRow className="hover:bg-transparent">
      <TableCell className="align-top pt-4 tabular-nums text-muted-foreground">
        {index + 1}
      </TableCell>

      {/* Part no */}
      <TableCell className="align-top">
        {isNew ? (
          <>
            <PartCombobox
              searchBy="sku"
              singleField
              condition={condition}
              selectedPartId={line.part.partId}
              displayValue={line.part.partSku ?? line.part.partName}
              onPick={onPick}
              onClear={onClear}
            />
            {/* BOM toggle for BOM-eligible new lines — same as Create PO. */}
            {line.part.partId && bomEligible && (
              <Typography variant="caption" tone="primary" asChild>
                <button
                  type="button"
                  onClick={toggleBom}
                  title={AMEND_S.lineItems.bomToggleTitle}
                  className="mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  {line.bomOpen ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  {line.bomOpen ? AMEND_S.lineItems.bomHide : AMEND_S.lineItems.bomAdd}
                  {line.bomComponents.length > 0 && (
                    <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-muted-foreground">
                      {line.bomComponents.length}
                    </span>
                  )}
                </button>
              </Typography>
            )}
          </>
        ) : (
          <div className="pt-1.5">
            {/* whitespace-normal overrides the table cell's nowrap; break-words
                breaks a long unbroken part number so it wraps inside its fixed
                column instead of overflowing into Part Name (CP-603). */}
            <Typography variant="body-strong" className="whitespace-normal break-words">
              {line.original?.part_number ?? "—"}
            </Typography>
            {line.part.partSku && line.part.partSku !== line.original?.part_number && (
              <Typography variant="caption" tone="muted" className="whitespace-normal break-words">
                {line.part.partSku}
              </Typography>
            )}
          </div>
        )}
      </TableCell>

      {/* Part Name */}
      <TableCell className="align-top">
        {isNew ? (
          <PartCombobox
            searchBy="name"
            singleField
            condition={condition}
            selectedPartId={line.part.partId}
            displayValue={line.part.partName}
            onPick={onPick}
            onClear={onClear}
          />
        ) : (
          <div className="pt-1.5">
            {/* Wrap a long part name within its column rather than truncating it
                to an unreadable ellipsis. A description-only line has no part
                name: its text lives in the Description column, so not here too. */}
            <Typography
              variant="body"
              tone={line.part.partName ? undefined : "muted"}
              className="whitespace-normal break-words"
            >
              {line.part.partName || EMPTY_VALUE}
            </Typography>
          </div>
        )}
      </TableCell>

      {/* Category — an existing line keeps the category it was created with, as
          read-only plain text (like Part no / Part Name); only a newly added
          line picks one. */}
      <TableCell className="align-top">
        {isNew ? (
          <CategoryPicker
            value={line.categoryId}
            onChange={(id) => onUpdate({ categoryId: id })}
            placeholder={AMEND_S.lineItems.categoryPlaceholder}
          />
        ) : (
          <div className="pt-1.5">
            <Typography
              variant="body"
              tone={line.original?.category_name ? undefined : "muted"}
              className="whitespace-normal break-words"
            >
              {line.original?.category_name ?? "—"}
            </Typography>
          </div>
        )}
      </TableCell>

      {/* Description — the editable rich-text editor for every line (new and
          existing), seeded from the line's current description. */}
      <TableCell className="align-top">
        <RichTextEditor
          value={line.part.description}
          onChange={(html) => onUpdate({ part: { ...line.part, description: html } })}
          placeholder={AMEND_S.lineItems.descriptionPlaceholder}
        />
      </TableCell>

      {/* Qty (+ received lock / delta) */}
      <TableCell className="align-top">
        <NumericInput
          integer
          min={isNew ? 1 : received}
          value={line.qty}
          aria-invalid={qtyInvalid}
          onChange={(qty) => onUpdate({ qty })}
          className="h-9 text-right"
        />
        {!isNew && (received > 0 || changed) && (
          <div
            className="mt-1.5 flex flex-col items-end gap-0.5 whitespace-normal text-right"
            title={qtyInvalid ? AMEND_S.lineItems.qtyLockedTitle(received) : undefined}
          >
            {received > 0 && (
              <Typography variant="caption" tone={qtyInvalid ? "danger" : "muted"} asChild>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Lock className="size-3 shrink-0" aria-hidden />
                  {AMEND_S.lineItems.receivedCount(received)}
                </span>
              </Typography>
            )}
            {changed && (
              <Typography variant="caption" tone={qtyInvalid ? "danger" : "muted"} asChild>
                <span className="tabular-nums">
                  {line.original!.ordered_quantity} → {line.qty}
                </span>
              </Typography>
            )}
          </div>
        )}
      </TableCell>

      {/* Unit Price */}
      <TableCell className="align-top">
        <NumericInput
          min={0}
          prefix="₹"
          value={line.unitPrice}
          onChange={(unitPrice) => onUpdate({ unitPrice })}
          // Unit price must be > 0 to stage the amendment.
          aria-invalid={line.unitPrice <= 0}
          className="h-9 text-right"
        />
      </TableCell>

      {/* Tax % */}
      <TableCell className="align-top">
        <LineTaxCell
          hsnGstRate={line.hsnGstRate}
          taxRate={line.taxRate}
          onChange={(taxRate) => onUpdate({ taxRate })}
        />
      </TableCell>

      {/* Amount */}
      <TableCell className="align-top pt-4 text-right">
        <Typography variant="body-strong" numeric className="whitespace-nowrap">
          {formatINR(amount)}
        </Typography>
      </TableCell>

      {/* Remove */}
      <TableCell className="align-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove || lockedRemove}
          aria-label={AMEND_S.lineItems.removeLine}
          title={lockedRemove ? AMEND_S.lineItems.removeLockedTitle(received) : AMEND_S.lineItems.removeLine}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
    {isNew && line.bomOpen && (
      <TableRow className="hover:bg-transparent">
        {/* Full-width BOM editor directly below the line — same shared panel
            as Create PO. */}
        <TableCell colSpan={10} className="pt-0 pb-3">
          <BomPanel
            components={line.bomComponents}
            onPatch={patchBom}
            onPickPart={pickBomPart}
            onClearPart={clearBomPart}
            onAdd={addBomComponent}
            onRemove={removeBomComponent}
          />
        </TableCell>
      </TableRow>
    )}
    </>
  )
}
