import { useMemo, useState } from 'react'
import { ChevronsUpDown, Check, Hash, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { mockParts } from '@/modules/ims/data/parts'

export interface PickedPart {
  id: string
  sku: string
  name: string
  description: string
  categoryName: string
  brand: string
  sellPrice?: number
  condition?: string
}

const partOptions: PickedPart[] = mockParts
  .filter((p) => p.isActive)
  .map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description ?? '',
    categoryName: p.categoryName,
    brand: p.brand,
    sellPrice: p.sellPrice,
    condition: p.condition,
  }))

interface PartComboboxProps {
  /** Which field the user searches by; controls placeholder + display */
  searchBy: 'sku' | 'name'
  selectedPartId?: string
  /** Current display value (sku or name) when no part picked */
  displayValue?: string
  onPick: (part: PickedPart) => void
  className?: string
  triggerClassName?: string
  size?: 'sm' | 'md'
}

function PartCombobox({
  searchBy,
  selectedPartId,
  displayValue,
  onPick,
  className,
  triggerClassName,
  size = 'md',
}: PartComboboxProps) {
  const [open, setOpen] = useState(false)
  const Icon = searchBy === 'sku' ? Hash : FileText
  const placeholder = searchBy === 'sku' ? 'Select part number…' : 'Search by name…'
  const inputPlaceholder = searchBy === 'sku' ? 'Search part number…' : 'Search by name…'
  const heightClass = size === 'sm' ? 'h-8 text-xs' : 'h-9'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            type="button"
            className={cn(
              'w-full justify-between font-normal',
              heightClass,
              triggerClassName
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !displayValue && 'text-muted-foreground')}>
            {displayValue || placeholder}
          </span>
        </span>
        <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className={cn('w-[var(--anchor-width)] min-w-[280px] p-0', className)}>
        <Command>
          <CommandInput placeholder={inputPlaceholder} />
          <CommandList>
            <CommandEmpty>No parts found.</CommandEmpty>
            <CommandGroup>
              {partOptions.map((part) => (
                <CommandItem
                  key={part.id}
                  value={`${part.sku} ${part.name}`}
                  keywords={[part.sku, part.name, part.brand]}
                  onSelect={() => {
                    onPick(part)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-3.5',
                      selectedPartId === part.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    {searchBy === 'sku' ? (
                      <>
                        <div className="font-medium">{part.sku}</div>
                        <div className="truncate text-xs text-muted-foreground">{part.name}</div>
                      </>
                    ) : (
                      <>
                        <div className="truncate font-medium">{part.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {part.sku}
                          {part.brand ? ` · ${part.brand}` : ''}
                        </div>
                      </>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export interface PartLineFieldsValue {
  partId?: string
  partSku?: string
  partName?: string
  description: string
}

interface PartLineFieldsProps {
  value: PartLineFieldsValue
  onChange: (next: PartLineFieldsValue, picked?: PickedPart | null) => void
  className?: string
}

function PartLineFields({ value, onChange, className }: PartLineFieldsProps) {
  const selectedPart = useMemo(
    () => (value.partId ? partOptions.find((p) => p.id === value.partId) : undefined),
    [value.partId]
  )

  function handlePick(part: PickedPart) {
    onChange(
      {
        partId: part.id,
        partSku: part.sku,
        partName: part.name,
        description: part.description || value.description,
      },
      part
    )
  }

  function handleClear() {
    onChange(
      {
        partId: undefined,
        partSku: undefined,
        partName: undefined,
        description: value.description,
      },
      null
    )
  }

  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-3', className)}>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Part Number</label>
        <PartCombobox
          searchBy="sku"
          selectedPartId={value.partId}
          displayValue={value.partSku}
          onPick={handlePick}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <PartCombobox
          searchBy="name"
          selectedPartId={value.partId}
          displayValue={value.partName}
          onPick={handlePick}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Add description…"
          className="h-9"
        />
      </div>

      {selectedPart && (
        <div className="md:col-span-3 -mt-1">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear part selection
          </button>
        </div>
      )}
    </div>
  )
}

export { PartLineFields, PartCombobox, partOptions }
