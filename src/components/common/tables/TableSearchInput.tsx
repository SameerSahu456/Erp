import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UI } from "@/shared/constants";

// The shared list/table search box — one component so every table (listing
// pages AND the material-issue detail component tabs) looks and behaves
// identically: search icon, compact input, and a clear button when non-empty.
export function TableSearchInput({
  value,
  onChange,
  placeholder,
  className,
  clearAriaLabel = "Clear search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes on the wrapper (e.g. width). */
  className?: string;
  clearAriaLabel?: string;
}) {
  return (
    <div className={cn("relative min-w-[260px]", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        // A list search box is never a credential/profile field — turn off
        // browser autofill so it doesn't paint the golden highlight.
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
        // `cpt-search-input` hides the browser's native type="search" clear (X)
        // via comprint.css — this box renders its OWN clear button, so without
        // it a second, redundant X shows wherever the box is used outside a
        // `.cpt-table-toolbar` (e.g. the work-assignment device picker).
        className="h-9 pl-9 pr-8 text-sm cpt-search-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={clearAriaLabel}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
