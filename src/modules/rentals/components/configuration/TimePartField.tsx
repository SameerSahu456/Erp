import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

interface TimePartFieldProps {
  id: string
  ariaLabel: string
  value: string
  options: readonly string[]
  /** A typed string onto one of `options`, or null when it is not one. */
  parse: (raw: string) => string | null
  onChange: (next: string) => void
  disabled?: boolean
}

/** One part of a time — hour, minute or AM/PM. Type it, or pick it from a
 *  list that scrolls to the current value; ↑ / ↓ step through the options.
 *  A typed value that is not an option is dropped on blur. */
export function TimePartField({ id, ariaLabel, value, options, parse, onChange, disabled }: TimePartFieldProps) {
  // Null while not typing: the field shows `value`.
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = text === null ? null : parse(text)
  const highlighted = typed ?? value

  // Keep the highlighted option in view: the current one on open, the
  // typed one while typing.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-option="${highlighted}"]`)
      ?.scrollIntoView?.({ block: "nearest" })
  }, [open, highlighted])

  const commit = (next: string | null) => {
    if (next !== null && next !== value) onChange(next)
    setText(null)
  }
  const step = (delta: number) => {
    const at = options.indexOf(highlighted)
    commit(options[(at + delta + options.length) % options.length])
  }

  return (
    <div className="relative min-w-0">
      <Input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        autoComplete="off"
        className="text-center tabular-nums"
        value={text ?? value}
        disabled={disabled}
        onFocus={(e) => {
          e.target.select()
          setOpen(true)
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          commit(typed)
          setOpen(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
            step(e.key === "ArrowUp" ? 1 : -1)
          } else if (e.key === "Enter") {
            e.preventDefault()
            commit(typed)
            setOpen(false)
          } else if (e.key === "Escape") {
            setText(null)
            setOpen(false)
          }
        }}
      />
      {open && !disabled ? (
        <ul
          id={`${id}-options`}
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10"
        >
          {options.map((option) => (
            <li
              key={option}
              role="option"
              data-option={option}
              aria-selected={option === value}
              // mousedown, not click: the input's blur must not close the
              // list before the pick lands.
              onMouseDown={(e) => {
                e.preventDefault()
                commit(option)
                setOpen(false)
              }}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 text-center hover:bg-accent",
                option === highlighted && "bg-accent",
              )}
            >
              <Typography variant={option === value ? "body-strong" : "body"} className="tabular-nums">
                {option}
              </Typography>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
