import { useEffect, useState } from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { exceedsMoneyDigits, parseNonNegativeNumber } from "@/shared/lib/validation"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"

/** Inclusive numeric range. Either bound may be omitted (open-ended). An
 *  all-empty range is represented as `undefined` by the parent. */
export interface ValueRange {
  min?: number
  max?: number
}

export interface ValueRangeInputProps {
  /** Current range. `undefined` (or an all-empty object) means nothing set. */
  value: ValueRange | undefined
  /** Fires when the value settles (debounced pause in typing, or blur / Enter) —
   *  `undefined` when both fields are empty. */
  onChange: (next: ValueRange | undefined) => void
  minPlaceholder?: string
  maxPlaceholder?: string
  /** Prefix glyph shown inside each field (e.g. a currency symbol). */
  prefix?: string
  /** Max digits after the decimal point. Defaults to 0 (whole amounts). */
  decimals?: number
  /** Hard cap on how many digits each field accepts (decimal point / sign not
   *  counted). Also caps the digits before the decimal point at
   *  `maxDigits - decimals` (NUMERIC semantics: 12 / 2 → 10 whole digits).
   *  Defaults to 16 — keeps a bound within the backend's numeric range and
   *  stops a runaway paste. */
  maxDigits?: number
  /** Idle time (ms) after the last keystroke before the value commits.
   *  Defaults to the shared search-debounce so typing doesn't fire a request
   *  per digit. */
  debounceMs?: number
  disabled?: boolean
  className?: string
  /** Accessible label prefix for the two inputs (e.g. "Quote value"). */
  ariaLabel?: string
  /** Copy shown (and announced) when max < min. Overridable so callers keep
   *  it in their strings file; a plain default keeps the control usable alone. */
  invalidRangeMessage?: string
}

function toField(n: number | undefined): string {
  return n == null ? "" : String(n)
}

// Count only 0-9 characters — the decimal point, sign, and any stray whitespace
// don't count toward the digit cap.
function countDigits(raw: string): number {
  return (raw.match(/\d/g) ?? []).length
}

