import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { TableRow, TableCell } from "@/components/ui/table"
import { formatINR } from "@/lib/currency"
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker"
import { NumericInput } from "@/components/common/forms/NumericInput"
import { PartCombobox, type PickedPart } from "@modules/crm"
import { BomPanel, newBomComponent, type BomComponent } from "./POBomPanel"
import { LineTaxCell } from "./LineTaxCell"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import { type POLine, partNoDisplay } from "./po-form-helpers"

const S = PURCHASE_ORDERS_STRINGS.form

/** One editable line as a table row matching the reference: part-no (+ Add
 *  BOM), part-name, description, qty / unit price / tax / amount, and a remove
 *  button. A non-catalog (description-only) line gets a category sub-row the
 *  backend needs to route approval. The table scrolls horizontally if wide. */
export function LineRow({
  line,
  index,
  canRemove,
  condition,
  onPick,
  onClear,
  onUpdate,
  onRemove,
}: {
  line: POLine
  index: number
  canRemove: boolean
  // PO header condition — filters the part picker to matching-condition variants.
  condition: "new" | "refurbished"
  onPick: (p: PickedPart) => void
  onClear: () => void
  onUpdate: (patch: Partial<POLine>) => void
  onRemove: () => void
}) {
  // Amount is the pre-tax line total (qty × unit price). GST is not added here;
  // it rolls into the Tax line in the Order Summary, and Grand Total = Subtotal
  // + Tax below.
  const amount = line.qty * line.unitPrice
  // Add BOM DISABLED for now (no use yet) — the eligibility check + toggle are
  // preserved commented so the action re-enables in one place. See the commented
  // "Add BOM" button below.
  // const bomEligible = !!useCategory(line.categoryId).data?.is_bom_eligible
  // function toggleBom() {
  //   const open = !line.bomOpen
  //   onUpdate({
  //     bomOpen: open,
  //     bomComponents:
  //       open && line.bomComponents.length === 0 ? [newBomComponent()] : line.bomComponents,
  //   })
  // }
  function patchBom(compKey: string, patch: Partial<BomComponent>) {
    onUpdate({
      bomComponents: line.bomComponents.map((c) =>
        c.key === compKey ? { ...c, ...patch } : c,
      ),
    })
  }
  function addBomComponent() {
    onUpdate({ bomComponents: [...line.bomComponents, newBomComponent()] })
  }
  function removeBomComponent(compKey: string) {
    onUpdate({ bomComponents: line.bomComponents.filter((c) => c.key !== compKey) })
  }
  // Pick / clear a component's catalog part — same mapping as a line's pickPart:
  // the picked part fills part no + name + description, auto-selects its category
  // and HSN tax rate.
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
        <TableCell className="align-top">
          <PartCombobox
            searchBy="sku"
            singleField
            selectedPartId={line.part.partId}
            displayValue={partNoDisplay(line)}
            onPick={onPick}
            onClear={onClear}
            condition={condition}
          />
          {/* Add BOM — DISABLED for now (no use yet: the PO create API has no
              BOM field; assembly happens at WMS inward). Preserved for re-enable:

          {line.part.partId && bomEligible && (
            <Typography variant="caption" tone="primary" asChild>
              <button
                type="button"
                onClick={toggleBom}
                title="BOM is captured in the UI; not yet saved by the create API"
                className="mt-1 inline-flex items-center gap-1 hover:underline"
              >
                {line.bomOpen ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {line.bomOpen ? "Hide BOM" : "Add BOM"}
                {line.bomComponents.length > 0 && (
                  <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-muted px-1 text-muted-foreground">
                    {line.bomComponents.length}
                  </span>
                )}
              </button>
            </Typography>
          )} */}
        </TableCell>
        <TableCell className="align-top">
          <PartCombobox
            searchBy="name"
            singleField
            selectedPartId={line.part.partId}
            displayValue={line.part.partName}
            onPick={onPick}
            onClear={onClear}
            condition={condition}
          />
        </TableCell>
        <TableCell className="align-top">
          <CategoryPicker
            value={line.categoryId}
            onChange={(id) => onUpdate({ categoryId: id })}
            placeholder={S.lineItems.categoryPlaceholder}
          />
        </TableCell>
        <TableCell className="align-top">
          <RichTextEditor
            value={line.part.description}
            onChange={(html) => onUpdate({ part: { ...line.part, description: html } })}
            placeholder={S.lineItems.descriptionPlaceholder}
          />
        </TableCell>
        <TableCell className="align-top">
          <NumericInput
            integer
            min={1}
            value={line.qty}
            onChange={(qty) => onUpdate({ qty })}
            className="h-9 text-right"
          />
        </TableCell>
        <TableCell className="align-top">
          <NumericInput
            min={0}
            prefix="₹"
            value={line.unitPrice}
            onChange={(unitPrice) => onUpdate({ unitPrice })}
            // Unit price must be > 0 to submit — flag a zero price.
            aria-invalid={line.unitPrice <= 0}
            className="h-9 text-right"
          />
        </TableCell>
        <TableCell className="align-top">
          <LineTaxCell
            hsnGstRate={line.hsnGstRate}
            taxRate={line.taxRate}
            onChange={(taxRate) => onUpdate({ taxRate })}
          />
        </TableCell>
        <TableCell className="align-top pt-4 text-right">
          {/* Fixed-width column (others never shrink). One line; an over-long
              value scrolls inside this cell — never wraps, cuts, or overlays. */}
          <div className="overflow-x-auto">
            <Typography variant="body-strong" numeric className="whitespace-nowrap">
              {formatINR(amount)}
            </Typography>
          </div>
        </TableCell>
        <TableCell className="align-top">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={S.lineItems.removeLine}
          >
            <Trash2 className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
      {line.bomOpen && (
        <TableRow className="hover:bg-transparent">
          {/* Span every column so the BOM editor sits full-width directly below
              the line, not indented under the part column. */}
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
