import * as React from 'react'
import { UI } from "@/shared/constants"
import { selectedFirst, useOpenSnapshot } from "@/shared/hooks"
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface MultiSelectProps {
  options: readonly string[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  /** Display text for an option whose stored value is not human-readable
   *  (an enum). Defaults to the value itself. */
  getOptionLabel?: (option: string) => string
  /** Trigger text when something is selected. Defaults to "N options selected". */
  formatSelection?: (selected: string[]) => string
  /** `"sm"` (h-8) matches the compact list-toolbar filters. */
  size?: 'sm' | 'default'
  /** Extra trigger classes — e.g. a fixed width in a toolbar. */
  className?: string
  /** Show the search box in the popup. Off suits a short, fixed list. */
  searchable?: boolean
}

function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  getOptionLabel = (option) => option,
  formatSelection,
  size = 'default',
  className,
  searchable = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  // Selected options float to the top as of when the list opened (not live, so
  // a row doesn't jump while being ticked).
  const pinned = useOpenSnapshot(open, value)
  const ordered = React.useMemo(
    () => selectedFirst(options, (o) => o, new Set(pinned)),
    [options, pinned],
  )

  function toggle(option: string) {
    onValueChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    )
  }

  const selectionSummary =
    value.length === 0
      ? placeholder
      : (formatSelection?.(value) ??
        `${value.length} option${value.length === 1 ? '' : 's'} selected`)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <PopoverTrigger
        data-slot="input"
        className={cn(
          // `group/multi-select-trigger` lets the chevron child rotate
          // on open via Base UI's `data-popup-open` / `data-open`
          // attribute — same Tailwind pattern as every other dropdown.
          'group/multi-select-trigger flex w-full items-center justify-between border border-input bg-card px-[10px] text-[13.5px] shadow-xs',
          size === 'sm' ? 'h-8 rounded-[5px]' : 'h-10 rounded-[7px]',
          'cursor-pointer transition-colors',
          !value.length && 'text-muted-foreground',
          className
        )}
        title={value.length ? value.map(getOptionLabel).join(', ') : placeholder}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectionSummary}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50 ml-2 transition-transform duration-200 group-data-popup-open/multi-select-trigger:rotate-180 group-data-open/multi-select-trigger:rotate-180" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command>
          {searchable && (
            <div className="relative">
              <CommandInput
                placeholder="Search..."
                value={search}
                onValueChange={setSearch}
                maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
                className="pr-6"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3.5 top-[calc(50%+2px)] -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          )}
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {ordered.map((option) => {
                const isSelected = value.includes(option)
                return (
                  <CommandItem
                    key={option}
                    // The LABEL, so the search box matches what is shown.
                    value={getOptionLabel(option)}
                    // No `data-checked`: it lights CommandItem's trailing tick,
                    // duplicating the checkbox below.
                    onSelect={() => toggle(option)}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                    {getOptionLabel(option)}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect }
