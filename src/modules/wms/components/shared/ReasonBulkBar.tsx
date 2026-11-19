import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ReasonBulkBarOption<R extends string> {
  value: R;
  label: string;
}

/** Copy the bar renders — supplied by the caller's `*.strings.ts` (§16.12). */
export interface ReasonBulkBarStrings {
  reasonPlaceholder: string;
  notesPlaceholder: string;
  /** §0.9 — why-tooltip on the disabled Apply button (no reason picked). */
  needsReason: string;
  apply: (count: number) => string;
  /** Optional leading "N selected" label. Omit to hide it. */
  selectedCount?: (count: number) => string;
}

interface ReasonBulkBarProps<R extends string> {
  selectedCount: number;
  options: readonly ReasonBulkBarOption<R>[];
  strings: ReasonBulkBarStrings;
  /** Apply reason + note to every selected unit; the page owns the write. */
  onApply: (reason: R, notes: string) => void;
}

/** Bulk reason + note bar shared by the Purchase Return and Sales Return forms. */
export function ReasonBulkBar<R extends string>({
  selectedCount,
  options,
  strings,
  onApply,
}: ReasonBulkBarProps<R>) {
  const [reason, setReason] = useState<ReasonBulkBarOption<R> | null>(null);
  const [notes, setNotes] = useState("");

  // §0.9: explain the disabled button with a tooltip; the reason is the only unmet gate.
  const blockReason = reason ? null : strings.needsReason;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
      {strings.selectedCount && (
        <Typography variant="body-strong" className="shrink-0">
          {strings.selectedCount(selectedCount)}
        </Typography>
      )}

      <Select
        value={reason?.value ?? ""}
        onValueChange={(v) => {
          // Resolve the picked value back to a typed option — no cast needed.
          const match = options.find((o) => o.value === v);
          if (match) setReason(match);
        }}
      >
        <SelectTrigger className="h-9 w-56" clearable={false}>
          {/* Show the reason label, not its raw code (PAGE-UI §7.2). */}
          <SelectValue placeholder={strings.reasonPlaceholder}>
            {reason?.label ?? strings.reasonPlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={strings.notesPlaceholder}
        className="h-9 min-w-0 flex-1"
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0"
              disabled={!reason}
              onClick={() => {
                if (reason) onApply(reason.value, notes);
              }}
            >
              {strings.apply(selectedCount)}
            </Button>
          </TooltipTrigger>
          {blockReason && <TooltipContent>{blockReason}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
