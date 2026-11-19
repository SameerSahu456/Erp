import { useEffect } from "react"

import { ChevronDown, ChevronRight, Package2, Plus } from "lucide-react"

import { useCategory } from "@modules/ims"

import { LineItemBomEditor, type BomChildAmount } from "./LineItemBomEditor"
import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import { createEmptyBomChild } from "./lineItemMappers"
import type { BomChildRow } from "./types"

/**
 * BOM child-component section for a single line item, gated on category
 * eligibility. The pill toggle and the `LineItemBomEditor` render only
 * when the line's selected category is flagged `is_bom_eligible` on the
 * backend — otherwise the section is hidden entirely. Used across
 * Quotes, Sales Orders, and the Closed-Won wizard so the eligibility
 * rule and the visual contract stay in one place.
 *
 * Pill states (edit mode):
 *   • collapsed + zero children → "+ Add BOM" (dashed ghost). Clicking
 *     it expands the section AND appends the first empty component row,
 *     so sales never has to click "Add component" before they can start
 *     filling in a BOM.
 *   • expanded                  → "Hide BOM · N comp" (filled muted).
 *   • collapsed + N children    → "View BOM · N comp" (rare — only after
 *     manual collapse). Clicking just expands; no auto-seed.
 *
 * View mode renders the always-visible read-only editor with a quiet
 * "Assembly · N component(s)" label and no toggle button.
 */
export function LineItemBomSection({
  categoryId,
  isExpanded,
  onToggle,
  bomChildren,
  onChange,
  viewLocked = false,
  childAmounts,
  showOemCondition = false,
  oemConditionRequired = false,
}: {
  categoryId?: string
  isExpanded: boolean
  onToggle: () => void
  bomChildren: BomChildRow[]
  onChange: (rows: BomChildRow[]) => void
  viewLocked?: boolean
  /** Per-child computed money from the live /calculate response. Threads
   *  straight through to `LineItemBomEditor` so the BOM table shows the
   *  same tax-inclusive total the parent line shows. Slots may be
   *  `undefined` for rows skipped by the calc payload (qty<=0). */
  childAmounts?: Array<BomChildAmount | undefined>
  /** Show each child's Brand/OEM + Condition. **Sales Order / Closed Won
   *  only** — the quote save mapper drops both fields, so the quote must not
   *  offer them. Threads through to `LineItemBomEditor`. */
  showOemCondition?: boolean
  /** Brand/OEM + Condition mandatory on freeform components. Threads
   *  through to `LineItemBomEditor`. */
  oemConditionRequired?: boolean
}) {
  // BOM-eligibility gate — only categories flagged `is_bom_eligible` on
  // the backend surface the BOM child editor. `useCategory` auto-gates
  // on a truthy id (returns `undefined` data for "" / undefined), so the
  // section disappears the moment a line clears its category too.
  const { data: category } = useCategory(categoryId ?? "")

  // Hidden is not enough: the children stay in the line's state and the
  // save mappers would still send them, so a headline re-categorised to a
  // non-BOM category kept its BOM on the saved record (the backend now
  // 400s that with SO_CATEGORY_NOT_BOM_ELIGIBLE). Once the category has
  // resolved as not eligible, clear the children so the payload carries
  // `children: []` and the BOM is dropped server-side. Only acts on a
  // *resolved* category — never while loading — and never in view mode.
  const categoryResolvedNotEligible = category !== undefined && !category.is_bom_eligible
  const hasChildren = bomChildren.length > 0
  useEffect(() => {
    if (viewLocked || !categoryResolvedNotEligible || !hasChildren) return
    onChange([])
  }, [viewLocked, categoryResolvedNotEligible, hasChildren, onChange])

  if (!category?.is_bom_eligible) return null

  const childCount = bomChildren.length

  // View mode: no collapse/expand UI — children are part of the line's
  // permanent presentation. Hide when there's nothing to show.
  if (viewLocked) {
    if (childCount === 0) return null
    return (
      <div className="space-y-2 pl-10">
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Package2 className="size-3" />
          {LINE_ITEMS_STRINGS.section.assembly}
          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {LINE_ITEMS_STRINGS.section.componentCount(childCount)}
          </span>
        </div>
        <LineItemBomEditor
          value={bomChildren}
          onChange={onChange}
          viewLocked
          childAmounts={childAmounts}
          showOemCondition={showOemCondition}
          oemConditionRequired={oemConditionRequired}
        />
      </div>
    )
  }

  // Collapsed + empty → dashed "+ Add BOM" ghost pill. Click expands +
  // seeds the first component row so the user lands directly in an
  // editable table instead of an empty state.
  if (!isExpanded && childCount === 0) {
    return (
      <div className="pl-10">
        <button
          type="button"
          onClick={() => {
            onToggle()
            onChange([createEmptyBomChild()])
          }}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="size-3" />
          {LINE_ITEMS_STRINGS.section.addBom}
        </button>
      </div>
    )
  }

  // Collapsed + N children → "View BOM · N" filled chip. No auto-seed —
  // the user is re-opening a populated tree.
  if (!isExpanded) {
    return (
      <div className="pl-10">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted/70"
        >
          <ChevronRight className="size-3" />
          <Package2 className="size-3" />
          {LINE_ITEMS_STRINGS.section.viewBom}
          <span className="ml-1 rounded bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
            {LINE_ITEMS_STRINGS.section.compCount(childCount)}
          </span>
        </button>
      </div>
    )
  }

  // Expanded → "Hide BOM · N" filled chip + editor table.
  return (
    <div className="space-y-2 pl-10">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted/70"
      >
        <ChevronDown className="size-3" />
        <Package2 className="size-3" />
        {LINE_ITEMS_STRINGS.section.hideBom}
        <span className="ml-1 rounded bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
          {LINE_ITEMS_STRINGS.section.compCount(childCount)}
        </span>
      </button>
      <LineItemBomEditor
        value={bomChildren}
        onChange={onChange}
        viewLocked={viewLocked}
        childAmounts={childAmounts}
        showOemCondition={showOemCondition}
          oemConditionRequired={oemConditionRequired}
      />
    </div>
  )
}
