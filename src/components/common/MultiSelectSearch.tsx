import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Option {
  value: string
  label: string
}

interface MultiSelectSearchProps {
  onSearch: (query: string) => Promise<Option[]>
  value: Option[]
  onChange: (selected: Option[]) => void
  placeholder?: string
  allowCreate?: boolean
  debounceMs?: number
  renderOption?: (option: Option) => ReactNode
  className?: string
}

function MultiSelectSearch({
  onSearch,
  value,
  onChange,
  placeholder = "Search...",
  allowCreate = false,
  debounceMs = 300,
  renderOption,
  className,
}: MultiSelectSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Option[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const selectedValues = new Set(value.map((v) => v.value))

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const searchResults = await onSearch(query)
        setResults(searchResults.filter((r) => !selectedValues.has(r.value)))
        setIsOpen(true)
        setActiveIndex(-1)
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs])

  const addOption = useCallback(
    (option: Option) => {
      if (!selectedValues.has(option.value)) {
        onChange([...value, option])
      }
      setQuery("")
      setResults([])
      setIsOpen(false)
      inputRef.current?.focus()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, value]
  )

  const removeOption = useCallback(
    (optionValue: string) => {
      onChange(value.filter((v) => v.value !== optionValue))
    },
    [onChange, value]
  )

  const canCreate =
    allowCreate &&
    query.trim() &&
    !results.some((r) => r.label.toLowerCase() === query.trim().toLowerCase()) &&
    !selectedValues.has(query.trim())

  const allItems: (Option & { isCreate?: boolean })[] = [
    ...results,
    ...(canCreate
      ? [{ value: query.trim(), label: query.trim(), isCreate: true }]
      : []),
  ]

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !query && value.length > 0) {
        const last = value[value.length - 1]
        if (last) removeOption(last.value)
        return
      }

      if (!isOpen || allItems.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < allItems.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : allItems.length - 1
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          const item = allItems[activeIndex]
          if (item) addOption(item)
        }
      } else if (e.key === "Escape") {
        setIsOpen(false)
      }
    },
    [activeIndex, addOption, allItems, isOpen, query, removeOption, value]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((option) => (
          <Badge key={option.value} variant="secondary" className="gap-1">
            {option.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeOption(option.value)
              }}
              className="ml-0.5 rounded-full outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <div className="relative flex flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && results.length > 0) setIsOpen(true)
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && allItems.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {allItems.map((item, index) => (
            <button
              key={item.isCreate ? `create-${item.value}` : item.value}
              type="button"
              className={cn(
                "flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                index === activeIndex && "bg-muted text-foreground"
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                addOption(item)
              }}
            >
              {item.isCreate ? (
                <span>
                  Create &quot;{item.label}&quot;
                </span>
              ) : renderOption ? (
                renderOption(item)
              ) : (
                item.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { MultiSelectSearch, type MultiSelectSearchProps, type Option }
