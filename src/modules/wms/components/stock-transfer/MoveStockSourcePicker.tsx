import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { useWarehouse } from "../../hooks/warehouses/useWarehouses";
import type { MoveStockState } from "../../hooks/stock-transfer/useMoveStock";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

/** A warehouse's name by id. Never the raw id (§0.18) — an ellipsis while
 *  the record loads. */
function WarehouseName({ id }: { id: string }) {
  const { data } = useWarehouse(id);
  return <>{data?.name ?? S.warehouseNameLoading}</>;
}

/** Which warehouse to move FROM — only shown when the stock spans several. */
export function MoveStockSourcePicker({ source }: { source: MoveStockState["source"] }) {
  if (source.ids.length <= 1) return null;
  return (
    <div className="space-y-2">
      <Label htmlFor="mv-source">{S.sourceWarehouseLabel}</Label>
      <Select value={source.id} onValueChange={(v) => source.change(v ?? "")}>
        <SelectTrigger id="mv-source" className="w-full">
          <SelectValue placeholder={S.sourceWarehouseLabel}>
            {source.name || S.sourceWarehouseLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {source.ids.map((id) => (
            <SelectItem key={id} value={id}>
              <WarehouseName id={id} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Typography variant="helper" tone="muted">
        {S.sourceWarehouseHelp}
      </Typography>
    </div>
  );
}
