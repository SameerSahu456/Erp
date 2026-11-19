import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { PopoverSelectTrigger } from '@/components/ui/popover-select-trigger'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export interface SearchableOption {
  value: string
  /** Plain-text label — shown in the collapsed trigger and used for search. */
  label: string
  /** Extra search terms beyond the label (serials, codes, conditions…). */
  keywords?: string[]
  /** Rich row content; defaults to the label when omitted. */
  content?: ReactNode
}

/** Plain "contains" search on the label and keywords. cmdk's default fuzzy match
 *  lists "Himachal Pradesh" for "maha" and can match letters inside an id value. */
function containsFilter(value: string, search: string, keywords?: string[]): number {
  const needle = search.trim().toLowerCase()
  return (keywords ?? [value]).some((text) => text.toLowerCase().includes(needle)) ? 1 : 0
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  /** Trigger id, so a form `<Label htmlFor>` points at it. */
  id?: string
  invalid?: boolean
}

/**
 * A searchable single-select built on Base UI `Popover` + cmdk `Command`.
 * Base UI's popover coordinates dismissal with a parent dialog (a raw
 * body-portal would let clicks read as "outside" and close the dialog), and
 * cmdk supplies the type-to-filter behaviour. Safe to use inside dialogs.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches.',
  disabled,
  id,
  invalid,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverSelectTrigger id={id} invalid={invalid} hasValue={!!selected} disabled={disabled}>
        {selected ? selected.label : placeholder}
      </PopoverSelectTrigger>
      <PopoverContent align="start" className="w-[var(--anchor-width)] min-w-64 p-0">
        <Command filter={containsFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  keywords={o.keywords ?? [o.label]}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-3.5 shrink-0',
                      value === o.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="min-w-0 flex-1">{o.content ?? o.label}</div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
