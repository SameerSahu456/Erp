import { Plus, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryOptionsCombobox } from "@/modules/ims/components/categories/CategoryOptionsCombobox"
import { OEMOptionsCombobox } from "@/modules/ims/components/oems/OEMOptionsCombobox"

import { SO_LINE_CONDITIONS } from "../../api"
import type { SOLineCondition } from "../../api"
import { SO_LINE_CONDITION_LABELS } from "../../constants/so-status"
import { TAXES } from "../../constants/taxes"
import { PartCombobox } from "../shared/PartLineFields"
import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import type { BomChildRow } from "./types"
import {
  applyDiscountInput,
  applyQtyInput,
  applyRateInput,
  applyTaxInput,
  bomChildCategoryError,
  bomChildConditionError,
  bomChildOemError,
  bomChildDiscountError,
  bomChildIdentityError,
  bomChildRateError,
  commitDiscount,
  commitQty,
  commitRate,
  commitTax,
  createEmptyBomChild,
  fmtLineAmount,
} from "./lineItemMappers"

/** Per-child computed money from the live /calculate response.
 *  Parallel to the headline's money fields — keyed by the child's position
 *  in the `bomChildren` array so the editor can show the amount in the
 *  right row without hand-rolling FE math. The Amount column renders
 *  `gross_amount` (qty × rate, before discount & tax). */
export interface BomChildAmount {
  gross_amount: number
  amount: number
  tax_amount: number
}

const DEFAULT_MAX = 20

