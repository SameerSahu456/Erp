import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { isDecimalInput, isIntegerInput } from "@/shared/lib/validation"

const inputVariants = cva(
  "w-full min-w-0 bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        outline:
          "rounded-[7px] border border-input bg-card px-[10px] text-[13.5px] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring",
        solid:
          "rounded-[7px] border border-transparent bg-muted px-[10px] text-[13.5px] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring",
        tertiary:
          "rounded-md border border-transparent bg-transparent px-3 focus-visible:bg-muted focus-visible:border-ring",
        white:
          "rounded-md border border-input bg-card px-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      },
      inputSize: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "outline",
      inputSize: "default",
    },
  }
)

// Keys that should never produce a value in a numeric input. `<input type="number">`
// natively accepts `e`/`E` (scientific notation) and the sign chars `+`/`-`,
// none of which are valid for any current numeric field in this codebase
// (counts, currency, percentages — all non-negative, non-exponential). The
// onKeyDown guard below blocks them at keystroke; onWheel disables the
// accidental scroll-to-change behavior. See validation.md §9.0-B.
const NUMERIC_BLOCKED_KEYS = new Set(["e", "E", "+", "-"])

// The only printable characters a numeric field may receive.
const NUMERIC_ALLOWED_CHARS = /^[0-9.]$/

// Default fractional precision for numeric fields. `isDecimalInput` enforces
// "≤ 1 decimal point, ≤ N digits after it" — see validation.md §9.0.
const DEFAULT_DECIMALS = 2

function Input({
  className,
  type,
  variant = "outline",
  inputSize = "default",
  decimals = DEFAULT_DECIMALS,
  numeric,
  inputMode,
  value,
  defaultValue,
  onKeyDown,
  onWheel,
  onChange,
  onBeforeInput,
  onPaste,
  ...props
}: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    /** Max digits allowed after the decimal point. Defaults to 2. */
    decimals?: number
    /** Force the decimal guard on a `type="text"`/`"tel"` field. */
    numeric?: boolean
  }) {
  // A field carries the decimal guard when it's a real number input, declares a
  // decimal soft-keyboard, or is explicitly opted in. Phone (`type="tel"` +
  // `isPhoneInput`), pincode, and year fields don't match any of these, so they
  // keep their own digit-only filters untouched.
  const guardDecimals =
    type === "number" || inputMode === "decimal" || numeric === true
  // `decimals={0}` (or any non-positive value) means integer-only: no decimal
  // point at all, not even a trailing dot.
  const integerOnly = decimals <= 0

  // Last value we accepted — used to revert a keystroke/paste that would push the
  // field past `decimals` places or add a 2nd dot. For controlled inputs this is
  // re-synced from `value` below (a rejected edit never updates `value`, so the
  // ref stays at the last good value); for uncontrolled inputs we track it here.
  const lastValidRef = React.useRef<string>(
    value != null ? String(value) : defaultValue != null ? String(defaultValue) : "",
  )
  React.useEffect(() => {
    if (value != null) lastValidRef.current = String(value)
  }, [value])

  // Caret position captured BEFORE the DOM mutates, so a rejected keystroke can
  // restore the cursor where it was (text/tel inputs only — `type="number"`
  // forbids selection APIs).
  const caretRef = React.useRef<number | null>(null)

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === "number" && NUMERIC_BLOCKED_KEYS.has(event.key)) {
        event.preventDefault()
      }
      // Chrome refuses letters in `type="number"` natively; Firefox lets them
      // through and shows them (while `.value` reads back ""), so handleChange
      // never sees anything to reject. Block any printable non-numeric key here
      // so both browsers behave the same. Shortcuts (Ctrl/Cmd+V/A/C…) and
      // navigation/edit keys (length > 1: Backspace, Arrow…) are untouched.
      if (
        type === "number" &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !NUMERIC_ALLOWED_CHARS.test(event.key)
      ) {
        event.preventDefault()
      }
      // Integer-only fields never accept a decimal separator.
      if (guardDecimals && integerOnly && (event.key === "." || event.key === ",")) {
        event.preventDefault()
      }
      onKeyDown?.(event)
    },
    [type, guardDecimals, integerOnly, onKeyDown],
  )

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLInputElement>) => {
      if (type === "number" && document.activeElement === event.currentTarget) {
        event.currentTarget.blur()
      }
      onWheel?.(event)
    },
    [type, onWheel],
  )

  const handleBeforeInput = React.useCallback(
    (event: React.InputEvent<HTMLInputElement>) => {
      if (guardDecimals && type !== "number") {
        caretRef.current = event.currentTarget.selectionStart
      }
      onBeforeInput?.(event)
    },
    [guardDecimals, type, onBeforeInput],
  )

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (guardDecimals) {
        const pasted = event.clipboardData.getData("text")
        if (pasted) {
          const el = event.currentTarget
          // `type="number"` doesn't expose a reliable caret/value while it holds
          // "bad input" (e.g. a lone "."), so validate current + pasted text;
          // text/tel splice the paste in at the selection.
          let next: string
          if (type === "number") {
            next = (el.value ?? "") + pasted
          } else {
            const start = el.selectionStart ?? el.value.length
            const end = el.selectionEnd ?? el.value.length
            next = el.value.slice(0, start) + pasted + el.value.slice(end)
          }
          const accepted = integerOnly
            ? isIntegerInput(next)
            : isDecimalInput(next, decimals)
          if (!accepted) {
            event.preventDefault()
            return
          }
        }
      }
      onPaste?.(event)
    },
    [guardDecimals, integerOnly, decimals, type, onPaste],
  )

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (guardDecimals) {
        const el = event.currentTarget
        const accepted = integerOnly
          ? isIntegerInput(el.value)
          : isDecimalInput(el.value, decimals)
        if (!accepted) {
          // Reject: roll back to the last accepted value and (for text/tel)
          // restore the caret. Crucially we DON'T call the consumer's onChange,
          // so the bad value never reaches form state.
          const restore = lastValidRef.current
          el.value = restore
          if (type !== "number" && caretRef.current != null) {
            const pos = Math.min(caretRef.current, restore.length)
            try {
              el.setSelectionRange(pos, pos)
            } catch {
              /* selection unsupported — ignore */
            }
          }
          return
        }
        lastValidRef.current = el.value
      }
      onChange?.(event)
    },
    [guardDecimals, integerOnly, decimals, type, onChange],
  )

  return (
    <InputPrimitive
      type={type}
      inputMode={inputMode}
      value={value}
      defaultValue={defaultValue}
      data-slot="input"
      className={cn(inputVariants({ variant, inputSize, className }))}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onBeforeInput={handleBeforeInput}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  )
}

export { Input, inputVariants }
