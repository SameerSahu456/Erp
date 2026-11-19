/**
 * THE single Line Items section shared by every document that edits line
 * items in the tabular grid (Sales Quote, Sales Order).
 *
 * Owns everything that is identical across documents so the per-document
 * adapters (QuoteLineItemsGrid, SalesOrderLineItemsGrid) only translate their
 * own line model ⇄ `BuilderLineItem` and wire the document-specific part-pick
 * side effects:
 *   - "Paste from Excel" launcher button + PasteLineItemsDialog + success toast
 *   - BOM child add / remove / patch / pick-part helpers (expressed as a
 *     `bomChildren` patch on the parent line)
 *   - per-line gross amount lookup → Map<lineId, amount> the grid expects
 *   - live per-line discount-cap error merged into the error map
 *   - rendering of LineItemsGrid
 */
import { useMemo, useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { PickedPart } from "../shared/PartLineFields"
import type { PastedLineGroup } from "../../lib/paste-line-items"
import {
  LineItemsGrid,
  type BomComponentsRule,
  type LineItemColumnKey,
  type LineItemsGridController,
  type LineItemsGridTrailingColumn,
} from "./LineItemsGrid"
import { PasteLineItemsDialog } from "./PasteLineItemsDialog"
import { createEmptyBomChild, lineDiscountError } from "./lineItemMappers"
import type { BomChildRow, BuilderLineItem } from "./types"
import { LINE_ITEMS_STRINGS as S } from "./line-items.strings"

const P = S.paste

export type PasteMode = "replace" | "append"

/** What a paste actually produced after document-specific rules ran. */
export interface PasteApplyResult {
  lines: number
  components: number
}

export interface LineItemsSectionProps {
  /** Lines already normalised to the shared `BuilderLineItem` shape. */
  lines: BuilderLineItem[]
  /** Save-time errors keyed `item:<lineId>:<field>` (plus any summary keys). */
  errors: Record<string, string | undefined>
  canEdit: boolean
  /** Whether the "Add line" / "Paste from Excel" actions show. Defaults to `canEdit`. */
  canAddLine?: boolean
  qtyOnly?: boolean
  showTax?: boolean
  /** When true, the Tax % cell renders its value but the input is disabled.
   *  SO uses this because tax is applied server-side from the catalog and
   *  must not be hand-edited. */
  taxReadonly?: boolean
  /** Defaults to "always" — every parent line may take components. */
  bomComponentsRule?: BomComponentsRule
  /** Columns flagged mandatory in the header (red `*`). See LineItemsGrid. */
  requiredColumns?: ReadonlyArray<LineItemColumnKey>
  /** When true, the Description error clears based on description content
   *  alone (not Part Number). Default (false) keeps the either/or behaviour
   *  SO relies on: picking a part also clears the Description error. */
  descriptionStrict?: boolean
  /** When true, the Part Number error clears based on partId alone (not
   *  Description). Used by Close Won. Default (false) keeps the either/or
   *  behaviour. */
  partNumberStrict?: boolean
  /** Extra read-only columns rendered after Amount (see LineItemsGrid). */
  trailingColumns?: LineItemsGridTrailingColumn[]
  errorSummaryId: string
  subtotal: number
  /** Gross amount for the line at `index` (lines are in sort order). */
  grossAmountAt: (index: number) => number | undefined
  /** Whether the document already holds real lines — drives paste replace/append. */
  hasRealLines: boolean
  onPatchLine: (id: string, patch: Partial<BuilderLineItem>) => void
  onPickPart: (id: string, picked: PickedPart | null) => void
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  /** Optional "Clear all" action in the grid header (confirmed before firing). */
  onClearAll?: () => void
  onApplyPastedGroups: (
    groups: PastedLineGroup[],
    mode: PasteMode,
  ) => void | PasteApplyResult | Promise<void | PasteApplyResult>
  /** Full-width detail under a parent line — see LineItemsGrid. */
  renderLineDetail?: LineItemsGridController["renderLineDetail"]
  /** The rate column's label — see LineItemsGrid. */
  priceLabel?: string
}

export function LineItemsSection({
  lines,
  errors,
  canEdit,
  canAddLine = canEdit,
  qtyOnly = false,
  showTax = false,
  taxReadonly = false,
  bomComponentsRule = "always",
  requiredColumns,
  descriptionStrict = false,
  partNumberStrict = false,
  trailingColumns,
  errorSummaryId,
  subtotal,
  grossAmountAt,
  hasRealLines,
  onPatchLine,
  onPickPart,
  onAddLine,
  onRemoveLine,
  onClearAll,
  onApplyPastedGroups,
  renderLineDetail,
  priceLabel,
}: LineItemsSectionProps) {
  const [pasteOpen, setPasteOpen] = useState(false)

  // Gross amounts are indexed by sort order upstream; the grid wants them by id.
  const calcAmounts = useMemo(() => {
    const m = new Map<string, number>()
    lines.forEach((li, i) => m.set(li.id, grossAmountAt(i) ?? 0))
    return m
  }, [lines, grossAmountAt])

  // Merge the live discount-cap error so the grid shows it under the Disc cell
  // before the user hits Save.
  const mergedErrors = useMemo(() => {
    const merged: Record<string, string | undefined> = { ...errors }
    for (const li of lines) {
      const discErr = lineDiscountError(li)
      const key = `item:${li.id}:discount`
      if (discErr) merged[key] = discErr
      // Validated live, so a save-time error left over from an earlier
      // attempt is stale once the discount is back in range.
      else delete merged[key]
    }
    return merged
  }, [errors, lines])

  // ── BOM child helpers ─────────────────────────────────────────────────────

  function patchChildren(
    lineId: string,
    mutate: (children: BomChildRow[]) => BomChildRow[],
    expand = true,
  ) {
    const parent = lines.find((l) => l.id === lineId)
    if (!parent) return
    onPatchLine(lineId, {
      bomChildren: mutate(parent.bomChildren ?? []),
      ...(expand ? { isBomExpanded: true } : {}),
    })
  }

  function patchChild(lineId: string, childId: string, patch: Partial<BomChildRow>) {
    patchChildren(lineId, (children) =>
      children.map((c) => (c.id === childId ? { ...c, ...patch } : c)),
    )
  }

  function pickChild(lineId: string, childId: string, picked: PickedPart | null) {
    patchChild(
      lineId,
      childId,
      picked
        ? {
            partId: picked.id,
            partSku: picked.sku,
            itemName: picked.name,
            description: picked.description || undefined,
            categoryId: picked.categoryId,
            category: picked.categoryName,
            oemId: picked.oemId || undefined,
            condition: picked.condition || undefined,
            partImsId: picked.partImsId,
            listPrice: picked.sellPrice,
          }
        : {
            partId: undefined,
            partSku: undefined,
            itemName: "",
            categoryId: undefined,
            category: undefined,
            oemId: undefined,
            condition: undefined,
            partImsId: undefined,
            listPrice: undefined,
          },
    )
  }

  // ── Controller ────────────────────────────────────────────────────────────

  const ctrl: LineItemsGridController = {
    lines,
    errors: mergedErrors,
    canEdit,
    qtyOnly,
    calcAmounts,
    subtotal,
    showTax,
    taxReadonly,
    bomComponentsRule,
    requiredColumns,
    descriptionStrict,
    partNumberStrict,
    trailingColumns,
    errorSummaryId,
    extraActions: canAddLine ? (
      <Button type="button" variant="default" size="sm" onClick={() => setPasteOpen(true)}>
        <FileSpreadsheet className="mr-1.5 size-4" />
        {P.openButton}
      </Button>
    ) : undefined,
    onAddLine: canAddLine ? onAddLine : undefined,
    onClearAll: canAddLine ? onClearAll : undefined,
    hasRealLines,
    onRemoveLine,
    onPatchLine,
    onPickPart,
    onPickChildPart: pickChild,
    onAddChild: (lineId) =>
      patchChildren(lineId, (children) => [...children, createEmptyBomChild()]),
    onRemoveChild: (lineId, childId) =>
      patchChildren(lineId, (children) => children.filter((c) => c.id !== childId), false),
    onPatchChild: patchChild,
    renderLineDetail,
    priceLabel,
  }

  return (
    <>
      <LineItemsGrid {...ctrl} />
      <PasteLineItemsDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        hasExistingLines={hasRealLines}
        requiredColumns={requiredColumns}
        onApply={async (groups, mode) => {
          const applied = await onApplyPastedGroups(groups, mode)
          const lines = applied?.lines ?? groups.length
          const components =
            applied?.components ?? groups.reduce((n, g) => n + g.components.length, 0)
          toast.success(P.toast.added(lines, components, lines))
        }}
      />
    </>
  )
}
