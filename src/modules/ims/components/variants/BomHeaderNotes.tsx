import { StickyNote } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

import { VARIANTS_STRINGS } from "./variants.strings";

// ── BOM-level notes ────────────────────────────────────────────────────────
//
// Always-visible. Was previously collapsed behind an 'Add BOM note' link;
// per product the field should be editable without an extra click.
export function BomHeaderNotes({
  value,
  onChange,
  canWrite,
}: {
  value: string;
  onChange: (v: string) => void;
  canWrite: boolean;
}) {
  // Read-only viewers see the note only when it has content — no point
  // rendering an empty input they can't fill.
  if (!canWrite && value.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Typography asChild variant="helper" tone="default">
        <label
          htmlFor="bom-notes"
          className="inline-flex items-center gap-1.5 font-medium"
        >
          <StickyNote className="size-3.5 text-muted-foreground" />
          {VARIANTS_STRINGS.bomNotes.label}{" "}
          <span className="text-muted-foreground">
            {VARIANTS_STRINGS.bomNotes.optionalSpan}
          </span>
        </label>
      </Typography>
      <Typography asChild variant="body">
        <Input
          id="bom-notes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={VARIANTS_STRINGS.bomNotes.placeholder}
          maxLength={2000}
          disabled={!canWrite}
          className="h-9"
          aria-label={VARIANTS_STRINGS.bomNotes.ariaLabel}
        />
      </Typography>
    </div>
  );
}
