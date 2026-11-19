/**
 * Thin adapter: bridges SalesOrderFormController (LocalLine / string drafts) →
 * the shared LineItemsSection (camelCase BuilderLineItem). All rendering,
 * paste-from-Excel and BOM-child handling live in LineItemsSection; this file
 * only normalises types and wires the SO-specific part-pick effect.
 */
import { useCallback, useMemo } from "react"

import { FieldError } from "@/components/common/forms/FieldError"

import type { SOLineCondition } from "../../../api"
import { TAXES } from "../../../constants/taxes"
import {
  LineBillingPeriod,
  LineItemsSection,
  lineRateColumnLabel,
  type LineItemColumnKey,
} from "../../line-items"
import type { SalesOrderFormController } from "../../../hooks/sales-orders/useSalesOrderForm"
import { localLineToBuilder, builderPatchToLocal } from "./shared"

export function SalesOrderLineItemsGrid({
  f,
  sourceMode,
  isEdit,
}: {
  f: SalesOrderFormController
  sourceMode: "direct" | "from-quote"
  isEdit: boolean
}) {
  const {
    readOnly, lines, totals, errors, oemConditionRequired,
    updateLine, addLine, removeLine, clearAllLines, hasRealLines, applyPastedGroups,
    rentalStartDate, rentalEndDate, orderType,
  } = f

  // Mirrors the save-time validator in useSalesOrderForm: a category, a
  // positive qty, and — unless the SO is seeded from a quote — Brand/OEM +
  // Condition. Part Number is optional; a line without one must carry a
  // Description instead (either/or, so neither column gets the static
  // marker — the Description cell turns red on save when both are blank).
  // In qty-only mode only Qty is editable.
  const requiredColumns = useMemo<ReadonlyArray<LineItemColumnKey>>(() => {
    if (sourceMode === "from-quote" && !isEdit) return ["qty"]
    const cols: LineItemColumnKey[] = ["category", "qty"]
    if (oemConditionRequired) cols.push("oem", "condition")
    return cols
  }, [sourceMode, isEdit, oemConditionRequired])

  const canEdit = !readOnly
  // qtyOnly: CREATE from-quote deep-copies items server-side; FE only adjusts qty.
  const qtyOnly = sourceMode === "from-quote" && !isEdit
  // Add line / paste only in direct or edit mode, never on create-from-quote.
  const canAddLine = (sourceMode === "direct" || isEdit) && !readOnly

  const builderLines = useMemo(() => lines.map(localLineToBuilder), [lines])

  // totals.items[] is indexed by sort order
  const grossAmountAt = useCallback(
    (i: number) => totals?.items?.[i]?.gross_amount,
    [totals],
  )

  // SO hook keys errors as `line:<tempKey>:<field>`; the shared section reads
  // `item:<id>:<field>`. Translate the prefix here at the adapter boundary.
  const sectionErrors = useMemo(() => {
    const out: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(errors)) {
      out[k.startsWith("line:") ? `item:${k.slice(5)}` : k] = v
    }
    return out
  }, [errors])

  return (
    <LineItemsSection
      priceLabel={lineRateColumnLabel(orderType === "Rental")}
      lines={builderLines}
      errors={sectionErrors}
      canEdit={canEdit}
      canAddLine={canAddLine}
      qtyOnly={qtyOnly}
      showTax
      taxReadonly
      bomComponentsRule="bom-eligible-category"
      requiredColumns={requiredColumns}
      subtotal={totals?.subtotal ?? 0}
      grossAmountAt={grossAmountAt}
      hasRealLines={hasRealLines}
      errorSummaryId="so-items-error"
      onAddLine={addLine}
      onRemoveLine={(id) => {
        if (lines.length > 1) removeLine(id)
      }}
      onClearAll={clearAllLines}
      onPatchLine={(id, patch) => updateLine(id, builderPatchToLocal(patch))}
      onPickPart={(id, picked) => {
        const line = lines.find((l) => l.tempKey === id)
        if (!line) return
        if (picked) {
          updateLine(id, {
            partVariantId: picked.id,
            partSku: picked.sku,
            partName: picked.name,
            partImsId: picked.partImsId,
            itemName: picked.name,
            description: picked.description || line.description,
            categoryId: picked.categoryId,
            oemId: picked.oemId || undefined,
            condition: (picked.condition || undefined) as SOLineCondition | undefined,
            isBomEligible: picked.isBomEligible,
            rate: picked.sellPrice != null ? String(picked.sellPrice) : line.rate,
            listPrice: picked.sellPrice,
            ...(picked.hsnGstRate != null
              ? { taxRate: String(picked.hsnGstRate) }
              : picked.id !== line.partVariantId
                ? { taxRate: String(TAXES.DEFAULT_TAX_RATE) }
                : {}),
          })
        } else {
          updateLine(id, {
            partVariantId: undefined,
            partSku: undefined,
            partName: undefined,
            partImsId: undefined,
            listPrice: undefined,
            taxRate: String(TAXES.DEFAULT_TAX_RATE),
          })
        }
      }}
      onApplyPastedGroups={applyPastedGroups}
      // A rental line's own billing window (QA RM12), bounded by the order's.
      // Empty = "same as the order"; only an explicit pick writes the line's
      // dates, which the payload already sends per line. Offered only once
      // the order's window has both dates, as on close-won
      // (`rentalWindowReady`) and the quote builder: a line can only narrow
      // a window that exists.
      renderLineDetail={(li) =>
        li.isRental && rentalStartDate && rentalEndDate ? (
          <>
            <LineBillingPeriod
              idPrefix={`so-line-${li.id}`}
              startDate={li.rentalStartDate}
              endDate={li.rentalEndDate}
              documentStartDate={rentalStartDate || undefined}
              documentEndDate={rentalEndDate || undefined}
              disabled={readOnly || qtyOnly}
              onChange={(next) => updateLine(li.id, next)}
            />
            <FieldError
              message={errors[`line:${li.id}:rental_start`] ?? errors[`line:${li.id}:rental_end`]}
            />
          </>
        ) : null
      }
    />
  )
}
