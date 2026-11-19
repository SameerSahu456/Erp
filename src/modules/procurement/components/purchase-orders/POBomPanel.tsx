import { Layers, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"
import { formatINR } from "@/lib/currency"
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker"
import { NumericInput } from "@/components/common/forms/NumericInput"
import { PartCombobox, type PartLineFieldsValue, type PickedPart } from "@modules/crm"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

// A BOM component uses the SAME fields as a PO line item — a picked catalog
// part (part no + part name), category, rich-text description, qty / unit price
// / tax — so the editor below mirrors the Add Line Item row exactly. Shared by
// the Create PO form and the Amend form so the two never drift.
export interface BomComponent {
  key: string
  part: PartLineFieldsValue
  categoryId: string
  qty: number
  unitPrice: number
  taxRate: number
}

export function newBomComponent(): BomComponent {
  return {
    key: `bom-${crypto.randomUUID()}`,
    part: { description: "" },
    categoryId: "",
    qty: 1,
    unitPrice: 0,
    taxRate: 18,
  }
}

/** Bill-of-Materials editor shown under a BOM-eligible line. Uses the SAME
 *  fields + inputs as an Add-Line-Item row — part no + part name (catalog
 *  combobox), category, rich-text description, qty / unit price / tax / amount.
 *  Captured in the UI; not persisted by the PO API yet — assembly is finalised
 *  at WMS inward. */
export function BomPanel({
  components,
  onPatch,
  onPickPart,
  onClearPart,
  onAdd,
  onRemove,
}: {
  components: BomComponent[]
  onPatch: (key: string, patch: Partial<BomComponent>) => void
  onPickPart: (key: string, picked: PickedPart) => void
  onClearPart: (key: string) => void
  onAdd: () => void
  onRemove: (key: string) => void
}) {
  const cols =
    "md:grid md:grid-cols-[48px_1.3fr_1.3fr_1fr_1.8fr_72px_110px_160px_36px] md:items-start md:gap-2"
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Layers className="size-4" />
        </span>
        <Typography variant="card-title">{PURCHASE_ORDERS_STRINGS.form.bom.title}</Typography>
        <Typography variant="caption" tone="muted">
          {PURCHASE_ORDERS_STRINGS.form.bom.componentCount(components.length)}
        </Typography>
      </div>

      <div className={cn("hidden px-1 pb-1", cols)}>
        {[
          PURCHASE_ORDERS_STRINGS.form.columns.srNo,
          PURCHASE_ORDERS_STRINGS.form.columns.partNo,
          PURCHASE_ORDERS_STRINGS.form.columns.partName,
          PURCHASE_ORDERS_STRINGS.form.columns.category,
          PURCHASE_ORDERS_STRINGS.form.columns.description,
          PURCHASE_ORDERS_STRINGS.form.columns.qty,
          PURCHASE_ORDERS_STRINGS.form.columns.unitPrice,
          PURCHASE_ORDERS_STRINGS.form.columns.amount,
          "",
        ].map(
          (h, i) => (
            <Typography
              key={i}
              variant="badge"
              tone="muted"
              className={i >= 5 && i <= 7 ? "text-right" : undefined}
            >
              {h}
            </Typography>
          ),
        )}
      </div>

      <div className="space-y-2">
        {components.map((c, i) => {
          // Pre-tax amount (qty × unit price); GST is summed into the totals.
          const amt = c.qty * c.unitPrice
          return (
            <div key={c.key} className={cn("grid grid-cols-1 gap-2", cols)}>
              <div className="flex h-9 items-center">
                <Typography variant="body" numeric tone="muted">
                  {i + 1}
                </Typography>
              </div>
              <PartCombobox
                searchBy="sku"
                singleField
                selectedPartId={c.part.partId}
                displayValue={c.part.partSku ?? c.part.partName}
                onPick={(p) => onPickPart(c.key, p)}
                onClear={() => onClearPart(c.key)}
              />
              <PartCombobox
                searchBy="name"
                singleField
                selectedPartId={c.part.partId}
                displayValue={c.part.partName}
                onPick={(p) => onPickPart(c.key, p)}
                onClear={() => onClearPart(c.key)}
              />
              <CategoryPicker
                value={c.categoryId}
                onChange={(id) => onPatch(c.key, { categoryId: id })}
                placeholder={PURCHASE_ORDERS_STRINGS.form.lineItems.categoryPlaceholder}
              />
              <RichTextEditor
                value={c.part.description}
                onChange={(html) => onPatch(c.key, { part: { ...c.part, description: html } })}
                placeholder={PURCHASE_ORDERS_STRINGS.form.lineItems.descriptionPlaceholder}
              />
              <NumericInput
                integer
                min={1}
                value={c.qty}
                onChange={(qty) => onPatch(c.key, { qty })}
                className="h-9 text-right"
              />
              <NumericInput
                min={0}
                prefix="₹"
                value={c.unitPrice}
                onChange={(unitPrice) => onPatch(c.key, { unitPrice })}
                className="h-9 text-right"
              />
              <div className="h-9 overflow-x-auto text-right leading-9">
                <Typography variant="body-strong" numeric className="whitespace-nowrap">
                  {formatINR(amt)}
                </Typography>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(c.key)}
                aria-label={PURCHASE_ORDERS_STRINGS.form.bom.removeComponent}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <Button variant="outline" size="sm" className="mt-2" onClick={onAdd}>
        <Plus className="mr-1 size-4" />
        {PURCHASE_ORDERS_STRINGS.form.bom.addComponent}
      </Button>
    </div>
  )
}
