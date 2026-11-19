/**
 * Shared tabular grid for Quote and Sales Order line items.
 *
 * Works with the canonical `BuilderLineItem` / `BomChildRow` types (camelCase
 * throughout). Callers supply a `LineItemsGridController` — a small normalised
 * interface — so each surface (Quote, SO) provides a thin adapter without
 * duplicating any rendering code.
 */
import { Fragment, type ReactNode, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Eraser, Layers, Package2, Plus, Trash2, X } from "lucide-react"

import { cn, stripHtml, typedDelta } from "@/lib/utils"
import { RequiredMark } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { Typography } from "@/components/ui/typography"
import { FieldError } from "@/components/common/forms/FieldError"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCategoryOptions, useCategory } from "@/modules/ims/hooks/categories/useCategories"
import { useOEMOptions, useOEM } from "@/modules/ims/hooks/oems/useOEMs"
import { categoryLabel } from "@/modules/ims/lib/category-label"
import { useDebounce, useInfiniteDropdownLoader } from "@/shared/hooks"
import { UI } from "@/shared/constants"

// VariantPicker (sibling-variant <select> under the part number) is commented
// out below (2026-10-16) — re-add it to this import to restore it.
import { CellPartSearch, type PickedPart } from "../shared/PartLineFields"
import { useCellMenuPlacement } from "../shared/useCellMenuPlacement"
import { CellHoverPopup } from "./CellHoverPopup"
import { CellLinkContext } from "./cell-link-context"
import {
  applyQtyInput, commitQty,
  applyRateInput, commitRate,
  applyDiscountInput, commitDiscount,
  applyTaxInput, commitTax,
  bomChildDiscountError,
} from "."
import type { BuilderLineItem, BomChildRow } from "./types"
import { LINE_ITEMS_STRINGS as S } from "./line-items.strings"

const G = S.grid

/** Description is stored as rich-text HTML. The grid cell shows plain text so
 *  tags never leak into the column. Only HTML-looking values are converted:
 *  once the user types in the cell the value is plain text and passes through
 *  untouched (stripHtml trims, which would otherwise eat a trailing space on
 *  every keystroke of a controlled input). The read-only hover popup still
 *  renders the formatted HTML. Editing in the grid saves plain text. */
function descriptionCellText(value: string | undefined): string {
  if (!value) return ""
  return /<[a-z/!]/i.test(value) ? stripHtml(value) : value
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtInr(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface RowErrors {
  name?: string
  identity?: string
  description?: string
  category?: string
  /** Brand/OEM + Condition — set only by surfaces that require them on a
   *  freeform row (SO form, Closed Won). */
  oem?: string
  condition?: string
  qty?: string
  rate?: string
  discount?: string
}

// ── CellInput ────────────────────────────────────────────────────────────────

interface CellInputProps {
  value: string
  placeholder?: string
  disabled?: boolean
  numeric?: boolean
  rightAlign?: boolean
  error?: string
  /** Hard cap on the characters state will accept — pastes beyond the cap are
   *  truncated, keystrokes beyond it are dropped. Needed on cells backed by a
   *  bounded Pydantic string field (e.g. `item_name` → `max_length=255`), so a
   *  user who pastes a huge blob into a Part Name doesn't send a payload the
   *  backend will reject. The native `maxLength` attr alone isn't enough —
   *  programmatic pastes from the paste-dialog bypass it. */
  maxLength?: number
  onChange: (v: string) => void
  onBlur?: () => void
}

function CellInput({
  value,
  placeholder,
  disabled,
  numeric,
  rightAlign,
  error,
  maxLength,
  onChange,
  onBlur,
}: CellInputProps) {
  return (
    <div className="relative" title={error}>
      <input
        type="text"
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => {
          const next = maxLength ? e.target.value.slice(0, maxLength) : e.target.value
          onChange(next)
        }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          // Enter behaves like Tab: commit the cell and move focus to the next
          // tabbable element. Prevents the implicit form submit a bare Enter
          // would otherwise trigger inside the quote/SO builder form.
          if (e.key === "Enter") {
            e.preventDefault()
            focusNextTabbable(e.currentTarget)
          }
        }}
        aria-invalid={error ? true : undefined}
        className={cn("cell-input", rightAlign && "right")}
      />
    </div>
  )
}

/** Move keyboard focus to the next tabbable element after `from`, mirroring
 *  Tab navigation. Used by cell inputs so Enter commits + advances instead of
 *  submitting the enclosing form. */
function focusNextTabbable(from: HTMLElement): void {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
  const idx = all.indexOf(from)
  if (idx === -1) return
  const next = all[idx + 1]
  next?.focus()
}

/** Backend bounds `item_name` on quote/SO lines + BOM children at 255 chars
 *  (`ItemNameStr` in both schemas). Capping the cell input at the same limit
 *  prevents a user who pastes multi-row TSV directly into the Part Name cell
 *  (bypassing the Paste-from-Excel dialog) from sending a 1000+-char blob
 *  that 400s on `/calculate`. */
const ITEM_NAME_MAX_LENGTH = 255

// ── CellCategorySearch ────────────────────────────────────────────────────────

interface CellCategorySearchProps {
  value: string | undefined
  onValueChange: (id: string | undefined, name: string | undefined) => void
  disabled?: boolean
}

