/**
 * Thin adapter: bridges ClosedWonController (SOLineItem) → the shared
 * LineItemsSection (BuilderLineItem) — the same tabular grid the Sales Quote
 * and Sales Order forms render. All rendering, paste-from-Excel, clear-all
 * and BOM-child handling live in LineItemsSection; this file only normalises
 * types and wires the Closed-Won part-pick effect (Closed Won creates a Sales
 * Order, so the pick mirrors SalesOrderLineItemsGrid).
 */
import { useCallback, useMemo } from 'react'

import { stripHtml } from '@/lib/utils'

import type { SOLineCondition } from '../../api'
import { TAXES } from '../../constants/taxes'
import {
  LineBillingPeriod,
  lineRateColumnLabel,
  LineItemsSection,
  bomChildCategoryError,
  type LineItemColumnKey,
} from '../line-items'
import { CLOSE_WON_STRINGS } from './close-won.strings'
import {
  builderPatchToSO,
  soLineToBuilder,
  type ClosedWonController,
} from '../../hooks/close-won/useClosedWonWizard'

/** Mirrors `isLineValid` in useClosedWonWizard. Part Number requirement
 *  commented out per user request (2026-10-22) — Close Won now accepts
 *  freeform rows, same as the direct SO form. Keep the two in sync — the
 *  marker must match what blocks Save. */
const REQUIRED_COLUMNS: ReadonlyArray<LineItemColumnKey> = [
  // 'partNumber',
  'partName',
  'category',
  'oem',
  'condition',
  'qty',
  'price',
]

