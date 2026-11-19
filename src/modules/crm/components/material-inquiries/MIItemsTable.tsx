import { Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { FieldError } from "@/components/common/forms/FieldError"
import { isDecimalInput } from "@/modules/crm/lib/validation"
import { CategoryOptionsCombobox } from "@/modules/ims/components/categories/CategoryOptionsCombobox"

import type { MaterialInquiryFormController } from "../../hooks/material-inquiries/useMaterialInquiryForm"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MIItemsTable({ form }: { form: MaterialInquiryFormController }) {
  const { items, canEditItems, updateItem, removeItem, addItem, errors, clearError } = form

  return (
    <>
      <div className="pt-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {S.form.items.heading}
        </p>
        {!canEditItems && (
          <p className="mt-1 text-xs text-muted-foreground">
            {S.form.items.readOnlyHint}
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-3 py-2 text-left font-medium text-muted-foreground">{S.form.items.columnIndex}</th>
              <th className="w-48 px-3 py-2 text-left font-medium text-muted-foreground">
                {S.form.items.columnItem} <span className="text-destructive">*</span>
              </th>
              <th className="w-48 px-3 py-2 text-left font-medium text-muted-foreground">
                {S.form.items.columnCategory} <span className="text-destructive">*</span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{S.form.items.columnDescription}</th>
              <th className="w-16 px-3 py-2 text-right font-medium text-muted-foreground">{S.form.items.columnQty}</th>
              <th className="w-36 px-3 py-2 text-right font-medium text-muted-foreground">{S.form.items.columnPrice}</th>
              <th className="w-9 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr
                key={it.clientKey}
                className="border-b align-top last:border-b-0"
              >
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                  {idx + 1}
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={it.item_name}
                    onChange={(e) => {
                      updateItem(it.clientKey, { item_name: e.target.value })
                      clearError(`item:${it.clientKey}:name`)
                      clearError("description")
                    }}
                    placeholder={S.form.items.itemNamePlaceholder}
                    disabled={!canEditItems}
                    aria-invalid={Boolean(errors[`item:${it.clientKey}:name`])}
                    className="h-9"
                  />
                  <FieldError message={errors[`item:${it.clientKey}:name`]} />
                </td>
                <td className="px-2 py-1.5">
                  <CategoryOptionsCombobox
                    value={it.category_id ?? null}
                    onValueChange={(id) => {
                      updateItem(it.clientKey, { category_id: id ?? undefined })
                      clearError(`item:${it.clientKey}:category`)
                    }}
                    disabled={!canEditItems}
                    placeholder={S.form.items.categoryPlaceholder}
                    triggerClassName={cn(
                      "h-9",
                      errors[`item:${it.clientKey}:category`] &&
                        "border-destructive",
                    )}
                  />
                  <FieldError message={errors[`item:${it.clientKey}:category`]} />
                </td>
                <td className="px-2 py-1.5">
                  <RichTextEditor
                    value={it.description}
                    onChange={(html) =>
                      updateItem(it.clientKey, { description: html })
                    }
                    placeholder={S.form.items.descriptionPlaceholder}
                    disabled={!canEditItems}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={it.qty_input}
                    onChange={(e) => {
                      const raw = e.target.value
                      const parsed = parseInt(raw, 10)
                      updateItem(it.clientKey, {
                        qty_input: raw,
                        ...(Number.isFinite(parsed) && parsed >= 1
                          ? { qty_requested: parsed }
                          : {}),
                      })
                      clearError(`item:${it.clientKey}:qty`)
                    }}
                    onBlur={() => {
                      const parsed = parseInt(it.qty_input, 10)
                      const final = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
                      updateItem(it.clientKey, {
                        qty_requested: final,
                        qty_input: String(final),
                      })
                    }}
                    disabled={!canEditItems}
                    aria-invalid={Boolean(errors[`item:${it.clientKey}:qty`])}
                    className="h-9 text-right"
                  />
                  <FieldError message={errors[`item:${it.clientKey}:qty`]} />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={it.client_budget_per_unit}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!isDecimalInput(v)) return
                      updateItem(it.clientKey, {
                        client_budget_per_unit: v,
                      })
                      clearError(`item:${it.clientKey}:budget`)
                    }}
                    placeholder="0"
                    disabled={!canEditItems}
                    aria-invalid={Boolean(errors[`item:${it.clientKey}:budget`])}
                    className="h-9 text-right"
                  />
                  <FieldError message={errors[`item:${it.clientKey}:budget`]} />
                </td>
                <td className="px-2 py-1.5 text-center align-top">
                  {canEditItems && (
                    <div className="flex h-9 items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(it.clientKey)}
                        disabled={items.length <= 1}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEditItems && (
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1.5 size-4" />
          {S.form.items.addItem}
        </Button>
      )}
    </>
  )
}
