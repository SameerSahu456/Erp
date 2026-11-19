import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { useNumberField } from "@/hooks/use-number-field";
import type { UnitSelectionState } from "../../hooks/stock-transfer/useUnitSelection";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

/** Per-variant quantity input; a component so the number-field hook runs at top level. */
function VariantQtyInput({
  qty,
  max,
  onQtyChange,
}: {
  qty: number;
  max: number;
  onQtyChange: (next: number) => void;
}) {
  const qtyField = useNumberField(qty, onQtyChange, { max });
  return <Input {...qtyField} className="w-24 shrink-0" />;
}

/** Variant mode: one row per variant with a quantity, resolved to serials. */
export function VariantQtyList({ selection }: { selection: UnitSelectionState }) {
  return (
    <div className="space-y-2">
      {selection.variantGroups.map((g) => (
        <div key={g.variantId} className="flex items-center gap-3 rounded-md border p-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <Typography variant="body-strong" truncate>
                {g.label}
              </Typography>
              {g.condition ? (
                <Badge variant="secondary" className="shrink-0">
                  {g.condition}
                </Badge>
              ) : null}
            </div>
            <Typography variant="caption" tone="muted" truncate>
              {[g.sku, S.availableCount(g.units.length)].filter(Boolean).join(" · ")}
            </Typography>
          </div>
          <VariantQtyInput
            qty={selection.variantQty[g.variantId] ?? 0}
            max={g.units.length}
            onQtyChange={(n) => selection.applyVariantQty(g.variantId, n)}
          />
        </div>
      ))}
      <Typography variant="helper" tone="muted">
        {S.quantityHelp}
      </Typography>
    </div>
  );
}
