import { useState, type ComponentProps, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/**
 * A friendly numeric field for money / quantity / percentage entry.
 *
 * Why this exists: a raw `<input type="number">` with `Number(e.target.value) || 0`
 * is hostile — clearing the box snaps the value to 0, big numbers have no
 * thousands separators, decimals fight the caret, and typed negatives slip
 * through `min`. This field fixes all of that:
 *
 *  • While focused it shows a plain, freely-editable string. A cleared box reads
 *    as 0 live so totals reflect the blank immediately; genuine mid-typing
 *    partials ("-", "12.") are still held so the caret isn't fought.
 *  • While at rest it shows the value grouped in the Indian system (1,25,000),
 *    with an optional ₹ prefix / % suffix affordance.
 *  • It rejects characters that can't belong (a dot when `integer`, a minus when
 *    `min >= 0`) instead of accepting then coercing them away.
 *  • It clamps to [min, max] on blur (and rounds when `integer`), so the parent
 *    only ever settles on a valid number.
 */

const groupInt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })
const groupDec = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 })

function formatGrouped(value: number, integer: boolean): string {
  if (!Number.isFinite(value)) return ""
  return integer ? groupInt.format(Math.round(value)) : groupDec.format(value)
}

export interface NumericInputProps
  extends Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type" | "prefix"> {
  value: number
  onChange: (value: number) => void
  /** Inclusive lower bound. When `>= 0`, typing a minus sign is blocked. */
  min?: number
  /** Inclusive upper bound. */
  max?: number
  /** Whole numbers only — blocks the decimal point and rounds on blur. */
  integer?: boolean
  /** Leading affordance (e.g. ₹) rendered inside the field. */
  prefix?: ReactNode
  /** Trailing affordance (e.g. %) rendered inside the field. */
  suffix?: ReactNode
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  integer = false,
  prefix,
  suffix,
  className,
  disabled,
  ...rest
}: NumericInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")

  const allowNegative = (min ?? 0) < 0
  const display = focused ? draft : formatGrouped(value, integer)

  function clamp(n: number): number {
    let v = integer ? Math.round(n) : n
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    return v
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true)
    // Start from a clean, editable string. A zero shows blank so the user types
    // over it instead of prefixing digits onto a stray "0".
    setDraft(value === 0 ? "" : String(value))
    rest.onFocus?.(e)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "")
    if (integer && raw.includes(".")) return
    if (!allowNegative && raw.includes("-")) return
    // Accept only a (possibly partial) number: optional sign, digits, one dot.
    if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return
    setDraft(raw)
    // A cleared box reads as 0 live, so totals reflect the blank immediately
    // (the field itself still shows empty via `draft`, so typing continues).
    if (raw === "") {
      onChange(0)
      return
    }
    // Hold genuine mid-typing partials ("-", ".", "-.") so the parent value
    // doesn't snap while a sign / decimal point is being entered.
    if (raw === "-" || raw === "." || raw === "-.") return
    const n = Number(raw)
    if (!Number.isNaN(n)) onChange(n)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(false)
    const parsed = draft === "" ? (min ?? 0) : Number(draft)
    onChange(clamp(Number.isNaN(parsed) ? (min ?? 0) : parsed))
    rest.onBlur?.(e)
  }

  return (
    <div className="relative">
      {prefix != null && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
          <Typography variant="body" tone="muted" asChild>
            <span>{prefix}</span>
          </Typography>
        </span>
      )}
      <Input
        {...rest}
        inputMode={integer ? "numeric" : "decimal"}
        value={display}
        disabled={disabled}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(prefix != null && "pl-7", suffix != null && "pr-7", className)}
      />
      {suffix != null && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
          <Typography variant="body" tone="muted" asChild>
            <span>{suffix}</span>
          </Typography>
        </span>
      )}
    </div>
  )
}
