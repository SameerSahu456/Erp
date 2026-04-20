import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
}

function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  function toggle(option: string) {
    onValueChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    )
  }

  function remove(option: string, e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(value.filter((v) => v !== option))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex w-full min-h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs',
          'hover:bg-accent cursor-pointer',
          !value.length && 'text-muted-foreground'
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 && <span>{placeholder}</span>}
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs font-normal gap-1 pr-1">
              {v}
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                onClick={(e) => remove(v, e)}
                onKeyDown={(e) => { if (e.key === 'Enter') remove(v, e as unknown as React.MouseEvent) }}
              >
                <XIcon className="size-3" />
              </span>
            </Badge>
          ))}
        </div>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50 ml-2" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option)
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggle(option)}
                    data-checked={isSelected}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                    {option}
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