// Common BOM "child component" editor — the expand panel under a headline
// line. Shared by Sales Quote, Sales Order and Closed Won via
// `LineItemRow` (or directly via `LineItemBomSection`). Each row persists
// as a `config_action='Add'` backend child.
//
// Each component renders as a flex row mirroring the parent line-item row
// (per-field labels, flexing Part/Description, fixed numeric cells, and a
// CONTENT-SIZED amount — `w-auto min/max` like the headline, so a short
// ₹0.00 doesn't reserve a dead fixed column between Tax and the total):
// Part Number / Description / Qty / Rate / Disc ₹ / Tax % / [Amount] / ×,
// with Category (plus Brand/OEM + Condition when `showOemCondition`) on a
// classification line under each component row — mirrors the headline row's
// classification-row pattern:
//   - Catalog row → category + rate come from the picked variant (set by
//     `onPick` on the row); the picker is locked while a part is linked.
//   - Freeform row → user-selectable; when left empty it falls back to
//     the parent line's category via the save/calc mappers in each form
//     (`bomChildrenToCreatePayload`, each form's calc-payload builder).
//
// Seeding the first empty row is the *section's* responsibility (it
// happens when the user clicks "+ Add BOM"). The editor itself never
// auto-pads — toggling collapse/expand would otherwise re-seed after
// every Clear.
export function LineItemBomEditor({
  value,
  onChange,
  viewLocked = false,
  max = DEFAULT_MAX,
  childAmounts,
  showOemCondition = false,
  oemConditionRequired = false,
}: {
  value: BomChildRow[]
  onChange: (rows: BomChildRow[]) => void
  viewLocked?: boolean
  max?: number
  /** Render the Brand/OEM + Condition pickers on the classification line.
   *  **Sales Order / Closed Won only**, mirroring
   *  `BomChildPayloadOptions.withOemCondition` on the save mapper:
   *  `QuoteBomChildCreate` declares neither field and is `extra="forbid"`, so
   *  the quote path drops both at save. Showing them there offered edits that
   *  were silently discarded. Defaults to false so a new caller has to opt in
   *  deliberately — same default, and same reason, as the mapper's. */
  showOemCondition?: boolean
  /** Brand/OEM + Condition are mandatory on a freeform component (asterisk +
   *  inline error). Sales Order surfaces only; the caller blocks save. */
  oemConditionRequired?: boolean
  /** Live computed money per child, in the same order as `value`.
   *  When supplied, the editor renders an Amount column matching the
   *  parent line's display (amount + tax). Slots can be `undefined` —
   *  rows whose calc result isn't in yet, or that the calc payload
   *  filtered out (qty<=0) — and render as "—" without dragging the
   *  rest of the column out of alignment. Omit the whole prop to hide
   *  the column. */
  childAmounts?: Array<BomChildAmount | undefined>
}) {
  function patchChild(id: string, updates: Partial<BomChildRow>) {
    onChange(value.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  function addChild() {
    if (value.length >= max) return
    onChange([...value, createEmptyBomChild()])
  }

  function removeChild(id: string) {
    onChange(value.filter((c) => c.id !== id))
  }

  function clearAll() {
    onChange([])
  }

  const childCount = value.length

  return (
    <div className="space-y-3 rounded-md border bg-muted/10 p-3">
      {/* Assembly subheader — visual badge + per-row Clear control.
          (Load template dropdown is deferred until the BOM-template
          API for Quote / SO ships; see BOM_EDITOR_REDESIGN.md.) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {LINE_ITEMS_STRINGS.bom.assembly}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {LINE_ITEMS_STRINGS.bom.componentCount(childCount)}
        </span>
        {!viewLocked && childCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearAll}
            aria-label={LINE_ITEMS_STRINGS.bom.clearAllAria}
          >
            <Trash2 className="mr-1 size-3" />
            {LINE_ITEMS_STRINGS.bom.clear}
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        {value.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            {LINE_ITEMS_STRINGS.bom.empty}
          </div>
        ) : (
          /* One block per component (inputs row + Category line), separated
             by `divide-y` — the divider falls BETWEEN components, never
             between a row and its own Category line. */
          <div className="divide-y">
            {value.map((c, ci) => {
              const discErr = bomChildDiscountError(c)
              const rateErr = bomChildRateError(c)
              const identityErr = bomChildIdentityError(c)
              const catErr = bomChildCategoryError(c)
              const oemErr = oemConditionRequired ? bomChildOemError(c) : null
              const condErr = oemConditionRequired ? bomChildConditionError(c) : null
              return (
                <div key={c.id} className="space-y-2 p-2">
                  {/* Inputs row — mirrors the parent line-item row: labelled
                      flexing Part/Description, fixed-width numeric cells, and
                      a content-sized amount at the right end. */}
                  <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-[1]">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.partNumber}
                    </label>
                    <PartCombobox
                      searchBy="sku"
                      stableLabel
                      size="sm"
                      selectedPartId={c.partId}
                      displayValue={(c.partId ? c.itemName : undefined) ?? c.partSku}
                      disabled={viewLocked}
                      categoryId={c.categoryId}
                      oemId={c.oemId}
                      condition={c.condition}
                      onPick={(part) => {
                        // Catalog autofill is the silent path that keeps
                        // category / rate populated on the row even though
                        // we no longer render those inputs. Reset the
                        // per-child discount when the part actually
                        // changes — it was tied to the previous part's
                        // price and shouldn't carry over. Re-picking
                        // the same part is a no-op.
                        const partChanged = part.id !== c.partId
                        patchChild(c.id, {
                          partId: part.id,
                          partSku: part.sku,
                          itemName: part.name,
                          categoryId: part.categoryId,
                          category: part.categoryName,
                          // Snapshot the variant's OEM + condition, same as the
                          // parent row. Must echo the variant exactly — the
                          // service 400s a catalog child that disagrees.
                          oemId: part.oemId || undefined,
                          condition: part.condition || undefined,
                          rate: part.sellPrice ?? c.rate,
                          listPrice: part.sellPrice ?? c.listPrice,
                          // Auto-fill Tax % from the variant's HSN GST rate
                          // when the API resolves one; clear the draft input
                          // so the new value renders. When the part actually
                          // changes but the new variant has no HSN mapping,
                          // fall back to the 18% default — the previous
                          // part's rate must not carry over. Re-picking the
                          // SAME part leaves a user-typed tax untouched.
                          ...(part.hsnGstRate != null
                            ? { taxRate: part.hsnGstRate, taxRateInput: undefined }
                            : partChanged
                              ? { taxRate: TAXES.DEFAULT_TAX_RATE, taxRateInput: undefined }
                              : {}),
                          description: c.description || part.description,
                          // undefined (not "") so the field shows "0" after
                          // the reset instead of going blank.
                          ...(partChanged
                            ? { discountAmount: 0, discountAmountInput: undefined }
                            : {}),
                        })
                      }}
                      onClear={() =>
                        // Explicit clear → drop the part-derived name and the
                        // per-child discount, and reset the tax to the 18%
                        // default; all three were tied to the now-removed part
                        // and must not linger on the empty row.
                        patchChild(c.id, {
                          partId: undefined,
                          partSku: undefined,
                          itemName: "",
                          categoryId: undefined,
                          category: undefined,
                          oemId: undefined,
                          condition: undefined,
                          discountAmount: 0,
                          // undefined (not "") — blank draft would mask the 0.
                          discountAmountInput: undefined,
                          taxRate: TAXES.DEFAULT_TAX_RATE,
                          taxRateInput: undefined,
                        })
                      }
                    />
                    {identityErr && (
                      <p className="mt-1.5 text-[11px] font-medium leading-tight text-destructive">
                        {identityErr}
                      </p>
                    )}
                  </div>
                  {/* Part Name — mirrors the parent row's Name field. */}
                  <div className="min-w-0 flex-[0.8]">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.name}
                    </label>
                    <Input
                      value={c.itemName ?? ""}
                      disabled={viewLocked}
                      placeholder={LINE_ITEMS_STRINGS.row.placeholders.itemName}
                      className="h-8 text-xs"
                      onChange={(e) => patchChild(c.id, { itemName: e.target.value })}
                    />
                  </div>
                  {/* Description — largest grow factor, mirroring the parent
                      row: viewport slack widens Description first. */}
                  <div className="min-w-0 flex-[2]">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.description}
                    </label>
                    <RichTextEditor
                      value={c.description ?? ""}
                      onChange={(html) => patchChild(c.id, { description: html })}
                      disabled={viewLocked}
                    />
                  </div>
                  {/* Qty — ~4 digits, mirrors the parent row's width. */}
                  <div className="w-14 shrink-0">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.qty}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 w-full text-left text-xs"
                      value={c.qtyInput ?? String(c.qty)}
                      disabled={viewLocked}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const patch = applyQtyInput(e.target.value)
                        if (patch) patchChild(c.id, patch)
                      }}
                      onBlur={(e) => patchChild(c.id, commitQty(e.target.value))}
                    />
                  </div>
                  {/* Rate — ~7 digits. One notch narrower than the parent
                      row (80px vs 88px): the BOM inputs render text-xs, so
                      the same digit count needs less width. */}
                  <div className="w-20 shrink-0">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.rate}
                    </label>
                    {/* input + error anchored to the input row (not the tall
                        Description-driven row) — same pattern as Disc below. */}
                    <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-full text-left text-xs"
                      value={c.rateInput ?? String(c.rate)}
                      disabled={viewLocked}
                      aria-invalid={Boolean(rateErr)}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const patch = applyRateInput(e.target.value)
                        if (patch) patchChild(c.id, patch)
                      }}
                      onBlur={(e) => patchChild(c.id, commitRate(e.target.value))}
                    />
                    {rateErr && (
                      <p className="absolute left-0 top-full z-10 mt-1.5 w-40 text-[11px] font-medium leading-tight text-destructive">
                        {rateErr}
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="w-20 shrink-0">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.disc} &#8377;
                    </label>
                    {/* Wrap input + error in an input-height relative box so
                        the message anchors right under the Disc input — not at
                        the bottom of the (tall, Description-driven) row. */}
                    <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-full text-left text-xs"
                      value={c.discountAmountInput ?? String(c.discountAmount)}
                      disabled={viewLocked}
                      aria-invalid={Boolean(discErr)}
                      aria-label={LINE_ITEMS_STRINGS.bom.componentDiscountAria}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const patch = applyDiscountInput(e.target.value)
                        if (patch) patchChild(c.id, patch)
                      }}
                      onBlur={(e) =>
                        patchChild(c.id, commitDiscount(e.target.value))
                      }
                    />
                    {discErr && (
                      <p className="absolute left-0 top-full z-10 mt-1.5 w-40 text-[11px] font-medium leading-tight text-destructive">
                        {discErr}
                      </p>
                    )}
                    </div>
                  </div>
                  {/* Tax % caps at 100 — narrower than the other numeric
                      cells. Same w-12 as the parent's Tax input: without the
                      old table-cell padding the full 48px belongs to the
                      input, so "100" renders unclipped exactly like the
                      parent. */}
                  <div className="w-12 shrink-0">
                    <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                      {LINE_ITEMS_STRINGS.bom.columns.tax}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-full text-left text-xs"
                      value={c.taxRateInput ?? String(c.taxRate)}
                      disabled={viewLocked}
                      aria-label={LINE_ITEMS_STRINGS.bom.componentTaxAria}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const patch = applyTaxInput(e.target.value)
                        if (patch) patchChild(c.id, patch)
                      }}
                      onBlur={(e) => patchChild(c.id, commitTax(e.target.value))}
                    />
                  </div>
                  {childAmounts && (
                    /* Content-sized amount — `w-auto` + min/max caps, exactly
                       like the parent row's total: a short ₹0.00 hugs the
                       inputs instead of reserving a dead fixed-width column
                       between Tax and the total, and a long figure wraps
                       within `max-w` ([overflow-wrap:anywhere]) instead of
                       widening the row. `mt-6` drops it onto the input
                       baseline, under the label line. */
                    <div className="mt-6 w-auto min-w-[64px] max-w-[140px] shrink-0 text-right text-xs font-medium tabular-nums [overflow-wrap:anywhere]">
                      {(() => {
                        const a = childAmounts[ci]
                        if (!a)
                          return (
                            <span className="text-muted-foreground">—</span>
                          )
                        return (
                          <span title={`₹${fmtLineAmount(a.gross_amount)}`}>
                            &#8377;{fmtLineAmount(a.gross_amount)}
                          </span>
                        )
                      })()}
                    </div>
                  )}
                  <div className="mt-5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeChild(c.id)}
                      disabled={viewLocked}
                      aria-label={LINE_ITEMS_STRINGS.bom.removeComponentAria}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  </div>
                  {/* Classification line under the inputs row, mirroring the
                      headline row: Category always, plus Brand/OEM +
                      Condition on the SO / Closed Won surfaces
                      (`showOemCondition`). All three auto-fill + lock when a
                      part is linked and are user-editable on a freeform row.
                      The display label (`category`) is part-derived only — a
                      manual pick clears it and the combobox resolves the name
                      for display itself; the mappers send just the id (with
                      the parent-category fallback when empty). Each cell
                      carries `min-w-0` so its picker truncates instead of
                      widening the row (§8.7). */}
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 w-full flex-1 sm:w-56 sm:max-w-[260px]">
                      <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                        {LINE_ITEMS_STRINGS.row.fields.category}{" "}
                        {/* Mandatory, same as the parent line — the * shows on
                            freeform rows; a linked part supplies the category. */}
                        {!c.partId && <span className="text-destructive">*</span>}
                      </label>
                      <CategoryOptionsCombobox
                        value={c.categoryId ?? null}
                        onValueChange={(id) =>
                          patchChild(c.id, {
                            categoryId: id ?? undefined,
                            category: undefined,
                          })
                        }
                        disabled={viewLocked || !!c.partId}
                        placeholder={
                          c.partId
                            ? LINE_ITEMS_STRINGS.row.placeholders.categoryFromPart
                            : LINE_ITEMS_STRINGS.row.placeholders.categorySelect
                        }
                        triggerClassName={cn(
                          "h-8 text-xs",
                          catErr && "border-destructive",
                        )}
                      />
                      {catErr && (
                        <p className="mt-1.5 text-[11px] font-medium leading-tight text-destructive">
                          {catErr}
                        </p>
                      )}
                    </div>

                    {showOemCondition && (
                      <>
                        <div className="min-w-0 w-full flex-1 sm:w-56 sm:max-w-[260px]">
                          <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                            {LINE_ITEMS_STRINGS.bom.columns.oem}{" "}
                            {oemConditionRequired && !c.partId && (
                              <span className="text-destructive">*</span>
                            )}
                          </label>
                          <OEMOptionsCombobox
                            value={c.oemId || null}
                            onValueChange={(id) =>
                              patchChild(c.id, { oemId: id ?? undefined })
                            }
                            disabled={viewLocked || !!c.partId}
                            placeholder={
                              c.partId
                                ? LINE_ITEMS_STRINGS.bom.fromPart
                                : LINE_ITEMS_STRINGS.bom.oemPlaceholder
                            }
                            triggerClassName={cn(
                              "h-8 text-xs",
                              oemErr && "border-destructive",
                            )}
                          />
                          {oemErr && (
                            <p className="mt-1.5 text-[11px] font-medium leading-tight text-destructive">
                              {oemErr}
                            </p>
                          )}
                        </div>
                        <div className="min-w-0 w-full flex-1 sm:w-44 sm:max-w-[200px]">
                          <label className="mb-1 block text-[10.5px] font-medium tracking-wide text-muted-foreground">
                            {LINE_ITEMS_STRINGS.bom.columns.condition}{" "}
                            {oemConditionRequired && !c.partId && (
                              <span className="text-destructive">*</span>
                            )}
                          </label>
                          <Select
                            value={c.condition ?? ""}
                            disabled={viewLocked || !!c.partId}
                            onValueChange={(v) =>
                              patchChild(c.id, { condition: v || undefined })
                            }
                          >
                            {/* `size="sm"` (h-8) rather than a bare `h-8` class:
                                the trigger's height comes from a data-attribute
                                variant that outranks a plain class. h-8 matches
                                the child row's OEM picker. */}
                            {/* `clearable` must be passed explicitly:
                                SelectTrigger hides its clear-× via
                                `!props.disabled`, but our `disabled` sits on the
                                Select ROOT, so the trigger never sees it and a
                                locked row would still offer a × (while the
                                locked OEM picker shows a chevron). */}
                            <SelectTrigger
                              size="sm"
                              clearable={!(viewLocked || !!c.partId)}
                              className={cn(
                                "w-full text-xs",
                                condErr && "border-destructive",
                              )}
                            >
                              {/* Label map, not the raw wire value (`new_pull`). */}
                              <SelectValue
                                placeholder={
                                  c.partId
                                    ? LINE_ITEMS_STRINGS.bom.fromPart
                                    : LINE_ITEMS_STRINGS.bom.conditionPlaceholder
                                }
                              >
                                {c.condition
                                  ? SO_LINE_CONDITION_LABELS[
                                      c.condition as SOLineCondition
                                    ]
                                  : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {SO_LINE_CONDITIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {SO_LINE_CONDITION_LABELS[opt]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {condErr && (
                            <p className="mt-1.5 text-[11px] font-medium leading-tight text-destructive">
                              {condErr}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!viewLocked && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addChild}
          disabled={value.length >= max}
        >
          <Plus className="mr-1 size-3" />
          {LINE_ITEMS_STRINGS.bom.addComponent}
        </Button>
      )}
    </div>
  )
}
