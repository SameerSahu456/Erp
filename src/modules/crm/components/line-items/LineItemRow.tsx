import type { ReactNode } from "react"

import { Tag, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { FieldError } from "@/components/common/forms/FieldError"
import { CategoryOptionsCombobox } from "@/modules/ims/components/categories/CategoryOptionsCombobox"
import { OEMOptionsCombobox } from "@/modules/ims/components/oems/OEMOptionsCombobox"

import { LINE_ITEM_LIMITS } from "../../constants/line-items"
import { TAXES } from "../../constants/taxes"
import { SO_LINE_CONDITIONS } from "../../api"
import type { SOLineCondition } from "../../api"
import { SO_LINE_CONDITION_LABELS } from "../../constants/so-status"
import { PartCombobox, type PickedPart } from "../shared/PartLineFields"
import { LINE_ITEMS_STRINGS } from "./line-items.strings"
import { LineItemBomSection } from "./LineItemBomSection"
import type { BomChildAmount } from "./LineItemBomEditor"
import type { BuilderLineItem, LineRowErrors } from "./types"
import {
  applyDiscountInput,
  applyQtyInput,
  applyRateInput,
  applyTaxInput,
  commitDiscount,
  commitQty,
  commitRate,
  commitTax,
  fmtLineAmount as fmt,
} from "./lineItemMappers"

// Builds the row patch when a part is picked / cleared in the Part Number
// combobox. Mirrors the Quote builder's applyLineItemPartChange (minus mock
// BOM) so behaviour is identical across all three surfaces. Consumers whose
// controller owns extra autofill logic override via `onPickPart`.
function partPatch(
  line: BuilderLineItem,
  picked: PickedPart | null,
): Partial<BuilderLineItem> {
  if (picked) {
    // Reset any line-level discount when the part actually changes —
    // the previous discount was tied to a different part's price and
    // shouldn't carry over. Re-picking the same part is a no-op.
    const partChanged = picked.id !== line.partId
    return {
      type: "ims_part",
      partId: picked.id,
      partSku: picked.sku,
      partName: picked.name,
      itemName: picked.name,
      categoryId: picked.categoryId,
      category: picked.categoryName,
      brand: picked.brand,
      variantType: picked.condition,
      // Snapshot the variant's OEM + condition, same as Category above. These
      // must echo the variant exactly — the SO service 400s a catalog row
      // whose oem_id/condition disagrees with its part.
      oemId: picked.oemId || undefined,
      condition: picked.condition || undefined,
      rate: picked.sellPrice ?? line.rate,
      // Show the variant's HSN GST rate as the Tax % when the API resolves
      // one; clear the draft input so the new value is what renders. When the
      // part actually changes but the new variant has no HSN mapping, fall
      // back to the 18% default — the previous part's rate must not carry
      // over. Re-picking the SAME part leaves a user-typed tax untouched.
      ...(picked.hsnGstRate != null
        ? { taxRate: picked.hsnGstRate, taxRateInput: undefined }
        : partChanged
          ? { taxRate: TAXES.DEFAULT_TAX_RATE, taxRateInput: undefined }
          : {}),
      description: line.description?.trim() ? line.description : picked.description,
      // Reset → draft cleared to undefined (NOT ""): the input renders
      // `discountAmountInput ?? String(discountAmount)`, and an ""-draft
      // would win over the fallback and show a blank instead of 0.
      ...(partChanged ? { discountAmount: 0, discountAmountInput: undefined } : {}),
    }
  }
  // Explicit clear → drop the discount and reset the tax to the 18%
  // default; both were tied to the now-removed part and no longer map to
  // anything. OEM + condition were the part's snapshot — clear them too
  // (mirrors the BOM child editor's clear).
  return {
    type: "description",
    partId: undefined,
    partSku: undefined,
    brand: undefined,
    variantType: undefined,
    category: undefined,
    oemId: undefined,
    condition: undefined,
    discountAmount: 0,
    // undefined (not "") so the field falls back to showing "0" — see the
    // matching note on the pick branch above.
    discountAmountInput: undefined,
    taxRate: TAXES.DEFAULT_TAX_RATE,
    taxRateInput: undefined,
  }
}

// Stacked parent line-item row — rendered by the Closed-Won wizard
// (ClosedWonArtifactStep). Quotes and Sales Orders use the tabular
// LineItemsSection / LineItemsGrid instead. Fully controlled via `onPatch`;
// the consumer adapts its local line shape to `BuilderLineItem` (see the
// soLineToBuilder adapter) and passes surface-specific
// chrome through `belowContent`.
//
// Layout: main row (# / Part Number / Name / Description[flex-2] / Qty /
// Rate / Disc ₹ / Tax % / content-sized amount) with Category — plus
// Brand/OEM + Condition on the surfaces that persist them — on its own
// classification row below, then the collected error block, variant badge,
// from-part hint, `belowContent`, and the shared BOM section.
export function LineItemRow({
  line,
  index,
  amount,
  errors,
  viewLocked = false,
  qtyOnly = false,
  qtyMax,
  canRemove = true,
  showBom = true,
  nameRequired = true,
  showOemCondition = false,
  oemConditionRequired = false,
  bomChildAmounts,
  belowContent,
  rateLabel,
  rightActions,
  onPatch,
  onRemove,
  onPickPart,
  onClearError,
}: {
  line: BuilderLineItem
  index: number
  /** Line total (gross). `null` renders an em-dash — the SO form shows "—"
   *  until the server calc resolves. */
  amount: number | null
  errors?: LineRowErrors
  viewLocked?: boolean
  /** Quote-driven SO mode: every control except Qty is disabled. */
  qtyOnly?: boolean
  /** Upper bound applied to Qty on commit (SO quote-driven rows cap at the
   *  quoted amount). No cap when undefined. */
  qtyMax?: number
  canRemove?: boolean
  showBom?: boolean
  /** Show the "*" required marker on the Name label. Quotes / Sales Orders
   *  keep it required (default); the Closed-Won wizard passes `false` since
   *  a nameless row is allowed there and saves item_name "-". */
  nameRequired?: boolean
  /** Render the line's Brand/OEM + Condition pickers on the classification
   *  row, and thread the same flag to the BOM section for its children.
   *  **Sales Order / Closed Won only** — the quote payload declares neither
   *  field (`extra="forbid"` on the wire schema), so offering them on a quote
   *  would silently discard the edit. Off by default: a new caller opts in
   *  deliberately, matching `BomChildPayloadOptions.withOemCondition` on the
   *  save mapper. Quotes keep the part-derived variant badge instead. */
  showOemCondition?: boolean
  /** Marks Brand/OEM + Condition as mandatory (asterisk) on a FREEFORM row.
   *  A catalog row fills both from the picked part and locks them, so it is
   *  never marked — same rule as Category. Also keeps both pickers editable
   *  on a freeform row in `qtyOnly` mode. Validation stays with the caller. */
  oemConditionRequired?: boolean
  /** Per-BOM-child computed money — same order as `line.bomChildren`.
   *  Forwarded straight to `LineItemBomSection` → `LineItemBomEditor`
   *  so the per-component Amount column matches what the parent line
   *  shows. Slots may be `undefined` for rows skipped by the calc
   *  payload (qty<=0). */
  bomChildAmounts?: Array<BomChildAmount | undefined>
  /** Surface-specific content rendered between the error block and the BOM
   *  section — SO passes its qty-cap note and rental notice here. */
  belowContent?: ReactNode
  /** Overrides the "Rate" column label. A rental line is priced per
   *  PERIOD, per unit — "Monthly rate" rather than a bare rate — and the
   *  header is the only place that distinction is visible while typing. */
  rateLabel?: string
  /** Surface-specific actions rendered in the top-right corner, to the
   *  LEFT of the delete button. Consumers (e.g. the quote detail view
   *  in viewOnly mode) use this slot to add per-line Approve / Reject
   *  buttons that mutate quote-item state the base row doesn't know
   *  about. Rendered inline — flex children should carry their own
   *  spacing. */
  rightActions?: ReactNode
  onPatch: (updates: Partial<BuilderLineItem>) => void
  onRemove: () => void
  /** Override the internal part-pick/clear patch when the consumer's
   *  controller owns the autofill logic (Quote builder, SO form). Called
   *  with the picked part, or `null` on clear. When omitted the row applies
   *  the shared `partPatch` via `onPatch`. */
  onPickPart?: (picked: PickedPart | null) => void
  onClearError?: (field: keyof LineRowErrors) => void
}) {
  // Effective disabled state for "everything except qty" (SO's quote-driven
  // mode). `viewLocked` disables all controls including Qty.
  const lockNonQty = viewLocked || qtyOnly
  // Brand/OEM + Condition on a freeform row: when they are mandatory they
  // stay editable in qtyOnly mode too — a quote line carries neither, so the
  // user has to be able to fill them. A catalog row keeps them part-locked.
  const lockOemCondition =
    (oemConditionRequired ? viewLocked : lockNonQty) || !!line.partId

  // Any populated field error → flip the card border red so a user can
  // spot the broken row at a glance instead of hunting the collected
  // block below.
  const hasError = Boolean(
    errors &&
      Object.values(errors).some(
        (v) =>
          (typeof v === "string" && v.length > 0) ||
          (Array.isArray(v) && v.length > 0),
      ),
  )

  // Every field error renders directly UNDER its own input (the rows are
  // `items-start`, so a message only lengthens its own cell and the inputs
  // stay on one baseline). Only the surface-specific `extra` messages — which
  // belong to no single input (e.g. BOM component errors) — are collected
  // into the block below the row.
  const collectedErrors = (errors?.extra ?? []).filter((m): m is string => Boolean(m))

  function handlePick(picked: PickedPart | null) {
    if (onPickPart) onPickPart(picked)
    else onPatch(partPatch(line, picked))
    onClearError?.("identity")
  }

  return (
    <div
      className={cn(
        "relative space-y-2 rounded-lg border bg-card p-3 pt-10 pr-2.5",
        hasError && "border-destructive ring-1 ring-destructive/40",
      )}
    >
      {/* Floating actions — anchored to the card's top-right corner via a
          position-only wrapper div. The card's `pt-10` (40px) clears the
          row vertically (button bottom ≈ 36px), so the right padding can
          stay tight (10px) without the amount colliding with the buttons.
          ``rightActions`` renders to the LEFT of the delete button for
          surface-specific controls (e.g. Approve / Reject on the quote
          detail view in viewOnly mode).

          Delete button is HIDDEN (not just disabled) when the row is
          ``viewLocked`` — a disabled trash on a read-only quote /
          Sent SO just adds visual clutter without any action attached.
          ``canRemove=false`` still renders a disabled trash because
          that's "you have one row left, delete would leave the quote
          empty" — the affordance should stay visible so the user
          understands why they can't click it. */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {rightActions}
        {!viewLocked && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={LINE_ITEMS_STRINGS.row.removeLineAria}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex items-start gap-3">
        {/* Line number */}
        <div className="mt-6 flex size-7 shrink-0 items-center justify-center self-start rounded-full border bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </div>

        {/* Part Number */}
        <div className="min-w-[120px] flex-[1]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.partNumber}
          </label>
          <div title={line.partSku ?? line.partName ?? ""}>
            <PartCombobox
              searchBy="sku"
              stableLabel
              selectedPartId={line.partId}
              displayValue={line.partName ?? line.partSku}
              disabled={lockNonQty}
              onPick={(part) => handlePick(part)}
              onClear={() => handlePick(null)}
              categoryId={line.categoryId}
              oemId={line.oemId}
              condition={line.condition}
            />
          </div>
          <FieldError message={errors?.identity} />
        </div>

        {/* Name */}
        <div className="min-w-[120px] flex-[1]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.name}{" "}
            {nameRequired && <span className="text-destructive">*</span>}
          </label>
          <Input
            value={line.partName ?? ""}
            title={line.partName ?? ""}
            disabled={lockNonQty}
            maxLength={LINE_ITEM_LIMITS.MAX_ITEM_NAME_CHARS}
            onChange={(e) => {
              onPatch({ partName: e.target.value, itemName: e.target.value })
              onClearError?.("name")
            }}
            placeholder={LINE_ITEMS_STRINGS.row.placeholders.itemName}
            className="h-9"
            aria-invalid={Boolean(errors?.name)}
          />
          <FieldError message={errors?.name} />
        </div>

        {/* Description — largest grow factor on the row so viewport slack
            widens the longest-content field first. The 220px floor keeps it
            usable at narrow viewports without blowing the row wide (§8.7). */}
        <div className="min-w-[220px] flex-[2]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.description}
          </label>
          <RichTextEditor
            value={line.description ?? ""}
            disabled={lockNonQty}
            onChange={(html) => {
              onPatch({ description: html })
              onClearError?.("identity")
            }}
          />
        </div>

        {/* Qty — stays editable in qtyOnly mode (that's the mode's point).
            Sized for ~4 digits (56px = 24px input padding + 4 digits). */}
        <div className="relative min-w-0 max-w-14 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.qty}{" "}
            <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={line.qtyInput ?? String(line.qty)}
            title={line.qtyInput ?? String(line.qty)}
            disabled={viewLocked}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const patch = applyQtyInput(e.target.value)
              if (patch) onPatch(patch)
              onClearError?.("qty")
            }}
            onBlur={(e) => {
              const patch = commitQty(e.target.value)
              // Quote-driven SO rows never raise qty above the quoted amount.
              if (qtyMax != null && typeof patch.qty === "number") {
                patch.qty = Math.min(patch.qty, Math.max(1, qtyMax))
              }
              onPatch(patch)
            }}
            aria-invalid={Boolean(errors?.qty)}
            className="h-9"
          />
          {/* The Qty cell is ~4 digits wide, so its message is positioned like
              the Disc one (absolute, wider than the cell) rather than wrapped
              a word per line. */}
          <FieldError
            message={errors?.qty}
            className="absolute left-0 top-full z-10 w-40"
          />
        </div>

        {/* Rate — sized for ~7 digits + breathing room (88px = 24px input
            padding + 7 digits at ~9px each). */}
        <div className="min-w-0 max-w-22 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {rateLabel ?? LINE_ITEMS_STRINGS.row.fields.rate}{" "}
            <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={line.rateInput ?? String(line.rate)}
            title={line.rateInput ?? String(line.rate)}
            disabled={lockNonQty}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const patch = applyRateInput(e.target.value)
              if (patch) onPatch(patch)
              onClearError?.("rate")
            }}
            onBlur={(e) => onPatch(commitRate(e.target.value))}
            aria-invalid={Boolean(errors?.rate)}
            className="h-9"
          />
          <FieldError message={errors?.rate} />
        </div>

        {/* Disc ₹ — the discount error renders live directly under this
            input (absolute, so the row baseline never shifts). */}
        <div className="relative min-w-0 max-w-20 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.disc} &#8377;
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={line.discountAmountInput ?? String(line.discountAmount)}
            title={line.discountAmountInput ?? String(line.discountAmount)}
            disabled={lockNonQty}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const patch = applyDiscountInput(e.target.value)
              if (patch) onPatch(patch)
              onClearError?.("discount")
            }}
            onBlur={(e) => onPatch(commitDiscount(e.target.value))}
            aria-invalid={Boolean(errors?.discount)}
            aria-label={LINE_ITEMS_STRINGS.row.discountAria}
            className="h-9"
          />
          {errors?.discount && (
            <p className="absolute left-0 top-full z-10 mt-1 w-40 text-[11px] font-medium leading-tight text-destructive">
              {errors.discount}
            </p>
          )}
        </div>

        {/* Tax % caps at 100 — three digits — so it needs less width than
            the other numeric cells. */}
        <div className="min-w-0 max-w-12 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.tax}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={line.taxRateInput ?? String(line.taxRate)}
            title={line.taxRateInput ?? String(line.taxRate)}
            disabled={lockNonQty}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const patch = applyTaxInput(e.target.value)
              if (patch) onPatch(patch)
            }}
            onBlur={(e) => onPatch(commitTax(e.target.value))}
            aria-label={LINE_ITEMS_STRINGS.row.taxAria}
            className="h-9"
          />
        </div>

        {/* Amount — sized to its CONTENT (`shrink-0`, no fixed width), so
            ₹0.00 claims almost nothing and a long total claims more. The
            numeric inputs to the left are `flex-1` capped by `max-w-*`, so
            they pack tight against the figure with no dead gap and the
            amount sits at the row's right end. `max-w-44` is the ceiling:
            past it the value wraps rather than starving the inputs; the
            `title` keeps the full figure on hover. "—" until the server
            calc resolves (SO). */}
        <div
          className="mt-6 max-w-44 shrink-0 text-right text-sm font-semibold leading-tight tabular-nums [overflow-wrap:anywhere]"
          title={amount != null ? `₹${fmt(amount)}` : undefined}
        >
          {amount != null ? <>&#8377;{fmt(amount)}</> : "—"}
        </div>
      </div>

      {/* Classification row — Category (and Brand/OEM + Condition where the
          surface persists them) pulled out of the main input row onto its own
          line, so the main row keeps its width for Description; inline, these
          squeeze Description and blow the row out (§8.7). `pl-10` aligns it
          under the inputs, past the line-number badge. Each cell carries
          `min-w-0` so its picker truncates instead of widening the row. */}
      <div className="flex flex-wrap items-start gap-3 pl-10">
        <div className="min-w-0 w-full flex-1 sm:w-56 sm:max-w-[260px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {LINE_ITEMS_STRINGS.row.fields.category}{" "}
            {!line.partId && <span className="text-destructive">*</span>}
          </label>
          <CategoryOptionsCombobox
            value={line.categoryId ?? null}
            onValueChange={(id) => {
              onPatch({ categoryId: id ?? undefined })
              onClearError?.("category")
            }}
            disabled={lockNonQty || !!line.partId}
            placeholder={
              line.partId
                ? LINE_ITEMS_STRINGS.row.placeholders.categoryFromPart
                : LINE_ITEMS_STRINGS.row.placeholders.categorySelect
            }
            triggerClassName={cn("h-9", errors?.category && "border-destructive")}
          />
          <FieldError message={errors?.category} />
        </div>

        {showOemCondition && (
          <>
            {/* Brand/OEM — auto-filled from the picked variant's `oem_id` and
                locked, mirroring Category; editable by hand only on a
                freeform row. */}
            <div className="min-w-0 w-full flex-1 sm:w-56 sm:max-w-[260px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {LINE_ITEMS_STRINGS.row.fields.oem}{" "}
                {oemConditionRequired && !line.partId && (
                  <span className="text-destructive">*</span>
                )}
              </label>
              <OEMOptionsCombobox
                value={line.oemId ?? null}
                onValueChange={(id) => {
                  onPatch({ oemId: id ?? undefined })
                  onClearError?.("oem")
                }}
                disabled={lockOemCondition}
                placeholder={
                  line.partId
                    ? LINE_ITEMS_STRINGS.row.placeholders.oemFromPart
                    : LINE_ITEMS_STRINGS.row.placeholders.oemSelect
                }
                triggerClassName={cn("h-9", errors?.oem && "border-destructive")}
              />
              <FieldError message={errors?.oem} />
            </div>

            {/* Condition — auto-filled + locked like Category/OEM. Uses the
                variant's condition set, NOT the header order types: the SO
                service rejects a catalog row whose condition disagrees with
                its variant (SO_ITEM_CONDITION_MISMATCH). */}
            <div className="min-w-0 w-full flex-1 sm:w-44 sm:max-w-[200px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {LINE_ITEMS_STRINGS.row.fields.condition}{" "}
                {oemConditionRequired && !line.partId && (
                  <span className="text-destructive">*</span>
                )}
              </label>
              <Select
                value={line.condition ?? ""}
                disabled={lockOemCondition}
                onValueChange={(v) => {
                  onPatch({ condition: v || undefined })
                  onClearError?.("condition")
                }}
              >
                {/* `data-[size=default]:h-9`, not a bare `h-9`: SelectTrigger
                    sets its height via `data-[size=default]:h-10`, and that
                    data-attribute variant outranks a plain `h-9` on
                    specificity — so the Select would render 40px tall next to
                    the 36px Category/OEM comboboxes. Same variant = twMerge
                    override. */}
                {/* `clearable` must be passed explicitly: SelectTrigger hides
                    its clear-× via `!props.disabled`, but our `disabled` sits
                    on the Select ROOT, so the trigger never sees it and a
                    part-locked row would still offer a × (while the locked
                    Category/OEM pickers show a chevron). */}
                <SelectTrigger
                  clearable={!lockOemCondition}
                  className={cn(
                    "data-[size=default]:h-9 w-full",
                    errors?.condition && "border-destructive",
                  )}
                >
                  {/* Label map, not the raw wire value (`new_pull`). */}
                  <SelectValue
                    placeholder={
                      line.partId
                        ? LINE_ITEMS_STRINGS.row.placeholders.conditionFromPart
                        : LINE_ITEMS_STRINGS.row.placeholders.conditionSelect
                    }
                  >
                    {line.condition
                      ? SO_LINE_CONDITION_LABELS[line.condition as SOLineCondition]
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
              <FieldError message={errors?.condition} />
            </div>
          </>
        )}
      </div>

      {/* Messages that belong to no single input (the consumer's `extra`,
          e.g. BOM component errors). Field errors sit under their inputs. */}
      {collectedErrors.length > 0 && (
        <div className="pl-10">
          {collectedErrors.map((msg, i) => (
            <FieldError key={i} message={msg} />
          ))}
        </div>
      )}

      {/* Part-derived chips — only the variant/condition badge is shown.
          Category + Brand chips were intentionally dropped. Suppressed when
          the Condition picker is rendered above: it already shows the same
          part-derived value, and duplicating it makes the SO / Closed Won
          cards read differently from the quote's for no gain. */}
      {!showOemCondition && line.partId && line.variantType && (
        <div className="flex flex-wrap items-center gap-2 pl-10">
          <Badge
            className={`text-[10px] ${
              line.variantType === "New"
                ? "bg-success-soft text-success dark:bg-success/20 dark:text-success"
                : line.variantType === "Refurbished"
                  ? "bg-warning-soft text-warning dark:bg-warning/20 dark:text-warning"
                  : "bg-info-soft text-info dark:bg-info/20 dark:text-info"
            }`}
          >
            <Tag className="mr-1 size-3" />
            {line.variantType}
          </Badge>
        </div>
      )}

      {/* Category-from-part hint — the Category picker above is locked while
          a part is linked; this explains why. */}
      {line.partId && (
        <p className="pl-10 text-[10px] text-muted-foreground">
          {LINE_ITEMS_STRINGS.row.categoryFromPartHint}
        </p>
      )}

      {/* View / Hide BOM — only for categories flagged `is_bom_eligible`.
          Shown in view-only mode too so children stay visible on saved
          records; hidden when the row has no children AND the form is locked
          (avoids an empty "View BOM" toggle on plain non-BOM lines). */}
      {showBom && (!viewLocked || (line.bomChildren?.length ?? 0) > 0) && (
        <LineItemBomSection
          categoryId={line.categoryId}
          isExpanded={!!line.isBomExpanded}
          onToggle={() => onPatch({ isBomExpanded: !line.isBomExpanded })}
          bomChildren={line.bomChildren}
          onChange={(rows) => onPatch({ bomChildren: rows })}
          viewLocked={viewLocked}
          childAmounts={bomChildAmounts}
          // Children follow the parent: the surfaces that persist per-line
          // OEM + condition persist them per-child too (`withOemCondition` in
          // the save mappers); the quote path drops both.
          showOemCondition={showOemCondition}
          oemConditionRequired={oemConditionRequired}
        />
      )}

      {/* Surface-specific chrome (SO: qty-cap note + rental notice).
          Rendered after the BOM section so approval status + rejection
          reason stay visible below the BOM children. */}
      {belowContent}
    </div>
  )
}
