/**
 * Thin adapter: bridges QuoteBuilderController (snake_case / legacy names) →
 * the shared LineItemsSection (camelCase BuilderLineItem). All rendering,
 * paste-from-Excel and BOM-child handling live in LineItemsSection; this file
 * only normalises field names and wires the quote-specific part-pick effect.
 */
import { useCallback, useMemo } from "react"

import type { QuoteBuilderLineItem } from "./quoteBuilderShared"
import { FieldError } from "@/components/common/forms/FieldError"

import { LineBillingPeriod, LineItemsSection, lineRateColumnLabel } from "../line-items"
import { useQuoteApprovalColumns } from "../../hooks/quotes/useQuoteApprovalColumns"
import type { BuilderLineItem, LineItemColumnKey } from "../line-items"
import type { QuoteBuilderController } from "../../hooks/quotes/useQuoteBuilder"

// ── Field-name normalizers ────────────────────────────────────────────────────

function quoteLineToBuilder(line: QuoteBuilderLineItem): BuilderLineItem {
  return {
    id: line.id,
    type: line.type,
    serverId: line.serverId,
    partId: line.partId,
    partSku: line.partSku,
    partName: line.partName,
    partImsId: line.partImsId,
    brand: line.brand,
    oemId: line.oemId,
    category: line.category,
    categoryId: line.category_id,
    isBomEligible: line.is_bom_eligible,
    condition: line.variantType,
    itemName: line.itemName,
    description: line.itemDescription,
    qty: line.qty,
    qtyInput: line.qtyInput,
    rate: line.rate,
    rateInput: line.rateInput,
    listPrice: line.list_price,
    discountAmount: line.discount_amount,
    discountAmountInput: line.discountAmountInput,
    taxRate: line.tax_rate,
    taxRateInput: line.taxRateInput,
    isRental: line.is_rental,
    warrantyLevel: line.warrantyLevel,
    bomChildren: line.bomChildren ?? [],
    isBomExpanded: line.isBomExpanded,
  }
}

function builderPatchToQuote(
  patch: Partial<BuilderLineItem>,
): Partial<QuoteBuilderLineItem> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    switch (k) {
      case "categoryId":      out.category_id = v; break
      case "isBomEligible":   out.is_bom_eligible = v; break
      case "condition":       out.variantType = v; break
      case "description":     out.itemDescription = v; break
      case "discountAmount":  out.discount_amount = v ?? 0; break
      case "taxRate":         out.tax_rate = v ?? 0; break
      // quoteItemId has no QuoteBuilderLineItem equivalent — skip
      case "quoteItemId": break
      // partVariantId used only by SO LocalLine — skip
      case "partVariantId": break
      default: out[k] = v
    }
  }
  return out as Partial<QuoteBuilderLineItem>
}

// ── QuoteLineItemsGrid ────────────────────────────────────────────────────────

/** Mirrors `validateLineItems` in useQuoteBuilder: a quote line needs a
 *  name, qty ≥ 1 and a rate > 0. Part Number stays optional — freeform
 *  lines are allowed on a quote.
 *  NOTE: `description` and `category` were previously required; commented
 *  out — both are now optional on quote line items (category_id DB column
 *  nullable since migration 202610211400). */
const REQUIRED_COLUMNS: ReadonlyArray<LineItemColumnKey> = [
  "partName",
  // "category",
  // "description",
  "qty",
  "price",
]

