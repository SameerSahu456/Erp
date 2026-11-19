import { useMemo, useRef, useState } from "react";
import { ChevronDown, X as XIcon } from "lucide-react";

import {
  Command,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Typography } from "@/components/ui/typography";
import type { AsyncQueryShape } from "@/components/ui/async-select";
import { useDebounce } from "@/shared/hooks";
import { cn } from "@/lib/utils";
import { ScanSelectOptions } from "./ScanSelectOptions";

export interface ScanOption {
  id: string;
  label: string;
}

interface ScanSelectProps<T extends { id: string }> {
  value: ScanOption | null;
  onChange: (opt: ScanOption | null) => void;
  /** Full picked row — lets callers read fields beyond {id,label} (e.g. tracking). */
  onPick?: (item: T) => void;
  /** Server-searched options hook (same contract as AsyncSelect's `useOptions`); disabled while closed. */
  useOptions: (search: string, opts: { enabled: boolean }) => AsyncQueryShape<T>;
  toLabel: (item: T) => string;
  /** Scannable codes (serial / sku / part number) — an exact match auto-selects. */
  toCodes: (item: T) => (string | null | undefined)[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  loadingText: string;
  /** When set, the typed/scanned text can be committed as-is (not just picked
   *  from the list) — the "type a serial that isn't loaded yet" path. */
  onFreeText?: (raw: string) => void;
  /** Label for the "use typed value" row (defaults to the raw text). */
  freeTextLabel?: (raw: string) => string;
  disabled?: boolean;
  className?: string;
  /** Accessible name for the clear (✕) button. Defaults to "Clear <label>". */
  clearLabel?: string;
}

// A searchable combobox that doubles as a scan target: type or scan into the
// input; on Enter an exact code match (or the sole result) auto-selects — the
// scanner-fills-and-picks path. The list is rendered in a portalled Popover so
// it is never clipped by the surrounding cards, and server-side search (cmdk
// filtering off) keeps it fast over large inventory.
export function ScanSelect<T extends { id: string }>({
  value,
  onChange,
  onPick,
  useOptions,
  toLabel,
  toCodes,
  placeholder,
  searchPlaceholder,
  emptyText,
  loadingText,
  onFreeText,
  freeTextLabel,
  disabled,
  className,
  clearLabel,
}: ScanSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 250);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>();

  const query = useOptions(debounced, { enabled: open });
  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  const close = () => {
    setOpen(false);
    setSearch("");
  };
  const pick = (item: T) => {
    onChange({ id: item.id, label: toLabel(item) });
    onPick?.(item);
    close();
  };
  const commitFreeText = (raw: string) => {
    onFreeText?.(raw.trim());
    close();
  };

  // Is the typed text already an exact code among the loaded rows?
  const hasExact = (raw: string) =>
    items.some((it) => toCodes(it).some((c) => c && c.toLowerCase() === raw));
  const showFreeText =
    !!onFreeText && search.trim().length > 0 && !hasExact(search.trim().toLowerCase());

  // Scan path: a scanner types the code and appends Enter. On Enter, pick the
  // exact match / sole result, else commit the typed value (if free-text is on).
  const handleEnter = () => {
    const raw = search.trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const exactHits = items.filter((it) =>
      toCodes(it).some((c) => c && c.toLowerCase() === lower),
    );
    const target =
      exactHits.length === 1
        ? exactHits[0]
        : items.length === 1
          ? items[0]
          : null;
    if (target) pick(target);
    else if (onFreeText) commitFreeText(raw);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTriggerWidth(triggerRef.current?.offsetWidth);
        else setSearch("");
      }}
    >
      <div className="relative w-full">
        <PopoverTrigger
          ref={triggerRef}
          disabled={disabled}
          className={cn(
            // Canonical dropdown-trigger frame — matches ui/select's
            // SelectTrigger and the shared PopoverSelectTrigger so every WMS
            // dropdown reads the same. Behaviour (scan/free-text) is unchanged.
            "flex h-10 w-full items-center justify-between gap-1.5 rounded-[7px] border border-input bg-card pl-[10px] pr-[10px] shadow-xs outline-none transition-colors",
            "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Room for the clear (✕) button that overlays the right edge.
            value && "pr-14",
            className,
          )}
        >
          <Typography variant="body" tone={value ? "default" : "muted"} asChild>
            <span className="min-w-0 truncate">
              {value ? value.label : placeholder}
            </span>
          </Typography>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </PopoverTrigger>
        {/* Clear is a real, keyboard-reachable, labelled button — a sibling of
            the trigger, never an SVG-with-onClick nested inside it (§0.15). */}
        {value && !disabled && (
          <button
            type="button"
            aria-label={clearLabel ?? `Clear ${value.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      <PopoverContent
        align="start"
        className="p-0"
        style={triggerWidth ? { width: triggerWidth } : undefined}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEnter();
            }}
            placeholder={searchPlaceholder}
            autoFocus
            className="h-9"
          />
          <ScanSelectOptions
            isLoading={query.isLoading}
            items={items}
            search={search}
            showFreeText={showFreeText}
            labels={{ emptyText, loadingText, freeTextLabel, toLabel }}
            onPick={pick}
            onFreeText={commitFreeText}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={() => void query.fetchNextPage()}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
}
