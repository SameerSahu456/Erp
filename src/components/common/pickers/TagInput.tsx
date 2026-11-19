import { useCallback, useRef, useState } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

import { TAG_INPUT_STRINGS as S } from './tag-input.strings'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

// Outlined-chip pattern. Each chip carries its own hairline border on a
// white background, like a filter pill. The wrapper itself is invisible —
// no big input frame around the chips. The inner text input sits on the
// same row, also chrome-less. The result reads as a row of tokens with
// a typing slot, not as "stuff inside an input box."

function TagInput({
  value,
  onChange,
  placeholder = "Add tag…",
  className,
  ariaLabel,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInputValue("")
    },
    [onChange, value]
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [onChange, value]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value.length - 1)
      }
    },
    [addTag, inputValue, removeTag, value.length]
  )

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        // Wrapper matches <Input variant="outline"> chrome so the empty
        // state has a visible boundary like every other field. The
        // outlined chips inside read as distinct filter-style pills,
        // not as nested inputs.
        "flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-[7px] border border-input bg-card px-[10px] py-1 transition-[border-color,box-shadow] duration-100",
        "focus-within:border-primary focus-within:outline-none focus-within:ring-3 focus-within:ring-ring",
        className
      )}
    >
      {value.map((tag, index) => (
        <span
          key={tag}
          className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md bg-muted pl-2.5 pr-1 text-[12.5px] font-medium text-secondary-foreground"
        >
          <span className="truncate leading-none">{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(index)
            }}
            aria-label={S.removeTag(tag)}
            className="grid size-[18px] shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-input hover:text-foreground focus-visible:bg-input focus-visible:outline-none"
          >
            <X className="size-[12px]" strokeWidth={2.25} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="h-7 min-w-[100px] flex-1 border-0 bg-transparent p-0 text-[13px] leading-none text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
      />
      {/* Field-level clear — empties every tag and any in-progress text.
          The `flex-1` input above pins it to the trailing edge. */}
      {(value.length > 0 || inputValue.length > 0) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange([])
            setInputValue("")
            inputRef.current?.focus()
          }}
          aria-label={S.clearAll.ariaLabel}
          title={S.clearAll.title}
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
        >
          <X className="size-[14px]" strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}

export { TagInput, type TagInputProps }
