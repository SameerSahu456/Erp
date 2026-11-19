import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";
import type { MovableUnit } from "./move-stock-helpers";

/** A caption + value line (e.g. "Part  Laptop · LP-01"), truncating safely. */
function LabeledLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <Typography variant="caption" tone="muted" asChild>
        <span className="shrink-0">{label}</span>
      </Typography>
      <Typography variant="helper" truncate asChild>
        <span className="min-w-0">{text}</span>
      </Typography>
    </div>
  );
}

const uniqueJoin = (parts: (string | null | undefined)[]) =>
  [...new Set(parts.filter(Boolean))].join(" · ");

export function MovableUnitRow({
  unit: u,
  checked,
  isTransfer,
  onToggle,
}: {
  unit: MovableUnit;
  checked: boolean;
  isTransfer: boolean;
  onToggle: (id: string) => void;
}) {
  // Part and variant get separate labelled lines so they don't read as duplicates.
  const partText = uniqueJoin([u.partName, u.partNumber]);
  const variantText = uniqueJoin([u.variantLabel, u.skuCode]);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle(u.id)}
      className={cn(
        "flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
        checked ? "bg-accent" : "hover:bg-muted/40",
      )}
    >
      {/* Clean selection indicator: a visible outlined box when
          empty (so it clearly invites a pick), slate-filled with a
          check when selected. */}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background",
        )}
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <Typography variant="mono" truncate>
            {u.internalSerial}
          </Typography>
          {u.condition ? (
            <Badge variant="secondary" className="shrink-0">
              {u.condition}
            </Badge>
          ) : null}
        </div>
        {partText ? <LabeledLine label={S.colPart} text={partText} /> : null}
        {variantText ? <LabeledLine label={S.colVariant} text={variantText} /> : null}
        {isTransfer && u.status === "in_operations" ? (
          <Typography variant="caption" tone="warning">
            {S.transferRestartsInspection}
          </Typography>
        ) : null}
      </div>
      {u.locationName ? (
        <Badge variant="outline" className="shrink-0">
          {u.locationName}
        </Badge>
      ) : (
        <Badge variant="grey-soft" className="shrink-0">
          {S.unassigned}
        </Badge>
      )}
    </button>
  );
}
