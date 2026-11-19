import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { partOptionDescription } from '@modules/ims'

import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/ui/async-select'
import { Typography } from '@/components/ui/typography'
import { FieldError } from '@/components/common/forms/FieldError'
import { cn, typedDelta } from '@/lib/utils'
import { useDebounce } from '@/shared/hooks'
import { UI } from '@/shared/constants'
import { MENU_LIST_MAX, placeMenu, type DropPlacement } from './useCellMenuPlacement'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { useVariantsListInfinite } from '@/modules/ims/hooks/variants/useVariants'
import type { VariantListItem } from '@/modules/ims/api'

import { variantConditionLabel } from '../../constants/variant-condition'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

export interface PickedPart {
  id: string
  sku: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  /** OEM id — lets a picked part auto-fill an OEM *picker* (which binds by
   *  id), where `brand` only ever suits display. */
  oemId: string
  brand: string
  sellPrice?: number
  condition?: string
  /** GST rate (%) from the variant's HSN code, when the backend resolves
   *  one. Undefined when the variant has no HSN mapping. Callers use it to
   *  auto-fill the line's Tax % on pick. */
  hsnGstRate?: number
  /** Mirrors the variant's `category.is_bom_eligible` — surfaced on the
   *  variants list so pickers can gate "Add component" on the parent line
   *  without a /categories round-trip. Added 2026-10-13. */
  isBomEligible?: boolean
  /** Parent Part UUID (VariantListItem.part_id). Stored on the line so the
   *  VariantPicker can filter sibling variants without an extra round-trip. */
  partImsId?: string
  /** Parent part's number — repeats across a part's variants, so never an
   *  identifier on its own (`sku` is unique). Kept raw so callers that want a
   *  "Part No — Variant" label can compose it with `variantName`. */
  partNumber?: string
  /** The variant's OWN name (backend `variant.name`), distinct from the
   *  composed `name` label (`display_title` = `part_name — variant_name`). */
  variantName?: string
  /** The parent part's OWN name (backend `part_name`), distinct from the
   *  composed `name` label. Lets a caller show just the part name (e.g. the PO
   *  Part Name column) rather than the `part_name — variant_name` title. */
  partName?: string
}

// ── One label per variant, used everywhere ──
export const variantSkuLabel = (row: VariantListItem) => row.sku_code || row.part_number
export const variantNameLabel = (row: VariantListItem) => row.display_title || row.part_name
// "<part_number> - <variant_name>" — the PO Part No column label. Kept here so
// the dropdown option and the POFormBody `partNoDisplay` (which composes the
// same two fields off the picked/hydrated line) stay in the same shape.
export const variantPartNoLabel = (row: VariantListItem) =>
  `${row.part_number} - ${row.name}`

export function toPickedPart(row: VariantListItem): PickedPart {
  return {
    id: row.id,
    sku: variantSkuLabel(row),
    name: variantNameLabel(row),
    description: row.description || row.part_description || '',
    categoryId: row.category_id,
    categoryName: row.category_name,
    oemId: row.oem_id,
    brand: row.oem_name,
    sellPrice: row.sell_price ? Number(row.sell_price) : undefined,
    condition: row.condition,
    hsnGstRate: row.hsn_gst_rate != null ? Number(row.hsn_gst_rate) : undefined,
    isBomEligible: row.is_bom_eligible,
    partImsId: row.part_id,
    partNumber: row.part_number,
    variantName: row.name,
    partName: row.part_name,
  }
}

interface PartComboboxProps {
  searchBy: 'sku' | 'name'
  selectedPartId?: string
  displayValue?: string
  onPick: (part: PickedPart) => void
  className?: string
  triggerClassName?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  onClear?: () => void
  /** Freeze the trigger label per picked part: a `displayValue` change for
   *  the SAME `selectedPartId` does not retitle it. For forms whose
   *  `displayValue` is the line's editable name (CRM quote / SO line items),
   *  where renaming the line otherwise retyped the Part Number box. Opt-in so
   *  the PO forms keep their own composed labels. */
  stableLabel?: boolean
  /** Narrow the variant search to the row's Category / OEM / condition
   *  (new / refurbished / new_pull). PO forms narrow this to
   *  `'new' | 'refurbished'`; CRM Quote / SO forms pass the picked line's raw
   *  condition through. Omit to search all conditions. */
  categoryId?: string
  oemId?: string
  condition?: string
  /** When true the dropdown option shows ONLY this field's value — just the part
   *  number in the `sku` picker, just the part name in the `name` picker (instead
   *  of the default primary + secondary two-line row). Opt-in so CRM/SO keep the
   *  two-line option; the PO forms turn it on. */
  singleField?: boolean
}