// Min / Max numeric range control shared across CRM list filters (Quote Value
// on Leads & Deals). Two `Input` fields (reusing the number-guard primitive).
// Commits are DEBOUNCED — the value settles ~`debounceMs` after the last
// keystroke (blur / Enter flush immediately) — so typing a bound doesn't fire a
// request per digit, mirroring the list search box. The trigger geometry
// mirrors the DateRangePicker field family (h-10, rounded, border-input,
// bg-card). All colors come from semantic tokens — no hex.
export function ValueRangeInput({
  value,
  onChange,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  prefix,
  decimals = 0,
  maxDigits = 16,
  debounceMs = UI.DEBOUNCE_SEARCH_MS,
  disabled,
  className,
  ariaLabel = "Value",
  invalidRangeMessage = "Max must be greater than or equal to Min",
}: ValueRangeInputProps) {
  // Local buffer so typing is smooth and only a settled value hits the parent.
  const [minText, setMinText] = useState(() => toField(value?.min))
  const [maxText, setMaxText] = useState(() => toField(value?.max))

  // Re-sync when the committed value changes from OUTSIDE the control (URL
  // clear, reset filters, back/forward). React's "adjust state while
  // rendering" pattern (https://react.dev/reference/react/useState#storing-
  // information-from-previous-renders) — preferred over a useEffect, which
  // would cause a cascading render. The guard keeps an in-progress edit that
  // already parses to the committed number from being clobbered mid-typing.
  const [syncedMin, setSyncedMin] = useState(value?.min)
  const [syncedMax, setSyncedMax] = useState(value?.max)
  if (value?.min !== syncedMin) {
    setSyncedMin(value?.min)
    if (parseNonNegativeNumber(minText) !== value?.min) setMinText(toField(value?.min))
  }
  if (value?.max !== syncedMax) {
    setSyncedMax(value?.max)
    if (parseNonNegativeNumber(maxText) !== value?.max) setMaxText(toField(value?.max))
  }

  // Live range check against what's currently typed (not the debounced copy),
  // so the error surfaces the instant `max < min` — the mirror of the backend's
  // `min_quote_value <= max_quote_value` 422 guard.
  const liveMin = parseNonNegativeNumber(minText)
  const liveMax = parseNonNegativeNumber(maxText)
  const rangeInvalid = liveMin != null && liveMax != null && liveMin > liveMax

  const commit = (nextMinText: string, nextMaxText: string) => {
    const min = parseNonNegativeNumber(nextMinText)
    const max = parseNonNegativeNumber(nextMaxText)
    // Don't push an inverted range — it would only earn a 422. Hold the last
    // valid committed value until the user fixes the bounds.
    if (min != null && max != null && min > max) return
    if (min === value?.min && max === value?.max) return // no-op — already committed
    onChange(min == null && max == null ? undefined : { min, max })
  }

  // Debounced auto-commit: fire ONLY when the typed text settles. `onChange`
  // targets the PARENT (URL/query state), not this component's state, so calling
  // it from an effect is the sanctioned "sync to an external system" use — not
  // the set-state-in-effect anti-pattern. Deps are the debounced text ONLY:
  // depending on `value` too would re-run this the moment a commit (or the X
  // clear) changes `value`, while the debounced copies still hold the OLD text —
  // re-committing the stale value and, for clear, resurrecting the filter.
  const debouncedMin = useDebounce(minText, debounceMs)
  const debouncedMax = useDebounce(maxText, debounceMs)
  useEffect(() => {
    commit(debouncedMin, debouncedMax)
    // `commit` closes over the latest `value`/`onChange` (React runs the newest
    // render's effect when these deps change), so its equality guard is current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax])

  const hasValue = value?.min != null || value?.max != null

  const clear = () => {
    setMinText("")
    setMaxText("")
    onChange(undefined)
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <BoundField
          value={minText}
          onValueChange={setMinText}
          onCommit={() => commit(minText, maxText)}
          placeholder={minPlaceholder}
          prefix={prefix}
          decimals={decimals}
          maxDigits={maxDigits}
          disabled={disabled}
          invalid={rangeInvalid}
          aria-label={`${ariaLabel} minimum`}
        />
        <Typography variant="body" tone="muted" aria-hidden>
          –
        </Typography>
        <BoundField
          value={maxText}
          onValueChange={setMaxText}
          onCommit={() => commit(minText, maxText)}
          placeholder={maxPlaceholder}
          prefix={prefix}
          decimals={decimals}
          maxDigits={maxDigits}
          disabled={disabled}
          invalid={rangeInvalid}
          aria-label={`${ariaLabel} maximum`}
        />
        {hasValue && !disabled && (
          <button
            type="button"
            aria-label={`Clear ${ariaLabel.toLowerCase()} range`}
            onClick={clear}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {rangeInvalid && (
        <Typography variant="helper" tone="danger" role="alert" className="mt-1 block">
          {invalidRangeMessage}
        </Typography>
      )}
    </div>
  )
}

function BoundField({
  value,
  onValueChange,
  onCommit,
  placeholder,
  prefix,
  decimals,
  maxDigits,
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: {
  value: string
  onValueChange: (next: string) => void
  onCommit: () => void
  placeholder: string
  prefix?: string
  decimals: number
  maxDigits: number
  disabled?: boolean
  invalid?: boolean
  "aria-label": string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-[10px] flex items-center text-[13px] text-muted-foreground">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        decimals={decimals}
        min={0}
        step={decimals > 0 ? "any" : 1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = e.currentTarget.value
          // Reject the edit past the digit cap — the controlled `value` stays
          // put, so the field reverts (covers both typing and paste). `number`
          // inputs ignore the HTML `maxLength`, so this has to be enforced here.
          if (decimals > 0 ? exceedsMoneyDigits(next, maxDigits, decimals) : countDigits(next) > maxDigits) return
          onValueChange(next)
        }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onCommit()
          }
        }}
        className={cn(prefix && "pl-[26px]")}
      />
    </div>
  )
}