export function QuoteLineItemsGrid({ qb }: { qb: QuoteBuilderController }) {
  const {
    errors,
    lineItems,
    addLineItem,
    removeLineItem,
    updateLineItem,
    applyLineItemPartChange,
    applyPastedGroups,
    clearAllLineItems,
    hasRealLines,
    calcByLine,
    subtotal,
    viewOnly,
    amendMode,
    existing,
    rentalStartDate,
    rentalEndDate,
    quoteType,
  } = qb

  const canEdit = !viewOnly || amendMode

  // Approver + Status per line, only while viewing a saved quote (not editing).
  const approvalColumns = useQuoteApprovalColumns(canEdit ? undefined : existing?.items)

  const lines = useMemo(() => lineItems.map(quoteLineToBuilder), [lineItems])

  // calcByLine is keyed by sort_order (= index in lineItems[])
  const grossAmountAt = useCallback(
    (i: number) => calcByLine.get(i)?.gross_amount,
    [calcByLine],
  )

  return (
    <LineItemsSection
      priceLabel={lineRateColumnLabel(quoteType === "Rental")}
      lines={lines}
      errors={errors}
      canEdit={canEdit}
      subtotal={subtotal}
      grossAmountAt={grossAmountAt}
      hasRealLines={hasRealLines}
      showTax={true}
      bomComponentsRule="always"
      requiredColumns={REQUIRED_COLUMNS}
      trailingColumns={approvalColumns}
      // descriptionStrict  // description made optional on quotes
      errorSummaryId="quote-items-error"
      onAddLine={addLineItem}
      onRemoveLine={removeLineItem}
      onClearAll={clearAllLineItems}
      onPatchLine={(id, patch) => updateLineItem(id, builderPatchToQuote(patch))}
      onPickPart={(id, picked) => {
        const li = lineItems.find((l) => l.id === id)
        if (!li) return
        applyLineItemPartChange(
          id,
          picked
            ? {
                partId: picked.id,
                partSku: picked.sku,
                partName: picked.name,
                description: picked.description || (li.itemDescription ?? ""),
              }
            : {
                partId: undefined,
                partSku: undefined,
                partName: undefined,
                description: li.itemDescription ?? "",
              },
          picked,
        )
      }}
      onApplyPastedGroups={applyPastedGroups}
      // A rental line's own period, bounded by the quote's — the same
      // control the SO form shows, so a converted quote reads the same.
      // Offered only once the quote's own window has both dates, as on the
      // SO (close-won `rentalWindowReady`): a line can only narrow a window
      // that exists.
      renderLineDetail={(li) => {
        const windowReady = Boolean(rentalStartDate && rentalEndDate)
        const line =
          li.isRental && windowReady ? lineItems.find((l) => l.id === li.id) : undefined
        return line ? (
          <QuoteLineRentalPeriod
            line={line}
            documentStartDate={rentalStartDate}
            documentEndDate={rentalEndDate}
            errors={errors}
            disabled={!canEdit}
            onPatch={(patch) => updateLineItem(line.id, patch)}
          />
        ) : null
      }}
    />
  )
}

/** A quote line's period. Unlike an SO line, a quote line always carries
 *  its dates (`quote_items` is the only copy; the quote has no window of
 *  its own on the server), so "same as the quote" is written as the
 *  quote's dates rather than left empty — and shown as inherited when it
 *  matches them, which also lets the quote's window keep cascading. */
function QuoteLineRentalPeriod({
  line,
  documentStartDate,
  documentEndDate,
  errors,
  disabled,
  onPatch,
}: {
  line: QuoteBuilderLineItem
  documentStartDate: string
  documentEndDate: string
  errors: Record<string, string | undefined>
  disabled: boolean
  onPatch: (patch: Partial<QuoteBuilderLineItem>) => void
}) {
  const own = (value: string | undefined, doc: string) => (value && value !== doc ? value : undefined)
  return (
    <>
      <LineBillingPeriod
        idPrefix={`quote-line-${line.id}`}
        startDate={own(line.rental_start_date, documentStartDate)}
        endDate={own(line.rental_end_date, documentEndDate)}
        documentStartDate={documentStartDate || undefined}
        documentEndDate={documentEndDate || undefined}
        disabled={disabled}
        onChange={(next) =>
          onPatch({
            rental_start_date: next.rentalStartDate ?? (documentStartDate || undefined),
            rental_end_date: next.rentalEndDate ?? (documentEndDate || undefined),
          })
        }
      />
      <FieldError
        message={
          errors[`item:${line.id}:rental_start_date`] ??
          errors[`item:${line.id}:rental_end_date`] ??
          errors[`item:${line.id}:rental_period`]
        }
      />
    </>
  )
}