export function ClosedWonLineItemsGrid({ f }: { f: ClosedWonController }) {
  const {
    addAdhocLine,
    applyPastedGroups,
    calc,
    calcRowTotals,
    clearAllLineItems,
    hasRealLines,
    isRentalOrder,
    lineItems,
    removeLineItem,
    rentalEndDate,
    rentalStartDate,
    rentalWindowReady,
    subtotal,
    updateLineItem,
  } = f

  const lines = useMemo(() => lineItems.map(soLineToBuilder), [lineItems])

  // Line total shows `gross_amount` (qty × rate, before discount & tax) —
  // matches the Quote / SO grids. calc.items[] is indexed by sort order;
  // `calcRowTotals` is the fallback if the response order ever drifts.
  const grossAmountAt = useCallback(
    (i: number) => calc?.items?.[i]?.gross_amount ?? calcRowTotals.get(i),
    [calc, calcRowTotals],
  )

  // Sales Order lines require Part Number, Part Name, Category and
  // Brand/OEM on BOTH parent and BOM children. Only "started" rows are
  // flagged (any field already filled) so a freshly-added blank row
  // doesn't shout before the user fills it. Keys per cell so the shared
  // LineItemsGrid lights up exactly which fields to fill.
  const errors = useMemo(() => {
    const V = CLOSE_WON_STRINGS.validation
    const out: Record<string, string | undefined> = {}
    for (const li of lineItems) {
      const parentStarted =
        !!li.partId ||
        li.item.trim() !== '' ||
        li.rate > 0 ||
        !!li.categoryId ||
        !!li.oemId ||
        stripHtml(li.description).length > 0
      if (parentStarted) {
        // Part Number required-check commented out per user request —
        // freeform rows are allowed on Close Won now (matches direct SO).
        // if (!li.partId) out[`item:${li.id}:identity`] = V.partNumberRequired
        if (!li.item.trim()) out[`item:${li.id}:name`] = V.partNameRequired
        if (!li.categoryId) out[`item:${li.id}:category`] = V.categoryRequired
        if (!li.oemId) out[`item:${li.id}:oem`] = V.oemRequired
        if (!li.condition) out[`item:${li.id}:condition`] = V.conditionRequired
        // A zero / blank price is the most common silent blocker — light the
        // Price cell up like the other required cells instead of only
        // failing `isLineValid` quietly.
        if (!(li.rate > 0)) out[`item:${li.id}:rate`] = V.priceRequired
      }
      for (const c of li.bomChildren ?? []) {
        const childStarted =
          !!c.partId ||
          !!c.itemName?.trim() ||
          !!c.categoryId ||
          !!c.oemId ||
          stripHtml(c.description).length > 0
        if (!childStarted) continue
        // Part Number required-check commented out per user request.
        // if (!c.partId) out[`item:${li.id}:child:${c.id}:identity`] = V.partNumberRequired
        if (!c.itemName?.trim()) out[`item:${li.id}:child:${c.id}:name`] = V.partNameRequired
        if (bomChildCategoryError(c)) out[`item:${li.id}:child:${c.id}:category`] = V.categoryRequired
        if (!c.oemId) out[`item:${li.id}:child:${c.id}:oem`] = V.oemRequired
        if (!c.condition) out[`item:${li.id}:child:${c.id}:condition`] = V.conditionRequired
      }
    }
    return out
  }, [lineItems])

  return (
    <LineItemsSection
      priceLabel={lineRateColumnLabel(isRentalOrder)}
      lines={lines}
      errors={errors}
      canEdit
      showTax
      bomComponentsRule="bom-eligible-category"
      requiredColumns={REQUIRED_COLUMNS}
      // partNumberStrict removed per user request — Close Won no longer
      // requires a picked catalog part on every row.
      subtotal={subtotal}
      grossAmountAt={grossAmountAt}
      hasRealLines={hasRealLines}
      errorSummaryId="cw-items-error"
      onAddLine={addAdhocLine}
      onRemoveLine={removeLineItem}
      onClearAll={clearAllLineItems}
      onPatchLine={(id, patch) => updateLineItem(id, builderPatchToSO(patch))}
      onPickPart={(id, picked) => {
        const line = lineItems.find((l) => l.id === id)
        if (!line) return
        if (picked) {
          // Reset the line discount when the part actually changes — it was
          // tied to the previous part's price. Re-picking the same part is a
          // no-op for discount and a user-typed tax.
          const partChanged = picked.id !== line.partId
          updateLineItem(id, {
            type: 'ims_part',
            partId: picked.id,
            partSku: picked.sku,
            partName: picked.name,
            partImsId: picked.partImsId,
            item: picked.name,
            categoryId: picked.categoryId,
            category: picked.categoryName,
            brand: picked.brand,
            variantType: picked.condition,
            isBomEligible: picked.isBomEligible,
            // Echo the variant's OEM + condition verbatim — the SO service
            // 400s a catalog row whose oem_id/condition disagrees with it.
            oemId: picked.oemId || undefined,
            condition: (picked.condition || undefined) as SOLineCondition | undefined,
            rate: picked.sellPrice ?? line.rate,
            rateInput: undefined,
            listPrice: picked.sellPrice,
            description: stripHtml(line.description).length > 0 ? line.description : picked.description,
            ...(picked.hsnGstRate != null
              ? { taxRate: picked.hsnGstRate }
              : partChanged
                ? { taxRate: TAXES.DEFAULT_TAX_RATE }
                : {}),
            ...(partChanged ? { discount_amount: 0, discountAmountInput: undefined } : {}),
          })
        } else {
          updateLineItem(id, {
            type: 'description',
            partId: undefined,
            partSku: undefined,
            partName: undefined,
            partImsId: undefined,
            brand: undefined,
            variantType: undefined,
            isBomEligible: undefined,
            oemId: undefined,
            condition: undefined,
            listPrice: undefined,
            discount_amount: 0,
            discountAmountInput: undefined,
            taxRate: TAXES.DEFAULT_TAX_RATE,
          })
        }
      }}
      onApplyPastedGroups={applyPastedGroups}
      // A rental line's own billing window, bounded by the order's — as on
      // the SO form. Empty = "same as the order"; the submit payload already
      // sends a line's own dates when it has them.
      renderLineDetail={(li) =>
        rentalWindowReady ? (
          <LineBillingPeriod
            idPrefix={`cw-line-${li.id}`}
            startDate={li.rentalStartDate}
            endDate={li.rentalEndDate}
            documentStartDate={rentalStartDate || undefined}
            documentEndDate={rentalEndDate || undefined}
            onChange={(next) => updateLineItem(li.id, next)}
          />
        ) : null
      }
    />
  )
}