function PartCombobox({
  searchBy,
  selectedPartId,
  displayValue,
  onPick,
  triggerClassName,
  size = 'md',
  disabled,
  onClear,
  stableLabel = false,
  categoryId,
  oemId,
  condition,
  singleField = false,
}: PartComboboxProps) {
  const placeholder = searchBy === 'sku' ? 'Select part number…' : 'Search by name…'
  const searchPlaceholder = searchBy === 'sku' ? 'Search part number or description…' : 'Search by name or description…'
  const heightClass = size === 'sm' ? 'h-8 text-xs' : 'h-9'

  // The label is the part's name as picked (`display_title`) — the same string
  // the SO/quote save sends as `item_name`, and the only name the item
  // response returns, so a reopened line reads `item_name` here. It is frozen
  // per `selectedPartId`: the row's Name input edits the same `partName` the
  // caller passes as `displayValue`, and without the freeze every keystroke
  // retitled the Part Number box.
  const [frozen, setFrozen] = useState({ id: selectedPartId, label: displayValue })
  if (frozen.id !== selectedPartId) setFrozen({ id: selectedPartId, label: displayValue })

  const label = stableLabel ? (frozen.label ?? displayValue) : displayValue
  const value = selectedPartId ? { id: selectedPartId, label: label ?? selectedPartId } : null

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const useVariants = useMemo(
    () =>
      function useVariants(search: string, opts?: { enabled?: boolean }) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useVariantsListInfinite(search, {
          ...opts,
          ...(categoryId ? { category_id: categoryId } : {}),
          ...(oemId ? { oem_id: oemId } : {}),
          ...(condition
            ? { condition: condition as 'new' | 'refurbished' | 'new_pull' }
            : {}),
        })
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, oemId, condition],
  )

  return (
    <AsyncSelect<VariantListItem>
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === null && onClear) onClear()
      }}
      onItemPick={(row) => onPick(toPickedPart(row))}
      useOptions={useVariants}
      // BOTH modes label the variant with `display_title`. It's the only name
      // string the quote/SO item response returns (as `item_name`), so it is
      // also what the trigger falls back to on edit-mode hydration — labelling
      // the option with anything else (e.g. `sku_code`) makes the row you
      // picked read differently from the row you're looking at. `sku_code`
      // stays visible on the secondary line, and still rides on
      // `PickedPart.sku` for callers that persist a real SKU.
      toLabel={(row) => variantNameLabel(row)}
      getDescription={partOptionDescription}
      renderItem={(row) =>
        singleField ? (
          // Single-field option: "<part_number> - <variant_name>" for the sku
          // picker (the PO Part No column) so the option reads the same as the
          // selected value, or just the part name for the name picker. Used by
          // the PO forms.
          <Typography variant="body-strong" asChild>
            <div className="min-w-0 truncate">
              {searchBy === 'sku' ? variantPartNoLabel(row) : row.part_name}
            </div>
          </Typography>
        ) : searchBy === 'sku' ? (
          <div className="min-w-0">
            <Typography variant="body-strong" asChild>
              <div>{variantNameLabel(row)}</div>
            </Typography>
            <Typography variant="helper" asChild>
              <div>
                {variantSkuLabel(row)}
                {row.condition ? ` · ${variantConditionLabel(row.condition)}` : ''} ·{' '}
                {row.available_stock_qty} {CRM_SHARED_STRINGS.partLineFields.availableSuffix}
              </div>
            </Typography>
          </div>
        ) : (
          // Name search: part names collide across conditions (same part exists
          // as new / refurbished / new_pull), so lead the secondary line with
          // condition + available stock to disambiguate which variant is picked.
          <div className="min-w-0">
            <Typography variant="body-strong" asChild>
              <div>{variantNameLabel(row)}</div>
            </Typography>
            <Typography variant="helper" asChild>
              <div>
                {row.condition ? `${variantConditionLabel(row.condition)} · ` : ''}
                {row.available_stock_qty} {CRM_SHARED_STRINGS.partLineFields.availableSuffix} ·{' '}
                {variantSkuLabel(row)}
                {row.oem_name ? ` · ${row.oem_name}` : ''}
              </div>
            </Typography>
          </div>
        )
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      clearable={!!onClear}
      chevron="down"
      loadOnOpen
      className={cn('w-full justify-between font-normal', heightClass, triggerClassName)}
    />
  )
}