function CellCategorySearch({ value, onValueChange, disabled }: CellCategorySearchProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  // False until the user types: an open cell then shows the selected value
  // (selected, so typing replaces it) instead of an empty search box.
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { placement, measure } = useCellMenuPlacement(open, inputRef, 200)

  const debouncedSearch = useDebounce(inputValue.trim(), UI.DEBOUNCE_SEARCH_MS)

  const categoryQuery = useCategory(value ?? "")
  const displayName = categoryQuery.data ? categoryLabel(categoryQuery.data) : (value ? "…" : "")

  const optionsQuery = useCategoryOptions(debouncedSearch, { enabled: open })
  const items = useMemo(
    () => optionsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [optionsQuery.data?.pages],
  )
  // Callback-ref state (not useRef) so the loader re-attaches each time the
  // portaled dropdown mounts — see useInfiniteDropdownLoader.
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage: optionsQuery.hasNextPage,
    isFetchingNextPage: optionsQuery.isFetchingNextPage,
    fetchNextPage: optionsQuery.fetchNextPage,
    loadedCount: items.length,
  })

  function openDropdown(resetSearch = true) {
    measure()
    if (resetSearch) {
      setInputValue("")
      setTouched(false)
    }
    setOpen(true)
  }

  function closeDropdown() {
    setOpen(false)
    setInputValue("")
    setTouched(false)
  }

  function pick(id: string, label: string) {
    onValueChange(id, label)
    closeDropdown()
  }

  const shown = open && touched ? inputValue : (value ? displayName : "")

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={shown}
        placeholder={G.placeholders.categorySelect}
        disabled={disabled}
        onChange={(e) => {
          setTouched(true)
          if (open) {
            setInputValue(touched ? e.target.value : typedDelta(shown, e.target.value))
            return
          }
          // Closed but still focused: the option rows and the clear-× both
          // preventDefault on mousedown, so a pick / clear leaves focus in the
          // input and onFocus never fires again. Without this branch the next
          // keystroke only updates `inputValue` while `shown` stays pinned to
          // the display name — the typing is swallowed and the list never
          // opens until the user blurs and comes back. The DOM still holds the
          // display name here, so keep only what was typed and reopen as a
          // fresh search.
          setInputValue(typedDelta(shown, e.target.value))
          openDropdown(false)
        }}
        onFocus={(e) => {
          openDropdown()
          e.currentTarget.select()
        }}
        onBlur={closeDropdown}
        // A click on a cell that already has focus (a pick / clear keeps focus
        // in the input) fires no focus event, so reopen from the click itself.
        onClick={(e) => {
          if (!open) openDropdown()
          // Mouse-up after the focus-select collapses the selection; restore
          // it so the first keystroke replaces the shown value.
          if (!touched) e.currentTarget.select()
        }}
        data-open={open || undefined}
        className={cn("cell-input", value && !open && "pr-6!")}
      />
      {value && !disabled && !open && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onValueChange(undefined, undefined)
            // Clearing means "pick something else" — bring the list straight
            // back. The × keeps focus where it was (preventDefault above), so
            // when the input already has focus onFocus won't re-fire; open it
            // directly. Otherwise focus the input and let onFocus open it.
            const el = inputRef.current
            if (!el) return
            if (document.activeElement === el) openDropdown()
            else el.focus()
          }}
          className="absolute right-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear category"
        >
          <X className="size-3" />
        </button>
      )}
      {open && createPortal(
        <div
          style={{ position: "fixed" as const, zIndex: 9999, left: placement.left, top: placement.top, bottom: placement.bottom, minWidth: placement.minWidth }}
          className="cpt-cell-menu rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {optionsQuery.isLoading && items.length === 0 ? (
            <Typography asChild variant="helper" tone="muted" align="center">
              <div className="px-3 py-4">{G.loading}</div>
            </Typography>
          ) : items.length === 0 ? (
            <Typography asChild variant="helper" tone="muted" align="center">
              <div className="px-3 py-4">{debouncedSearch ? G.noMatches : G.typeToSearch}</div>
            </Typography>
          ) : (
            <div
              ref={setScrollerNode}
              onScroll={onScroll}
              onWheel={onWheel}
              style={{ maxHeight: placement.maxHeight }}
              className="overflow-y-auto p-1"
            >
              {items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row.id, categoryLabel(row))}
                  className={cn(
                    "flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                    value === row.id && "bg-accent",
                  )}
                >
                  {categoryLabel(row)}
                </button>
              ))}
              {optionsQuery.hasNextPage && (
                <div ref={setSentinelNode} className="px-2 py-1.5 text-center text-muted-foreground">
                  {optionsQuery.isFetchingNextPage ? G.loadingMore : G.scrollForMore}
                </div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

// ── CellOEMSearch ─────────────────────────────────────────────────────────────

interface CellOEMSearchProps {
  value: string | undefined
  onValueChange: (id: string | undefined, name: string | undefined) => void
  disabled?: boolean
}

function CellOEMSearch({ value, onValueChange, disabled }: CellOEMSearchProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  // False until the user types: an open cell then shows the selected value
  // (selected, so typing replaces it) instead of an empty search box.
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { placement, measure } = useCellMenuPlacement(open, inputRef, 180)

  const debouncedSearch = useDebounce(inputValue.trim(), UI.DEBOUNCE_SEARCH_MS)

  const oemQuery = useOEM(value ?? "")
  const displayName = oemQuery.data?.name ?? (value ? "…" : "")

  const optionsQuery = useOEMOptions(debouncedSearch, { enabled: open })
  const items = useMemo(
    () => optionsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [optionsQuery.data?.pages],
  )
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const { onScroll, onWheel } = useInfiniteDropdownLoader({
    open,
    scrollerNode,
    sentinelNode,
    hasNextPage: optionsQuery.hasNextPage,
    isFetchingNextPage: optionsQuery.isFetchingNextPage,
    fetchNextPage: optionsQuery.fetchNextPage,
    loadedCount: items.length,
  })

  function openDropdown(resetSearch = true) {
    measure()
    if (resetSearch) {
      setInputValue("")
      setTouched(false)
    }
    setOpen(true)
  }

  function closeDropdown() {
    setOpen(false)
    setInputValue("")
    setTouched(false)
  }

  function pick(id: string, name: string) {
    onValueChange(id, name)
    closeDropdown()
  }

  const shown = open && touched ? inputValue : (value ? displayName : "")

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={shown}
        placeholder={G.placeholders.oemSelect}
        disabled={disabled}
        onChange={(e) => {
          setTouched(true)
          if (open) {
            setInputValue(touched ? e.target.value : typedDelta(shown, e.target.value))
            return
          }
          // Closed but still focused: the option rows and the clear-× both
          // preventDefault on mousedown, so a pick / clear leaves focus in the
          // input and onFocus never fires again. Without this branch the next
          // keystroke only updates `inputValue` while `shown` stays pinned to
          // the display name — the typing is swallowed and the list never
          // opens until the user blurs and comes back. The DOM still holds the
          // display name here, so keep only what was typed and reopen as a
          // fresh search.
          setInputValue(typedDelta(shown, e.target.value))
          openDropdown(false)
        }}
        onFocus={(e) => {
          openDropdown()
          e.currentTarget.select()
        }}
        onBlur={closeDropdown}
        // A click on a cell that already has focus (a pick / clear keeps focus
        // in the input) fires no focus event, so reopen from the click itself.
        onClick={(e) => {
          if (!open) openDropdown()
          // Mouse-up after the focus-select collapses the selection; restore
          // it so the first keystroke replaces the shown value.
          if (!touched) e.currentTarget.select()
        }}
        data-open={open || undefined}
        className={cn("cell-input", value && !open && "pr-6!")}
      />
      {value && !disabled && !open && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onValueChange(undefined, undefined)
            // Clearing means "pick something else" — bring the list straight
            // back. The × keeps focus where it was (preventDefault above), so
            // when the input already has focus onFocus won't re-fire; open it
            // directly. Otherwise focus the input and let onFocus open it.
            const el = inputRef.current
            if (!el) return
            if (document.activeElement === el) openDropdown()
            else el.focus()
          }}
          className="absolute right-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear OEM"
        >
          <X className="size-3" />
        </button>
      )}
      {open && createPortal(
        <div
          style={{ position: "fixed" as const, zIndex: 9999, left: placement.left, top: placement.top, bottom: placement.bottom, minWidth: placement.minWidth }}
          className="cpt-cell-menu rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {optionsQuery.isLoading && items.length === 0 ? (
            <Typography asChild variant="helper" tone="muted" align="center">
              <div className="px-3 py-4">{G.loading}</div>
            </Typography>
          ) : items.length === 0 ? (
            <Typography asChild variant="helper" tone="muted" align="center">
              <div className="px-3 py-4">{debouncedSearch ? G.noMatches : G.typeToSearch}</div>
            </Typography>
          ) : (
            <div
              ref={setScrollerNode}
              onScroll={onScroll}
              onWheel={onWheel}
              style={{ maxHeight: placement.maxHeight }}
              className="overflow-y-auto p-1"
            >
              {items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row.id, row.name)}
                  className={cn(
                    "flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                    value === row.id && "bg-accent",
                  )}
                >
                  {row.name}
                </button>
              ))}
              {optionsQuery.hasNextPage && (
                <div ref={setSentinelNode} className="px-2 py-1.5 text-center text-muted-foreground">
                  {optionsQuery.isFetchingNextPage ? G.loadingMore : G.scrollForMore}
                </div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

// ── ConditionCombobox ─────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "refurbished", label: "Refurbished" },
  { value: "new_pull", label: "New Pull" },
]

interface ConditionComboboxProps {
  value: string | undefined
  onValueChange: (v: string | undefined) => void
  disabled?: boolean
  /** Show the leading "—" row that clears the condition. Off when the
   *  surface requires a condition on every line (SO, Closed Won) — there
   *  an empty choice is never valid, so it is not offered. */
  allowEmpty?: boolean
}

function ConditionCombobox({ value, onValueChange, disabled, allowEmpty = true }: ConditionComboboxProps) {
  const [open, setOpen] = useState(false)
  const label = CONDITION_OPTIONS.find((o) => o.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        data-open={open || undefined}
        className={cn(
          "cell-input flex items-center justify-between",
          !label && "text-muted-foreground",
        )}
      >
        {/* Empty stays EMPTY — no dash, no placeholder — so an unselected
            required cell is obviously blank next to its filled neighbours. */}
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="cpt-cell-menu w-40 p-1" align="start">
        {allowEmpty && (
          <button
            type="button"
            onClick={() => { onValueChange(undefined); setOpen(false) }}
            className={cn(
              "flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent",
              !value && "bg-accent",
            )}
          >
            {G.placeholders.conditionDash}
          </button>
        )}
        {CONDITION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onValueChange(opt.value); setOpen(false) }}
            className={cn(
              "flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent",
              value === opt.value && "bg-accent",
            )}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ── ComponentRow ─────────────────────────────────────────────────────────────

function ComponentRow({
  trailingCells,
  child,
  childIndex,
  parentNumber,
  canEdit,
  showTax,
  taxReadonly,
  qtyOnly,
  conditionClearable,
  identityError,
  descriptionError,
  nameError,
  categoryError,
  oemError,
  conditionError,
  discountError,
  onPatch,
  onPickChildPart,
  onRemove,
  hasAfterQtyColumn,
}: {
  child: BomChildRow
  trailingCells?: ReactNode[]
  childIndex: number
  parentNumber: number
  canEdit: boolean
  showTax: boolean
  taxReadonly: boolean
  qtyOnly: boolean
  conditionClearable: boolean
  identityError?: string
  descriptionError?: string
  nameError?: string
  categoryError?: string
  oemError?: string
  conditionError?: string
  discountError?: string
  onPatch: (patch: Partial<BomChildRow>) => void
  onPickChildPart: (picked: PickedPart | null) => void
  onRemove: () => void
  hasAfterQtyColumn?: boolean
}) {
  return (
    <tr className="is-component">
      <td className="center">
        <Typography variant="caption" tone="muted" numeric>
          {parentNumber}.{childIndex + 1}
        </Typography>
      </td>
      <td className="center">
        <Badge variant="grey" size="sm" className="size-5 px-0" title={G.componentTitle}>
          C
        </Badge>
      </td>
      {/* Part Number */}
      <td className={cn("cell-field", identityError && "bg-destructive/5")}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.partNumber}>
          <div
            className="space-y-0.5 px-1 py-0.5"
            title={identityError}
          >
            <CellPartSearch
              selectedPartId={child.partId}
              // Same rule as the parent row: catalog rows show the SKU (name
              // only as a fallback for hydrated rows that carry no SKU);
              // freeform rows show the typed/pasted part number. The name
              // belongs in the Part Name column.
              displayValue={child.partId ? (child.partSku ?? child.itemName) : child.partSku}
              onPick={onPickChildPart}
              onClear={() => onPickChildPart(null)}
              disabled={!canEdit || qtyOnly}
              categoryId={child.categoryId}
              oemId={child.oemId}
              condition={child.condition}
            />
            {/* Sibling-variant picker — commented out (2026-10-16).
            <VariantPicker
              partImsId={child.partImsId}
              selectedVariantId={child.partId}
              disabled={!canEdit || qtyOnly}
              onPick={onPickChildPart}
            />
            */}
          </div>
        </CellHoverPopup>
      </td>
      {/* Part Name */}
      <td
        className={cn("cell-field", nameError && "bg-destructive/5")}
        title={nameError}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.partName}>
          <CellInput
            value={child.itemName ?? ""}
            placeholder={G.placeholders.partName}
            disabled={!canEdit || qtyOnly}
            error={nameError}
            maxLength={ITEM_NAME_MAX_LENGTH}
            onChange={(v) => onPatch({ itemName: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Category */}
      <td
        className={cn("cell-field", categoryError && "bg-destructive/5")}
        title={categoryError}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.category}>
          <CellCategorySearch
            value={child.categoryId}
            onValueChange={(id, name) => onPatch({ categoryId: id, category: id ? name : undefined })}
            disabled={!canEdit || qtyOnly || !!child.partId}
          />
        </CellHoverPopup>
      </td>
      {/* OEM */}
      <td
        className={cn("cell-field", oemError && "bg-destructive/5")}
        title={oemError}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.oem}>
          <CellOEMSearch
            value={child.oemId}
            onValueChange={(id) => onPatch({ oemId: id })}
            disabled={!canEdit || qtyOnly || !!child.partId}
          />
        </CellHoverPopup>
      </td>
      {/* Condition */}
      <td
        className={cn("cell-field", conditionError && "bg-destructive/5")}
        title={conditionError}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.condition}>
          <ConditionCombobox
            value={child.condition}
            onValueChange={(v) => onPatch({ condition: v })}
            disabled={!canEdit || qtyOnly || !!child.partId}
            allowEmpty={conditionClearable}
          />
        </CellHoverPopup>
      </td>
      {/* Description */}
      <td className={cn("cell-field", descriptionError && "bg-destructive/5")} title={descriptionError}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.description} html={child.description}>
          <CellInput
            value={descriptionCellText(child.description)}
            placeholder={G.placeholders.description}
            disabled={!canEdit || qtyOnly}
            error={descriptionError}
            onChange={(v) => onPatch({ description: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Warranty */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.warranty}>
          <CellInput
            value={child.warrantyLevel ?? ""}
            placeholder={G.placeholders.warranty}
            disabled={!canEdit || qtyOnly}
            onChange={(v) => onPatch({ warrantyLevel: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Qty */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.qty}>
          <CellInput
            value={child.qtyInput ?? String(child.qty)}
            disabled={!canEdit}
            numeric
            rightAlign
            onChange={(raw) => {
              const next = applyQtyInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => onPatch(commitQty(child.qtyInput))}
          />
        </CellHoverPopup>
      </td>
      {hasAfterQtyColumn ? <td className="right" /> : null}
      {/* List Price — catalog snapshot from the child's picked variant;
          "0" for freeform children, same fallback as the parent row. */}
      <td className="right">
        <CellHoverPopup enabled={!canEdit} title={G.columns.listPrice}>
          <Typography variant="helper" tone="muted" numeric>
            {child.listPrice != null ? `₹${fmtInr(child.listPrice)}` : "0"}
          </Typography>
        </CellHoverPopup>
      </td>
      {/* Price */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.price}>
          <CellInput
            value={child.rateInput ?? (child.rate ? String(child.rate) : "")}
            placeholder="0"
            disabled={!canEdit || qtyOnly}
            numeric
            rightAlign
            onChange={(raw) => {
              const next = applyRateInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => onPatch(commitRate(child.rateInput))}
          />
        </CellHoverPopup>
      </td>
      {/* Disc */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.discount}>
          <CellInput
            value={child.discountAmountInput ?? (child.discountAmount ? String(child.discountAmount) : "")}
            placeholder="0"
            disabled={!canEdit || qtyOnly}
            numeric
            rightAlign
            error={discountError}
            onChange={(raw) => {
              const next = applyDiscountInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => onPatch(commitDiscount(child.discountAmountInput))}
          />
        </CellHoverPopup>
      </td>
      {/* Tax % */}
      {showTax && (
        <td className="cell-field">
          <CellHoverPopup enabled={!canEdit || taxReadonly} title={G.columns.tax}>
            <CellInput
              value={child.taxRateInput ?? String(child.taxRate ?? 0)}
              placeholder="0"
              disabled={!canEdit || qtyOnly || taxReadonly}
              numeric
              rightAlign
              onChange={(raw) => {
                const next = applyTaxInput(raw)
                if (next === null) return
                onPatch(next)
              }}
              onBlur={() => onPatch(commitTax(child.taxRateInput))}
            />
          </CellHoverPopup>
        </td>
      )}
      {/* Amount */}
      <td className="right">
        <CellHoverPopup enabled={!canEdit} title={G.columns.amount}>
          <Typography variant="helper" tone="muted" numeric>
            {child.rate > 0
              ? `₹${fmtInr(child.qty * child.rate - (child.discountAmount ?? 0))}`
              : G.placeholders.conditionDash}
          </Typography>
        </CellHoverPopup>
      </td>
      {trailingCells}
      {/* Delete — the action column exists only while the grid is editable */}
      {canEdit && !qtyOnly && (
        <td className="center">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            title={G.removeComponent}
            aria-label={G.removeComponent}
            className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </td>
      )}
    </tr>
  )
}

// ── ParentRow ─────────────────────────────────────────────────────────────────

function ParentRow({
  line,
  index,
  canEdit,
  amount,
  canRemove,
  rowErrors,
  showTax,
  taxReadonly,
  qtyOnly,
  conditionClearable,
  onPatch,
  onPickPart,
  onRemove,
  afterQtyCell,
  trailingCells,
  priceLabel,
}: {
  line: BuilderLineItem
  index: number
  canEdit: boolean
  amount: number
  canRemove: boolean
  rowErrors: RowErrors
  showTax: boolean
  taxReadonly: boolean
  qtyOnly: boolean
  conditionClearable: boolean
  onPatch: (patch: Partial<BuilderLineItem>) => void
  onPickPart: (picked: PickedPart | null) => void
  onRemove: () => void
  afterQtyCell?: ReactNode
  trailingCells?: ReactNode[]
  priceLabel: string
}) {
  const hasError = Object.values(rowErrors).some(Boolean)
  // Net amount (after the line discount) — same basis the BOM child rows show.
  const netAmount = Math.max(amount - (line.discountAmount || 0), 0)
  return (
    <>
    <tr className={cn(hasError && "is-error")}>
      <td
        className="center"
        title={hasError ? Object.values(rowErrors).filter(Boolean).join(" · ") : undefined}
      >
        <Typography
          variant="helper"
          tone={hasError ? "danger" : "muted"}
          numeric
          className={cn(hasError && "font-medium")}
        >
          {index + 1}
        </Typography>
      </td>
      <td className="center">
        <Badge variant="primary-soft" size="sm" className="size-5 px-0 text-primary" title={G.parentTitle}>
          P
        </Badge>
      </td>
      {/* Part Number + VariantPicker stacked */}
      <td className={cn("cell-field", rowErrors.identity && "bg-destructive/5")}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.partNumber}>
          <div className="space-y-0.5 px-1 py-0.5" title={rowErrors.identity}>
            <CellPartSearch
              selectedPartId={line.partId}
              // Catalog rows show SKU (name as fallback); freeform rows show the
              // pasted/typed part number only — the name belongs in Part Name.
              displayValue={line.partId ? (line.partSku ?? line.partName) : line.partSku}
              onPick={onPickPart}
              onClear={() => onPickPart(null)}
              disabled={!canEdit || qtyOnly}
              categoryId={line.categoryId}
              oemId={line.oemId}
              condition={line.condition}
            />
            {/* Sibling-variant picker — commented out (2026-10-16).
            <VariantPicker
              partImsId={line.partImsId}
              selectedVariantId={line.partId}
              disabled={!canEdit || qtyOnly}
              onPick={onPickPart}
            />
            */}
          </div>
        </CellHoverPopup>
      </td>
      {/* Part Name */}
      <td className={cn("cell-field", rowErrors.name && "bg-destructive/5")}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.partName}>
          <CellInput
            value={line.partName ?? line.itemName ?? ""}
            placeholder={G.placeholders.partName}
            disabled={!canEdit || qtyOnly}
            error={rowErrors.name}
            maxLength={ITEM_NAME_MAX_LENGTH}
            onChange={(v) => onPatch({ partName: v, itemName: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Category */}
      <td className={cn("cell-field", rowErrors.category && "bg-destructive/5")} title={rowErrors.category}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.category}>
          <CellCategorySearch
            value={line.categoryId}
            onValueChange={(id, name) => onPatch({ categoryId: id, category: id ? name : undefined })}
            disabled={!canEdit || qtyOnly || !!line.partId}
          />
        </CellHoverPopup>
      </td>
      {/* OEM */}
      <td
        className={cn("cell-field", rowErrors.oem && "bg-destructive/5")}
        title={rowErrors.oem}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.oem}>
          <CellOEMSearch
            value={line.oemId}
            onValueChange={(id, name) => onPatch({ oemId: id, brand: id ? name : undefined })}
            disabled={!canEdit || qtyOnly || !!line.partId}
          />
        </CellHoverPopup>
      </td>
      {/* Condition */}
      <td
        className={cn("cell-field", rowErrors.condition && "bg-destructive/5")}
        title={rowErrors.condition}
      >
        <CellHoverPopup enabled={!canEdit} title={G.columns.condition}>
          <ConditionCombobox
            value={line.condition}
            onValueChange={(v) => onPatch({ condition: v })}
            disabled={!canEdit || qtyOnly || !!line.partId}
            allowEmpty={conditionClearable}
          />
        </CellHoverPopup>
      </td>
      {/* Description — stored as rich-text HTML (the stacked editor writes it);
          the grid cell shows the plain text so tags never leak into the column.
          The hover popup still renders the formatted HTML. Editing here saves
          plain text. */}
      <td className={cn("cell-field", rowErrors.description && "bg-destructive/5")} title={rowErrors.description}>
        <CellHoverPopup enabled={!canEdit} title={G.columns.description} html={line.description}>
          <CellInput
            value={descriptionCellText(line.description)}
            placeholder={G.placeholders.description}
            disabled={!canEdit || qtyOnly}
            error={rowErrors.description}
            onChange={(v) => onPatch({ description: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Warranty — plain-text free-form per line. */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.warranty}>
          <CellInput
            value={line.warrantyLevel ?? ""}
            placeholder={G.placeholders.warranty}
            disabled={!canEdit || qtyOnly}
            onChange={(v) => onPatch({ warrantyLevel: v })}
          />
        </CellHoverPopup>
      </td>
      {/* Qty */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.qty}>
          <CellInput
            value={line.qtyInput ?? String(line.qty)}
            disabled={!canEdit}
            numeric
            rightAlign
            error={rowErrors.qty}
            onChange={(raw) => {
              const next = applyQtyInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => onPatch(commitQty(line.qtyInput))}
          />
        </CellHoverPopup>
      </td>
      {afterQtyCell}
      {/* List Price (static) — variant's catalog sell_price, captured at pick time */}
      <td className="right">
        <Typography variant="helper" tone="muted" numeric>
          {line.listPrice != null ? `₹${fmtInr(line.listPrice)}` : "0"}
        </Typography>
      </td>
      {/* Price */}
      <td
        className={cn("cell-field", rowErrors.rate && "bg-destructive/5")}
        title={rowErrors.rate}
      >
        <CellHoverPopup enabled={!canEdit} title={priceLabel}>
          <CellInput
            value={line.rateInput ?? String(line.rate ?? 0)}
            disabled={!canEdit || qtyOnly}
            numeric
            rightAlign
            error={rowErrors.rate}
            onChange={(raw) => {
              const next = applyRateInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => onPatch(commitRate(line.rateInput))}
          />
        </CellHoverPopup>
      </td>
      {/* Disc */}
      <td className="cell-field">
        <CellHoverPopup enabled={!canEdit} title={G.columns.discount}>
          <CellInput
            value={line.discountAmountInput ?? String(line.discountAmount ?? 0)}
            disabled={!canEdit || qtyOnly}
            numeric
            rightAlign
            error={rowErrors.discount}
            onChange={(raw) => {
              const next = applyDiscountInput(raw)
              if (next === null) return
              onPatch(next)
            }}
            onBlur={() => {
              const committed = commitDiscount(line.discountAmountInput)
              onPatch(committed)
            }}
          />
        </CellHoverPopup>
      </td>
      {/* Tax % */}
      {showTax && (
        <td className="cell-field">
          <CellHoverPopup enabled={!canEdit || taxReadonly} title={G.columns.tax}>
            <CellInput
              value={line.taxRateInput ?? String(line.taxRate ?? 0)}
              disabled={!canEdit || qtyOnly || taxReadonly}
              numeric
              rightAlign
              onChange={(raw) => {
                const next = applyTaxInput(raw)
                if (next === null) return
                onPatch(next)
              }}
              onBlur={() => onPatch(commitTax(line.taxRateInput))}
            />
          </CellHoverPopup>
        </td>
      )}
      {/* Amount */}
      <td className="right">
        <CellHoverPopup enabled={!canEdit} title={G.columns.amount}>
          <Typography variant="body-strong" numeric>
            ₹{fmtInr(netAmount)}
          </Typography>
        </CellHoverPopup>
      </td>
      {trailingCells}
      {/* Delete — the action column exists only while the grid is editable */}
      {canEdit && !qtyOnly && (
        <td className="center">
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              title={G.removeLine}
              aria-label={G.removeLine}
              className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
        </td>
      )}
    </tr>
    {rowErrors.discount && (
      <tr>
        <td colSpan={99} className="py-1">
          <div className="sticky left-4 w-fit">
            <Typography variant="helper" tone="danger" role="alert">
              {rowErrors.discount}
            </Typography>
          </div>
        </td>
      </tr>
    )}
    </>
  )
}

// ── AddComponentRow ───────────────────────────────────────────────────────────

interface AddComponentRowProps {
  line: BuilderLineItem
  rule: BomComponentsRule
  totalCols: number
  onAdd: () => void
}

function AddComponentRow({ line, rule, totalCols, onAdd }: AddComponentRowProps) {
  const gated = rule === "bom-eligible-category"
  // Same query key the Category cell uses for its label, so this is a cache
  // hit once a category is chosen; disabled entirely under the "always" rule.
  const categoryQuery = useCategory(gated ? (line.categoryId ?? "") : "")
  const eligible = !gated || categoryQuery.data?.is_bom_eligible === true
  if (!eligible) return null
  return (
    <tr className="is-add-row">
      {/* Left padding (indent past "#" + "P/C" cols) is owned by
          `.cpt-edit-grid tbody tr.is-add-row td` in comprint.css — a Tailwind
          `pl-*` utility here loses on specificity to the broader `tbody td`
          padding rule, so changing the class silently does nothing. */}
      <td colSpan={totalCols}>
        <Button type="button" variant="ghost" size="xs" onClick={onAdd} className="text-primary">
          <Plus />
          {G.addComponent}
        </Button>
      </td>
    </tr>
  )
}

// ── Public controller interface ───────────────────────────────────────────────

/** Who may add BOM components under a parent line.
 *  - "always": every parent line offers "+ Add component" (no category gate).
 *  - "bom-eligible-category": only when the line's category has
 *    `is_bom_eligible` (Quote, Sales Order, Close-Won). Resolved from the
 *    category record the Category cell already fetches, so it costs no extra
 *    request. */
export type BomComponentsRule = "always" | "bom-eligible-category"

/** Header columns a caller can flag as mandatory (red `*` in the `<th>`). */
export type LineItemColumnKey =
  | "partNumber"
  | "partName"
  | "category"
  | "oem"
  | "condition"
  | "description"
  | "qty"
  | "listPrice"
  | "price"
  | "discount"
  | "tax"

/** Read-only column appended after Amount (before the row action slot).
 *  Lets a surface show per-line data the shared model does not carry
 *  (e.g. quote approval status / approver) without forking the grid. */
export interface LineItemsGridTrailingColumn {
  key: string
  header: ReactNode
  /** Tailwind width class for the header cell. Defaults to `w-28`. */
  widthClassName?: string
  /** Parent-line cell. */
  renderCell: (line: BuilderLineItem, index: number) => ReactNode
  /** Component (BOM child) cell. Defaults to an empty cell. */
  renderChildCell?: (child: BomChildRow, line: BuilderLineItem) => ReactNode
}

/** Scroll-floor width each trailing column adds to the table (px). */
const TRAILING_COL_MIN_WIDTH_PX = 128

export interface LineItemsGridController {
  lines: BuilderLineItem[]
  bomComponentsRule?: BomComponentsRule
  /** Columns whose header carries the red required marker. Each caller
   *  passes exactly the set its save-time validator enforces, so the marker
   *  and the rule never disagree. Hidden in read-only mode. */
  requiredColumns?: ReadonlyArray<LineItemColumnKey>
  /** When true, the Description cell's save-error clears based on
   *  description content alone — picking a Part Number no longer suppresses
   *  it. Default (false) preserves the SO either/or behaviour. */
  descriptionStrict?: boolean
  /** When true, the Part Number cell's save-error clears based on partId
   *  alone — typing a Description no longer suppresses it. Used by Close Won
   *  where every line must resolve to a catalog part. Default (false)
   *  preserves the SO either/or behaviour. */
  partNumberStrict?: boolean
  errors: Record<string, string | undefined>
  canEdit: boolean
  calcAmounts: Map<string, number>
  subtotal: number
  showTax?: boolean
  /** When true, the Tax % column still renders (shows the computed/stored
   *  value) but its input is disabled. SO uses this because tax is set
   *  server-side from the quote/catalog and must not be hand-edited. */
  taxReadonly?: boolean
  qtyOnly?: boolean
  extraActions?: ReactNode
  /** Extra read-only columns rendered after Amount. */
  trailingColumns?: LineItemsGridTrailingColumn[]
  errorSummaryId?: string
  onPatchLine: (id: string, patch: Partial<BuilderLineItem>) => void
  onPickPart: (id: string, picked: PickedPart | null) => void
  onPickChildPart: (lineId: string, childId: string, picked: PickedPart | null) => void
  onAddLine?: () => void
  /** Confirmed "Clear all" — removes every line. Hidden when undefined. */
  onClearAll?: () => void
  /** Whether any line carries real content; gates the Clear all button. */
  hasRealLines?: boolean
  onRemoveLine: (id: string) => void
  onAddChild: (lineId: string) => void
  onRemoveChild: (lineId: string, childId: string) => void
  onPatchChild: (lineId: string, childId: string, patch: Partial<BomChildRow>) => void
  /** Optional column inserted immediately after the standard Qty column.
   *  Same shape as `trailingColumns` but rendered in-line with the data
   *  columns so the extra value sits visually adjacent to Qty. Used by the
   *  SO detail view to show per-line returned_qty right next to the
   *  ordered qty. BOM child rows render an empty cell in this slot. */
  afterQtyColumn?: LineItemsGridTrailingColumn
  /** Surface-specific detail rendered as a full-width row under a parent
   *  line (e.g. the SO form's per-line rental billing period). Return
   *  null/undefined for lines that need none. */
  renderLineDetail?: (line: BuilderLineItem, index: number) => ReactNode
  /** Read-only grids only: where a line's cells link to, instead of opening
   *  the full-value modal. Its component rows link to the same place — the
   *  parts are fitted in the line's units. Omitted → the modal, everywhere. */
  cellHref?: (lineId: string) => string | undefined
  /** The rate column's label. A rental document passes "Monthly Rate" — a
   *  rental line's rate is its rent per month. Omitted → "Price". */
  priceLabel?: string
}

// ── LineItemsGrid ─────────────────────────────────────────────────────────────

export function LineItemsGrid(ctrl: LineItemsGridController) {
  const {
    lines, errors, canEdit, calcAmounts, subtotal,
    showTax = false, taxReadonly = false, qtyOnly = false, extraActions, errorSummaryId,
    bomComponentsRule = "always", requiredColumns, descriptionStrict = false,
    partNumberStrict = false,
    trailingColumns = [],
    afterQtyColumn,
    onPatchLine, onPickPart, onPickChildPart,
    onAddLine, onClearAll, hasRealLines = false,
    onRemoveLine, onAddChild, onRemoveChild, onPatchChild, renderLineDetail, cellHref,
    priceLabel = G.columns.price,
  } = ctrl

  const parentCount = lines.length
  const requiredSet = useMemo(() => new Set(requiredColumns ?? []), [requiredColumns])
  const req = (key: LineItemColumnKey) =>
    canEdit && requiredSet.has(key) ? <RequiredMark className="ml-0.5" /> : null
  // A surface that marks Condition required (SO, Closed Won) never has a
  // valid "no condition" choice, so the dropdown drops its clearing row.
  const conditionClearable = !requiredSet.has("condition")
  const componentCount = useMemo(
    () => lines.reduce((n, li) => n + (li.bomChildren ?? []).length, 0),
    [lines],
  )

  const lineErrorsMap = useMemo(() => {
    const map = new Map<string, RowErrors>()
    for (const li of lines) {
      // Part Number / Description are either-or by default: once one is
      // filled, both highlights go away (errors are only recomputed on save,
      // so the live clearing happens here). When `descriptionStrict` is set
      // (quotes), picking a part no longer clears the Description error —
      // only typing a description does. Symmetrically, `partNumberStrict`
      // (Close Won) stops a typed description from clearing the Part Number
      // error — only picking a catalog part does.
      const hasDescription = stripHtml(li.description).length > 0
      const identified = !!li.partId || hasDescription
      map.set(li.id, {
        name: errors[`item:${li.id}:name`],
        identity: (partNumberStrict ? !!li.partId : identified)
          ? undefined
          : errors[`item:${li.id}:identity`],
        description: (descriptionStrict ? hasDescription : identified)
          ? undefined
          : errors[`item:${li.id}:description`],
        category: errors[`item:${li.id}:category`],
        oem: errors[`item:${li.id}:oem`],
        condition: errors[`item:${li.id}:condition`],
        qty: errors[`item:${li.id}:qty`],
        rate: errors[`item:${li.id}:rate`],
        discount: errors[`item:${li.id}:discount`],
      })
    }
    return map
  }, [lines, errors])

  // Row-action (delete) column only exists while the grid is editable; in the
  // read-only view it would just be an empty trailing column.
  const showActions = canEdit && !qtyOnly
  const dataCols = 11 + (showTax ? 1 : 0) + trailingColumns.length + (afterQtyColumn ? 1 : 0)
  const totalCols = dataCols + 2 + (showActions ? 1 : 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Typography variant="card-title">{G.title}</Typography>
          <Badge variant="secondary" size="sm">
            <Package2 />
            {G.parentCount(parentCount)}
          </Badge>
          <Badge variant="outline" size="sm">
            <Layers />
            {G.componentCount(componentCount)}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && onClearAll && (hasRealLines || lines.length > 1) && (
            <ConfirmDialog
              title={G.clearAllTitle}
              description={G.clearAllDescription}
              confirmLabel={G.clearAllConfirm}
              variant="destructive"
              onConfirm={onClearAll}
              trigger={
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Eraser />
                  {G.clearAll}
                </Button>
              }
            />
          )}
          {canEdit && onAddLine && (
            <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
              <Plus />
              {G.addLineItem}
            </Button>
          )}
          {extraActions}
        </div>
      </div>

      <FieldError id={errorSummaryId ?? "line-items-error"} message={errors.items} className="mb-2" />

      <div className="cpt-table-wrap">
        {/* Native bar, kept visible — see .cpt-edit-grid-scroll in comprint.css. */}
        <div className="cpt-edit-grid-scroll">
        <table
          className={cn("cpt-edit-grid", !canEdit && "is-readonly", showTax ? "min-w-[1540px]" : "min-w-[1440px]")}
          style={
            trailingColumns.length > 0
              ? { minWidth: (showTax ? 1540 : 1440) + trailingColumns.length * TRAILING_COL_MIN_WIDTH_PX }
              : undefined
          }
        >
          <thead>
            <tr>
              <th className="w-10 center">#</th>
              <th className="w-10 center">P/C</th>
              <th className="w-40">{G.columns.partNumber}{req("partNumber")}</th>
              <th className="w-36">{G.columns.partName}{req("partName")}</th>
              <th className="w-36">{G.columns.category}{req("category")}</th>
              <th className="w-28">{G.columns.oem}{req("oem")}</th>
              <th className="w-28">{G.columns.condition}{req("condition")}</th>
              <th className="min-w-[240px]">{G.columns.description}{req("description")}</th>
              <th className="w-28">{G.columns.warranty}</th>
              <th className="w-16 right">{G.columns.qty}{req("qty")}</th>
              {afterQtyColumn && (
                <th className={afterQtyColumn.widthClassName ?? "w-20 right"}>
                  {afterQtyColumn.header}
                </th>
              )}
              <th className="w-24 right">{G.columns.listPrice}{req("listPrice")}</th>
              <th className="w-24 right">{priceLabel}{req("price")}</th>
              <th className="w-20 right">{G.columns.discount}{req("discount")}</th>
              {showTax && (
                <th className="w-16 right">{G.columns.tax}{req("tax")}</th>
              )}
              <th className="w-28 right">{G.columns.amount}</th>
              {trailingColumns.map((c) => (
                <th key={c.key} className={c.widthClassName ?? "w-28"}>
                  {c.header}
                </th>
              ))}
              {showActions && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((li, idx) => {
              const amount = calcAmounts.get(li.id) ?? 0
              const children = li.bomChildren ?? []
              const detail = renderLineDetail?.(li, idx)
              return (
                <CellLinkContext.Provider key={li.id} value={canEdit ? undefined : cellHref?.(li.id)}>
                  <ParentRow
                    line={li}
                    index={idx}
                    canEdit={canEdit}
                    amount={amount}
                    canRemove={lines.length > 1}
                    rowErrors={lineErrorsMap.get(li.id) ?? {}}
                    priceLabel={priceLabel}
                    showTax={showTax}
                    taxReadonly={taxReadonly}
                    qtyOnly={qtyOnly}
                    conditionClearable={conditionClearable}
                    onPatch={(patch) => onPatchLine(li.id, patch)}
                    onPickPart={(picked) => onPickPart(li.id, picked)}
                    onRemove={() => onRemoveLine(li.id)}
                    afterQtyCell={
                      afterQtyColumn
                        ? (
                          <td
                            key={afterQtyColumn.key}
                            className={afterQtyColumn.widthClassName ?? "right"}
                          >
                            {afterQtyColumn.renderCell(li, idx)}
                          </td>
                        )
                        : null
                    }
                    trailingCells={trailingColumns.map((c) => (
                      <td key={c.key}>{c.renderCell(li, idx)}</td>
                    ))}
                  />
                  {detail != null && (
                    <tr className="is-line-detail">
                      <td colSpan={totalCols}>
                        {/* Pinned left so it stays in view while the wide
                            grid scrolls sideways. */}
                        <div className="sticky left-0 max-w-[720px] px-3 pt-2">{detail}</div>
                      </td>
                    </tr>
                  )}
                  {children.map((c, ci) => (
                    <Fragment key={c.id}>
                    <ComponentRow
                      child={c}
                      childIndex={ci}
                      parentNumber={idx + 1}
                      canEdit={canEdit}
                      showTax={showTax}
                      taxReadonly={taxReadonly}
                      qtyOnly={qtyOnly}
                      conditionClearable={conditionClearable}
                      hasAfterQtyColumn={!!afterQtyColumn}
                      identityError={
                        (partNumberStrict ? !!c.partId : c.partId || stripHtml(c.description).length > 0)
                          ? undefined
                          : errors[`item:${li.id}:child:${c.id}:identity`]
                      }
                      descriptionError={
                        (descriptionStrict ? stripHtml(c.description).length > 0 : c.partId || stripHtml(c.description).length > 0)
                          ? undefined
                          : errors[`item:${li.id}:child:${c.id}:description`]
                      }
                      nameError={errors[`item:${li.id}:child:${c.id}:name`]}
                      categoryError={errors[`item:${li.id}:child:${c.id}:category`]}
                      oemError={errors[`item:${li.id}:child:${c.id}:oem`]}
                      conditionError={errors[`item:${li.id}:child:${c.id}:condition`]}
                      discountError={bomChildDiscountError(c) ?? undefined}
                      onPatch={(patch) => onPatchChild(li.id, c.id, patch)}
                      onPickChildPart={(picked) => onPickChildPart(li.id, c.id, picked)}
                      onRemove={() => onRemoveChild(li.id, c.id)}
                      trailingCells={trailingColumns.map((col) => (
                        <td key={col.key}>{col.renderChildCell?.(c, li)}</td>
                      ))}
                    />
                    {bomChildDiscountError(c) && (
                      <tr>
                        <td colSpan={99} className="py-1">
                          <div className="sticky left-4 w-fit">
                            <Typography variant="helper" tone="danger" role="alert">
                              {bomChildDiscountError(c)}
                            </Typography>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                  {canEdit && !qtyOnly && (
                    <AddComponentRow
                      line={li}
                      rule={bomComponentsRule}
                      totalCols={totalCols}
                      onAdd={() => onAddChild(li.id)}
                    />
                  )}
                </CellLinkContext.Provider>
              )
            })}
          </tbody>
        </table>
        {/* Subtotal sits inside the scroll container so the scrollbar renders
            below it, but is pinned with sticky-left so only the table above
            moves when the user scrolls sideways. */}
        <div className="sticky left-0 flex items-center justify-end gap-3 border-t border-border bg-muted/55 px-3 py-2">
          <Typography variant="helper" tone="muted" className="font-semibold uppercase tracking-wider">
            {G.subtotal}
          </Typography>
          <Typography variant="body-strong" numeric>
            ₹{fmtInr(subtotal)}
          </Typography>
        </div>
        </div>
      </div>

      <Typography variant="caption" tone="muted" className="mt-2 block">
        {G.componentPricingNote}
      </Typography>
    </div>
  )
}
