import { Search, SearchX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { INWARDS_STRINGS } from "../inwards.strings";

/** The search box shared by the received-units and staged-lines cards — one
 *  query drives both tables. */
export function UnitSearchBox({
  value,
  placeholder,
  onSearch,
}: {
  value: string;
  placeholder: string;
  onSearch: (v: string) => void;
}) {
  return (
    <div className="relative w-full sm:max-w-lg sm:flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        className="h-9 pl-9 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={INWARDS_STRINGS.batchDevices.clearSearch}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** "Nothing matches <query>" + a Clear-search button, under either table. */
export function NoSearchMatches({
  message,
  onClear,
}: {
  message: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <SearchX className="size-7 text-muted-foreground/50" aria-hidden="true" />
      <Typography variant="body" tone="muted">
        {message}
      </Typography>
      <Button variant="outline" size="sm" onClick={onClear}>
        {INWARDS_STRINGS.batchDevices.clearSearch}
      </Button>
    </div>
  );
}