export interface PartLineFieldsValue {
  partId?: string
  partSku?: string
  partName?: string
  description: string
}

interface PartLineFieldsProps {
  value: PartLineFieldsValue
  onChange: (next: PartLineFieldsValue, picked?: PickedPart | null) => void
  className?: string
  nameError?: string
  onNameChange?: () => void
}

function PartLineFields({ value, onChange, className, nameError, onNameChange }: PartLineFieldsProps) {
  const hasSelection = useMemo(() => Boolean(value.partId), [value.partId])

  function handlePick(part: PickedPart) {
    onChange(
      {
        partId: part.id,
        partSku: part.sku,
        partName: part.name,
        description: part.description || value.description,
      },
      part
    )
  }

  function handleClear() {
    onChange(
      {
        partId: undefined,
        partSku: undefined,
        partName: undefined,
        description: value.description,
      },
      null
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      <div className="space-y-1 md:col-span-2 lg:col-span-1">
        <label className="text-xs font-medium text-muted-foreground">
          {CRM_SHARED_STRINGS.partLineFields.partNumberLabel}
        </label>
        <PartCombobox
          searchBy="sku"
          stableLabel
          selectedPartId={value.partId}
          displayValue={value.partName ?? value.partSku}
          onPick={handlePick}
          onClear={handleClear}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {CRM_SHARED_STRINGS.partLineFields.nameLabel}{' '}
          <span className="text-destructive">*</span>
        </label>
        <Input
          value={value.partName ?? ''}
          onChange={(e) => {
            onChange({ ...value, partName: e.target.value })
            onNameChange?.()
          }}
          placeholder={CRM_SHARED_STRINGS.partLineFields.namePlaceholder}
          className="h-9"
          aria-invalid={Boolean(nameError)}
        />
        <FieldError message={nameError} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {CRM_SHARED_STRINGS.partLineFields.descriptionLabel}
        </label>
        <Input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder={CRM_SHARED_STRINGS.partLineFields.descriptionPlaceholder}
          className="h-9"
        />
      </div>

      {hasSelection && (
        <div className="md:col-span-2 lg:col-span-3 -mt-1">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {CRM_SHARED_STRINGS.partLineFields.clearPartSelection}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Variant picker ──────────────────────────────────────────────────────────

const CONDITION_DISPLAY: Record<string, string> = {
  new: 'New',
  refurbished: 'Refurbished',
  new_pull: 'New Pull',
}

export interface VariantPickerProps {
  partImsId: string | undefined
  selectedVariantId: string | undefined
  disabled?: boolean
  size?: 'sm' | 'md'
  onPick: (part: PickedPart) => void
}

export function VariantPicker({
  partImsId,
  selectedVariantId,
  disabled,
  size = 'sm',
  onPick,
}: VariantPickerProps) {
  const query = useVariantsListInfinite('', {
    part_id: partImsId,
    enabled: !!partImsId,
    is_active: true,
  })

  const variants = query.data?.pages.flatMap((p) => p.items) ?? []

  if (!partImsId || query.isLoading || variants.length < 2) return null

  const heightClass = size === 'sm' ? 'h-7 text-[11px]' : 'h-8 text-xs'

  return (
    <select
      value={selectedVariantId ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const row = variants.find((v) => v.id === e.target.value)
        if (row) onPick(toPickedPart(row))
      }}
      className={cn(
        'w-full appearance-none rounded border border-input bg-background px-2 font-mono outline-none',
        'focus:ring-1 focus:ring-primary/40',
        disabled && 'cursor-not-allowed opacity-60',
        heightClass,
      )}
      title="Select variant"
    >
      {variants.map((v) => (
        <option key={v.id} value={v.id}>
          {v.sku_code}
          {v.condition ? ` · ${CONDITION_DISPLAY[v.condition] ?? v.condition}` : ''}
        </option>
      ))}
    </select>
  )
}

// ── CellPartSearch ───────────────────────────────────────────────────────────

export interface CellPartSearchProps {
  selectedPartId?: string
  displayValue?: string
  onPick: (part: PickedPart) => void
  onClear: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  categoryId?: string
  oemId?: string
  condition?: string
}

export function CellPartSearch({
  selectedPartId,
  displayValue,
  onPick,
  onClear,
  disabled,
  size = 'sm',
  categoryId,
  oemId,
  condition,
}: CellPartSearchProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  // False until the user types: a focused cell shows the selected part
  // (selected, so typing replaces it) instead of an empty search box.
  const [touched, setTouched] = useState(false)
  // Tracked separately from `open` because the dropdown closes on pick/clear
  // while the input keeps focus (option/clear buttons preventDefault on
  // mousedown). Without this, `shown` would snap back to displayValue the
  // moment the dropdown closed and swallow any further typing — the user has
  // to blur the input, come back, and start over.
  const [focused, setFocused] = useState(false)
  // Where the portalled menu sits, in viewport coordinates. Re-measured on
  // every scroll (any ancestor — the grid's own horizontal scroller included)
  // and resize while open, so the menu stays glued to its input instead of
  // being left behind at the position it opened at. Flips above the input
  // when there isn't room below (rows near the bottom of the viewport).
  const [dropRect, setDropRect] = useState<DropPlacement>({ left: 0, top: 0, minWidth: 240, maxHeight: MENU_LIST_MAX })
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(inputValue.trim(), UI.DEBOUNCE_SEARCH_MS)

  const query = useVariantsListInfinite(debouncedSearch, {
    enabled: open,
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(oemId ? { oem_id: oemId } : {}),
    ...(condition ? { condition: condition as 'new' | 'refurbished' | 'new_pull' } : {}),
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data?.pages],
  )

  function measure() {
    const el = inputRef.current
    if (!el) return
    setDropRect(placeMenu(el.getBoundingClientRect()))
  }

  function openDropdown() {
    measure()
    setInputValue('')
    setTouched(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onMove = () => measure()
    // Capture phase so scrolls inside any scroll container (not just the
    // window) are seen — the editable grid scrolls horizontally on its own.
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function closeDropdown() {
    setOpen(false)
    setInputValue('')
    setTouched(false)
  }

  function pick(row: VariantListItem) {
    onPick(toPickedPart(row))
    closeDropdown()
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) void query.fetchNextPage()
  }

  // Show whatever identifies the row — a catalog pick OR a freeform part
  // number (pasted / unmatched). Previously gated on `selectedPartId`, which
  // blanked the cell for every pasted row the catalog didn't recognise.
  const hasValue = Boolean(selectedPartId) || Boolean(displayValue)
  // Show the search text whenever the input is engaged (focused OR dropdown
  // open — the two can diverge after a pick/clear). Only fall back to the
  // selected displayValue when the user has stepped away.
  const shown = (focused || open) && touched ? inputValue : (hasValue ? (displayValue ?? '') : '')
  // The row's Category / OEM / Condition narrow the catalog search. When they
  // exclude everything the list is empty even with no search term, so the
  // empty state has to say "nothing for these filters", not "type to search".
  const hasFilters = Boolean(categoryId || oemId || condition)

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={shown}
        placeholder={CRM_SHARED_STRINGS.partLineFields.searchPlaceholder}
        maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
        disabled={disabled}
        onChange={(e) => {
          setInputValue(touched ? e.target.value : typedDelta(shown, e.target.value))
          setTouched(true)
          // Typing must always surface the dropdown. onFocus alone misses the
          // case where the input kept focus through a pick / inline-clear:
          // focus never changes, so onFocus doesn't fire a second time, and
          // without this the search would run disabled and `shown` would stay
          // pinned to displayValue — swallowing every keystroke visually.
          if (!open) {
            measure()
            setOpen(true)
          }
        }}
        onFocus={(e) => {
          setFocused(true)
          openDropdown()
          e.currentTarget.select()
        }}
        onBlur={() => {
          setFocused(false)
          closeDropdown()
        }}
        // A click on a cell that already has focus (a pick / clear keeps focus
        // in the input) fires no focus event, so reopen from the click itself.
        onClick={(e) => {
          if (!open) openDropdown()
          // Mouse-up after the focus-select collapses the selection; restore
          // it so the first keystroke replaces the shown value.
          if (!touched) e.currentTarget.select()
        }}
        data-open={open || undefined}
        className={cn(
          'cell-input font-mono',
          size === 'sm' && 'compact',
          hasValue && !open && 'pr-6!',
        )}
      />
      {hasValue && !disabled && !open && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClear()
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
          aria-label={CRM_SHARED_STRINGS.partLineFields.clearPart}
        >
          <X className="size-3" />
        </button>
      )}
      {open && createPortal(
        <div
          style={{
            position: 'fixed' as const,
            zIndex: 9999,
            left: dropRect.left,
            top: dropRect.top,
            bottom: dropRect.bottom,
            minWidth: dropRect.minWidth,
          }}
          className="cpt-cell-menu rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {query.isLoading && items.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <Typography variant="helper">{CRM_SHARED_STRINGS.partLineFields.searchLoading}</Typography>
            </div>
          ) : query.isError ? (
            // The search is sent exactly as typed. When the API rejects it
            // (e.g. 422 "search: String should have at least 2 characters")
            // the backend's own message is shown; 403 routes to NoAccess.
            <LoadErrorState error={query.error} fallback={CRM_SHARED_STRINGS.partLineFields.searchLoadError} compact />
          ) : items.length === 0 ? (
            <div className="space-y-1 px-3 py-4 text-center">
              <Typography variant="helper">
                {debouncedSearch
                  ? CRM_SHARED_STRINGS.partLineFields.searchNoMatch(debouncedSearch)
                  : !query.data
                    ? CRM_SHARED_STRINGS.partLineFields.searchTypeToSearch
                    : hasFilters
                      ? CRM_SHARED_STRINGS.partLineFields.searchNoneForFilters
                      : CRM_SHARED_STRINGS.partLineFields.searchNoneInCatalog}
              </Typography>
              {query.data && (
                <Typography variant="helper" tone="muted">
                  {!debouncedSearch && hasFilters
                    ? CRM_SHARED_STRINGS.partLineFields.searchNoneForFiltersHint
                    : CRM_SHARED_STRINGS.partLineFields.searchNoMatchHint}
                </Typography>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto p-1" style={{ maxHeight: dropRect.maxHeight }} onScroll={handleScroll}>
              {items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                  className={cn(
                    'flex w-full flex-col rounded-sm px-2 py-1.5 text-left hover:bg-accent',
                    selectedPartId === row.id && 'bg-accent',
                  )}
                >
                  <span className="flex w-full min-w-0 items-center gap-3">
                    <Typography variant="mono" className="shrink-0">
                      {variantSkuLabel(row)}
                      {row.condition ? ` · ${row.condition}` : ''}
                    </Typography>
                    <Typography variant="helper" truncate className="min-w-0 flex-1">
                      {variantNameLabel(row)}
                    </Typography>
                  </span>
                  <CellOptionDescription text={partOptionDescription(row)} />
                </button>
              ))}
              {query.hasNextPage && (
                <div className="px-2 py-1.5 text-center">
                  <Typography variant="helper">
                    {query.isFetchingNextPage ? CRM_SHARED_STRINGS.partLineFields.searchLoadingMore : CRM_SHARED_STRINGS.partLineFields.searchScrollForMore}
                  </Typography>
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

export { PartLineFields, PartCombobox }

/** Muted one-line description under a cell-search option (full text on hover). */
function CellOptionDescription({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <Typography variant="caption" tone="muted" truncate asChild>
      <span className="w-full" title={text}>
        {text}
      </span>
    </Typography>
  )
}
