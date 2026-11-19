import { useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { cn } from "@/lib/utils"
import { selectedFirst, useOpenSnapshot } from "@/shared/hooks"

interface EnumMultiSelectProps {
  label: string
  value: string[]
  options: { value: string; label: string }[]
  onChange: (next: string[]) => void
  className?: string
}

/**
 * Static-enum multi-select: a dropdown trigger with a checkbox list inside.
 * Mirrors AsyncUserMultiSelect / AsyncAccountMultiSelect's trigger + popover
 * geometry so toolbar chips and aside fields feel like one family. No search /
 * infinite scroll — the allow-list is tiny (channel = 4 values).
 */
export function EnumMultiSelect({
  label,
  value,
  options,
  onChange,
  className,
}: EnumMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)
  // Selected options float to the top as of when the list opened (not live).
  const pinned = useOpenSnapshot(open, value)
  const ordered = useMemo(
    () => selectedFirst(options, (o) => o.value, new Set(pinned)),
    [options, pinned],
  )
  const summary = value.length > 0 ? `${label} (${value.length})` : label

  function toggle(v: string) {
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        dimWhenEmpty={false}
        hasValue={value.length > 0}
        onClear={clearAll}
        clearLabel={`Clear ${label.toLowerCase()}`}
        title={value.length > 0 ? `${label}: ${value.length} selected` : label}
        className={className}
      >
        {summary}
      </PopoverSelectTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(20rem,calc(100vw-2rem))] min-w-(--anchor-width) p-1"
      >
        {ordered.map((o) => {
          const checked = selected.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                "hover:bg-accent",
                checked && "bg-accent/50",
              )}
            >
              <Checkbox checked={checked} className="pointer-events-none shrink-0" />
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
