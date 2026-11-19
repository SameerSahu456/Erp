import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { ReturnableUnit } from "../../api";
import {
  PURCHASE_RETURN_STRINGS as S,
  type ReturnReasonCode,
} from "./purchase-returns.strings";
import type { ReturnSelections } from "./return-selection";
import { useReturnableUnitFilter } from "../../hooks/purchase-returns/useReturnableUnitFilter";
import { ReturnableUnitRows } from "./ReturnableUnitRows";
import { PurchaseReturnItemsNoMatchRow } from "./PurchaseReturnItemsNoMatchRow";
import { ReturnableUnitToolbar } from "./ReturnableUnitToolbar";

interface Props {
  units: ReturnableUnit[];
  selections: ReturnSelections;
  onToggle: (unit: ReturnableUnit) => void;
  onChangeReason: (stockItemId: string, reasonCode: ReturnReasonCode) => void;
  onChangeNotes: (stockItemId: string, notes: string) => void;
}

export function ReturnableUnitTable({
  units,
  selections,
  onToggle,
  onChangeReason,
  onChangeNotes,
}: Props) {
  const C = S.table.columns;
  const filter = useReturnableUnitFilter(units, selections, onToggle);
  const { visibleUnits, selectableVisible, allSelected, toggleAll } = filter;
  return (
    <TooltipProvider>
      <ReturnableUnitToolbar filter={filter} totalCount={units.length} />

      {/* Inner-scroll past ~10 rows so a large PO doesn't grow the page (§7.7).
          `[&>div]:overflow-visible` neutralises the shared Table's own
          overflow-x wrapper so THIS div is the sole scroll context — that lets
          the sticky header pin to it on vertical scroll. */}
      <div className="max-h-96 overflow-auto [&>div]:overflow-visible">

        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow>
              <TableHead className="w-10">
                {selectableVisible.length > 0 && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label={S.table.selectAllAria}
                  />
                )}
              </TableHead>
              <TableHead>{C.barcode}</TableHead>
              <TableHead>{C.mfrSerial}</TableHead>
              <TableHead>{C.part}</TableHead>
              <TableHead>{C.variant}</TableHead>
              <TableHead>{C.grnBatch}</TableHead>
              {/* Dates right-align like amounts/quantities (§9). */}
              <TableHead className="text-right">{C.received}</TableHead>
              <TableHead>{C.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUnits.length === 0 ? (
              <PurchaseReturnItemsNoMatchRow
                colSpan={8}
                itemSearch={filter.search}
                dispositionFilter={filter.statusFilter}
                onClearSearch={() => filter.setSearch("")}
                onClearFilter={() => filter.setStatusFilter("")}
              />
            ) : (
              visibleUnits.map((unit) => {
                const sel = selections[unit.stock_item_id];
                const selected = sel != null;
                const blocked = !unit.returnable;
                return (
                  <ReturnableUnitRows
                    key={unit.stock_item_id}
                    unit={unit}
                    selection={sel}
                    selected={selected}
                    blocked={blocked}
                    onToggle={onToggle}
                    onChangeReason={onChangeReason}
                    onChangeNotes={onChangeNotes}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
