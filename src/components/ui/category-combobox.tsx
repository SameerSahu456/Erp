import { useEffect, useRef, useState } from "react";
import { UI } from "@/shared/constants"
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
}

function flatten(
  options: CategoryOption[],
  parentId: string | null = null,
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return options
    .filter((o) => (o.parent_id ?? null) === parentId)
    .sort((a, b) => a.display_order - b.display_order)
    .flatMap((o) => [
      { id: o.id, name: o.name, depth },
      ...flatten(options, o.id, depth + 1),
    ]);
}

interface CategoryComboboxProps {
  categories: CategoryOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder = "Select category…",
  className,
  disabled,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const flat = flatten(categories);
  const selected = flat.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.depth > 0 && (
                <span className="text-muted-foreground">
                  {"·".repeat(selected.depth)}
                </span>
              )}
              {selected.name}
            </span>
          ) : (
            placeholder
          )}
        </span>
        {/* Plain <button> (no Base UI primitive), so the open state has
            no `data-popup-open` attribute — fall back to the React open
            state via `cn`. Same visual end-state as the data-attribute
            pattern used by the Base UI dropdowns. */}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[200px] overflow-hidden rounded-lg border shadow-md">
          <Command>
            <CommandInput placeholder="Search categories…" maxLength={UI.FILTER_SEARCH_MAX_LENGTH} className="h-9" />
            <CommandList className="max-h-56">
              <CommandEmpty>No category found.</CommandEmpty>

              {/* None option */}
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  !value && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <span className="text-muted-foreground italic">None</span>
              </CommandItem>

              {flat.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.id}`}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    value === item.id &&
                      "bg-accent font-medium text-accent-foreground",
                  )}
                >
                  <span
                    style={{ paddingLeft: `${item.depth * 12}px` }}
                    className={cn(
                      "flex items-center gap-1",
                      item.depth > 0 && "text-muted-foreground",
                    )}
                  >
                    {item.depth > 0 && (
                      <ChevronDown className="h-3 w-3 -rotate-90 opacity-40" />
                    )}
                    <span className={item.depth === 0 ? "font-medium" : ""}>
                      {item.name}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
