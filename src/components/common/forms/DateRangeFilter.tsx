import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { type DateRangePreset, type DateRangeValue } from "@shared/lib/date-range";

/** Shared, reusable date-range filter (preset dropdown + custom from/to).
 *  Value type + `resolveDateRange` / `matchesDateRange` live in
 *  `@shared/lib/date-range` so any module (CRM, WMS, …) can filter rows:
 *    const range = resolveDateRange(value)
 *    rows.filter((r) => matchesDateRange(r.createdAt, range)) */

const PRESET_LABELS: Record<DateRangePreset, string> = {
  all: "All time",
  today: "Today",
  monthly: "This month",
  quarterly: "This quarter",
  yearly: "This year",
  custom: "Custom range",
};

const PRESETS: DateRangePreset[] = ["all", "today", "monthly", "quarterly", "yearly", "custom"];

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  /** Width override for the preset trigger. */
  triggerClassName?: string;
}

export function DateRangeFilter({
  value,
  onChange,
  className,
  triggerClassName,
}: DateRangeFilterProps) {
  const isCustom = value.preset === "custom";
  const presets = useMemo(() => PRESETS, []);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={value.preset}
        onValueChange={(v) => onChange({ ...value, preset: (v as DateRangePreset) ?? "all" })}
      >
        <SelectTrigger className={cn("w-40", triggerClassName)}>
          <CalendarDays className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p} value={p}>
              {PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustom && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value.from ?? ""}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-[9.5rem]"
            aria-label="From date"
          />
          <Typography variant="helper" tone="muted" asChild>
            <span>to</span>
          </Typography>
          <Input
            type="date"
            value={value.to ?? ""}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-[9.5rem]"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}
