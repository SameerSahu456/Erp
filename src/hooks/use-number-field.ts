import { useCallback, useState } from "react"
import type { ChangeEvent, FocusEvent } from "react"

/**
 * Number-input behaviour, per PAGE-UI §3.2 / §9.
 *
 * A numeric field wired through this hook:
 *  - shows `0` by default — never a blank box, so the field reads as "zero";
 *  - clears that default `0` on focus, so the operator types the real number
 *    straight in without first deleting the `0`; a non-zero value stays put but
 *    is SELECTED on focus, so the first keystroke replaces it instead of
 *    appending (a qty prefilled `1` was reading as `12` when they typed `2`);
 *  - never keeps a leading zero (`013` -> `13`, `007` -> `7`; a lone `0` and
 *    `0.x` are fine);
 *  - restores `0` when the field is left empty on blur.
 *
 * It composes with the shared `Input` primitive: `Input` already rejects
 * non-numeric keystrokes/pastes and enforces decimal precision, so this hook
 * only owns the transient display string and the default-0 / leading-zero
 * behaviour. The PARENT owns the numeric value; spread the returned props onto
 * an `<Input>` and drive it from a `number`:
 *
 *   const qty = useNumberField(count, setCount, { max: available })
 *   <Input {...qty} className="max-w-40" aria-label={…} />
 */
export interface UseNumberFieldOptions {
  /** Allow a single decimal point (money / rate). Default: whole numbers. */
  decimal?: boolean
  /** Max digits after the decimal point when `decimal` is set. Default 2. */
  decimals?: number
  /**
   * Hard clamp applied as the value is typed. Only pass `min` when the default
   * `0` is itself allowed — a `min` above 0 would snap the resting value off 0
   * and defeat the "shows 0 by default" behaviour; enforce a ">= 1" requirement
   * at submit-time instead.
   */
  min?: number
  max?: number
}

export interface NumberFieldInputProps {
  value: string
  inputMode: "numeric" | "decimal"
  numeric: true
  decimals: number
  onFocus: (event?: FocusEvent<HTMLInputElement>) => void
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

/** "013" -> "13", "007" -> "7"; a lone "0" and "0.x" are kept unchanged. */
function stripLeadingZeros(value: string): string {
  return value.replace(/^0+(?=\d)/, "")
}

export function useNumberField(
  value: number,
  onValueChange: (next: number) => void,
  options: UseNumberFieldOptions = {},
): NumberFieldInputProps {
  const { decimal = false, min, max } = options
  const decimals = decimal ? (options.decimals ?? 2) : 0

  // `null` while the field is not being edited -> the display mirrors `value`.
  // A string while it is focused/edited -> the display shows exactly what the
  // operator typed (so a cleared field can read empty even though `value` is 0).
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = useCallback(
    (n: number): number => {
      let out = n
      if (min !== undefined && out < min) out = min
      if (max !== undefined && out > max) out = max
      return out
    },
    [min, max],
  )

  const onFocus = useCallback((event?: FocusEvent<HTMLInputElement>) => {
    if (value === 0) {
      // Clear the default 0 so the operator types the real number straight in.
      setDraft("")
      return
    }
    // A non-zero value stays put for editing, but SELECT it so the first
    // keystroke replaces the prefilled number instead of appending to it — a
    // qty prefilled "1" was reading as "12" when the operator typed "2"
    // Defer the select to after this render so the selection lands on
    // the shown text, and capture the node up-front (the event may be reused).
    setDraft(String(value))
    const el = event?.currentTarget
    if (el) {
      requestAnimationFrame(() => {
        // `type="number"` inputs reject selection APIs in some engines — a
        // failed select just means no pre-selection, never a thrown error.
        try {
          el.select()
        } catch {
          /* selection unsupported on this input type — leave the caret as-is */
        }
      })
    }
  }, [value])

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      // `Input` has already rejected any non-numeric keystroke/paste, so the
      // incoming value is a clean numeric string; strip a leading zero and lift
      // the parsed number up.
      const raw = stripLeadingZeros(event.target.value)
      setDraft(raw)
      if (raw === "" || raw === ".") {
        onValueChange(clamp(0))
        return
      }
      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) onValueChange(clamp(parsed))
    },
    [onValueChange, clamp],
  )

  const onBlur = useCallback(() => {
    // Leave editing mode: the display mirrors the numeric value again, so an
    // emptied field reads back as 0.
    setDraft(null)
  }, [])

  return {
    value: draft ?? String(value),
    inputMode: decimal ? "decimal" : "numeric",
    numeric: true,
    decimals,
    onFocus,
    onChange,
    onBlur,
  }
}
