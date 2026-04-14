import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface MultiSelectOption {
  value: string
  label: string
  group?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  maxSelected?: number
  className?: string
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  maxSelected,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedLabels = useMemo(() => {
    return value
      .map((v) => options.find((o) => o.value === v))
      .filter(Boolean) as MultiSelectOption[]
  }, [value, options])

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, MultiSelectOption[]>()
    for (const option of options) {
      const group = option.group ?? ""
      const existing = groups.get(group)
      if (existing) {
        existing.push(option)
      } else {
        groups.set(group, [option])
      }
    }
    return groups
  }, [options])

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      if (maxSelected && value.length >= maxSelected) return
      onChange([...value, optionValue])
    }
  }

  const selectAll = () => {
    if (maxSelected) {
      onChange(options.slice(0, maxSelected).map((o) => o.value))
    } else {
      onChange(options.map((o) => o.value))
    }
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-auto min-h-8 w-full justify-between font-normal",
              className
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {selectedLabels.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selectedLabels.length <= 3
            ? selectedLabels.map((item) => (
                <Badge key={item.value} variant="secondary" className="gap-1">
                  {item.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOption(item.value)
                    }}
                    className="ml-0.5 rounded-full outline-none hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            : (
                <span className="text-sm">
                  {selectedLabels.length} selected
                </span>
              )}
        </div>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            {Array.from(groupedOptions.entries()).map(
              ([group, groupOptions]) => (
                <CommandGroup key={group} heading={group || undefined}>
                  {groupOptions.map((option) => {
                    const isSelected = value.includes(option.value)
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.label]}
                        onSelect={() => toggleOption(option.value)}
                        data-checked={isSelected || undefined}
                      >
                        <div
                          className={cn(
                            "mr-2 flex size-4 items-center justify-center rounded-sm border border-input",
                            isSelected && "border-primary bg-primary text-primary-foreground"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        {option.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            )}
          </CommandList>
          <CommandSeparator />
          <div className="flex items-center justify-between p-2">
            <Button variant="ghost" size="xs" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="xs" onClick={clearAll}>
              Clear All
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect, type MultiSelectProps, type MultiSelectOption }
