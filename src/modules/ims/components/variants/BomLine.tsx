import { CheckCircle2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useNumberField } from "@/hooks/use-number-field";

import type { DraftRow } from "./bom-tab-helpers";
import { VARIANTS_STRINGS } from "./variants.strings";

// ── Compact one-line row ───────────────────────────────────────────────────
//
// Ledger row matching the reference image — 6 columns:
//   check | name + variant subtitle | brand | SKU | qty input | remove ×
// The component is locked once picked; swap by removing + re-adding from
// the search bar above. Position and item Notes are NOT surfaced on the
// row anymore (user request) — values stay in draft state so a load +
// save round-trip preserves whatever was already there.
export function BomLine({
  row,
  canWrite,
  onChange,
  onRemove,
  disabled,
}: {
  row: DraftRow;
  canWrite: boolean;
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const quantityField = useNumberField(
    row.quantity,
    (n) => onChange({ quantity: n }),
    { max: 10_000 },
  );
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)_120px_140px_64px_28px] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted/30">
      <CheckCircle2
        className={cn(
          "size-4",
          row.component_variant_id
            ? "text-[color:var(--audit-green)]"
            : "text-muted-foreground/40",
        )}
        aria-hidden
      />

      {/* Two-line component label: bold part name on top, smaller
          variant name underneath. Matches the reference's
          "Intel Xeon Silver 4314 CPU / Xeon Silver 4314" pattern. */}
      <div className="min-w-0">
        <Typography asChild variant="body">
          <div className="truncate font-medium">
            {row.componentLabel ||
              VARIANTS_STRINGS.bomLine.componentRemovedFallback}
          </div>
        </Typography>
        {row.componentVariantName &&
          row.componentVariantName !== row.componentLabel && (
            <Typography asChild variant="caption">
              <div className="truncate">
                {row.componentVariantName}
              </div>
            </Typography>
          )}
      </div>

      {/* Brand column — text only; muted if unknown. Loaded BOMs
          don't carry OEM name on the embed, so this stays blank
          for pre-existing items. */}
      <Typography asChild variant="helper">
        <div className="truncate">
          {row.componentBrand ?? ""}
        </div>
      </Typography>

      {/* Part # column — mono, muted. */}
      <Typography asChild variant="helper">
        <div className="truncate font-mono">
          {row.componentSku ?? ""}
        </div>
      </Typography>

      {/* Quantity input — simple whole-number field wired through the shared
          useNumberField hook (shows 0 by default, clears on focus, caps at
          10,000). A ">= 1" floor is enforced on save, not here. */}
      <Typography asChild variant="body">
        <Input
          {...quantityField}
          disabled={!canWrite || disabled}
          className="h-8 text-center tabular-nums"
          aria-label={VARIANTS_STRINGS.bomLine.quantityAriaLabel}
        />
      </Typography>

      {/* Remove × — hover-red, only when writable. */}
      {canWrite ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--sealing-wax-light)] hover:text-[color:var(--sealing-wax-red)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={VARIANTS_STRINGS.bomLine.removeComponentAriaLabel}
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <div />
      )}
    </li>
  );
}
