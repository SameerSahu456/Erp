import { useEffect, useId, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"

interface SuggestInputProps {
  value: string
  onChange: (value: string) => void
  /** Values offered under the input. The typed text is always accepted as-is —
   *  suggestions only save typing; they never restrict the value. */
  suggestions: readonly string[]
  placeholder?: string
  id?: string
  className?: string
  maxLength?: number
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  onBlur?: () => void
}

// Free-text input with a suggestion list — the "pick one or type your own"
// control. Unlike AsyncSelect (pick-only, value must be an option), the typed
// text IS the value here; the list just filters the suggestions to what's
// typed. Keyboard: ↓/↑ move through the list, Enter picks, Esc closes.
export function SuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  id,
  className,
  maxLength,
  disabled,
  invalid,
  ariaLabel,
  onBlur,
}: SuggestInputProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    return q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : [...suggestions]
  }, [value, suggestions])
  // Hide the list when the only match is exactly what's already typed.
  const showList =
    open && matches.length > 0 && !(matches.length === 1 && matches[0] === value)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function pick(next: string) {
    onChange(next)
    setOpen(false)
    setHighlight(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      // Never let Enter reach a surrounding form (forms don't submit on Enter).
      e.preventDefault()
      if (showList && highlight >= 0 && matches[highlight]) pick(matches[highlight])
      else setOpen(false)
    } else if (e.key === "Escape" && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid ? true : undefined}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-56 w-full min-w-[180px] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {matches.map((s, i) => (
            <Typography key={s} asChild variant="body">
              <li
                role="option"
                aria-selected={i === highlight}
                // pointerdown (not click) so the pick lands before the input blurs.
                onPointerDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "cursor-pointer truncate rounded-md px-2 py-1.5",
                  i === highlight && "bg-accent text-accent-foreground",
                )}
              >
                {s}
              </li>
            </Typography>
          ))}
        </ul>
      )}
    </div>
  )
}
