import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { AsyncSelect } from "@/components/ui/async-select";
import { useDestinationWarehouseOptions } from "../../hooks/stock-transfer/useDestinationWarehouseOptions";
import type { MoveStockState } from "../../hooks/stock-transfer/useMoveStock";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

/** Destination warehouse — the control the relocate/transfer mode is derived
 *  from. The source warehouse reads as the first ("stay here") row. */
export function MoveStockDestinationPicker({ move }: { move: MoveStockState }) {
  const { source, destination, isTransfer } = move;
  const useOptions = useDestinationWarehouseOptions(source.id);
  const stayHereLabel = source.name || S.sameWarehouseOption;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="mv-warehouse">{S.destinationWarehouseLabel}</Label>
        {/* An explicit unset: the dropdown's first option already means
            "stay here", but a clear affordance says so plainly once a
            far-warehouse destination is chosen. */}
        {isTransfer ? (
          <button
            type="button"
            onClick={() => destination.change(null)}
            className="inline-flex items-center gap-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            <Typography variant="helper" tone="inherit">
              {S.clearDestination}
            </Typography>
          </button>
        ) : null}
      </div>
      <AsyncSelect<{ id: string; label: string }>
        id="mv-warehouse"
        value={isTransfer ? { id: destination.id, label: destination.name } : null}
        onValueChange={(next) =>
          destination.change(next ? { id: next.id, name: next.label } : null)
        }
        useOptions={useOptions}
        toLabel={(o) => o.label}
        // Picking the source warehouse is the "stay here" (relocate) choice.
        allOption={stayHereLabel}
        placeholder={stayHereLabel}
        searchable
        searchPlaceholder={S.destinationWarehouseLabel}
        loadOnOpen
      />
    </div>
  );
}
