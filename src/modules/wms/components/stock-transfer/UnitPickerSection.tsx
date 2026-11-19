import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { UnitSelectionState } from "../../hooks/stock-transfer/useUnitSelection";
import { STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";
import { SELECT_MODES, type MovableUnit } from "./move-stock-helpers";
import { MovableUnitRow } from "./MovableUnitRow";
import { VariantQtyList } from "./VariantQtyList";

function ModeToggle({ selection }: { selection: UnitSelectionState }) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-input bg-muted/50 p-0.5">
      {SELECT_MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => selection.setMode(m)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 transition-colors",
            selection.mode === m
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Typography variant="helper" tone="inherit">
            {m === "serial" ? S.modeSerial : S.modeVariant}
          </Typography>
        </button>
      ))}
    </div>
  );
}

function UnitSearch({ selection }: { selection: UnitSelectionState }) {
  return (
    <div className="relative">
      <Input
        placeholder={S.searchPlaceholder}
        value={selection.search}
        onChange={(e) => selection.setSearch(e.target.value)}
        className="pr-8"
      />
      {selection.search ? (
        <button
          type="button"
          onClick={() => selection.setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={S.clearSearch}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

interface UnitListProps {
  pool: MovableUnit[];
  selection: UnitSelectionState;
  isTransfer: boolean;
}

function UnitList({ pool, selection, isTransfer }: UnitListProps) {
  if (pool.length === 0) {
    return (
      <Typography variant="helper" tone="muted" className="p-3">
        {S.emptyUnits}
      </Typography>
    );
  }
  if (selection.filtered.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 p-3">
        <Typography variant="helper" tone="muted">
          {S.noSearchMatch}
        </Typography>
        <Button variant="outline" size="sm" onClick={() => selection.setSearch("")}>
          {S.clearSearch}
        </Button>
      </div>
    );
  }
  return (
    <>
      {selection.filtered.map((u) => (
        <MovableUnitRow
          key={u.id}
          unit={u}
          checked={selection.selected.has(u.id)}
          isTransfer={isTransfer}
          onToggle={selection.toggle}
        />
      ))}
    </>
  );
}

/** Unit selection — summary, serial/variant mode, and the unit list. */
export function UnitPickerSection({ pool, selection, isTransfer }: UnitListProps) {
  const { selectableFiltered, allFilteredSelected } = selection;
  return (
    <div className="space-y-2 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <Typography variant="body-strong" asChild>
          <span>{S.selectedSummary(selection.selected.size)}</span>
        </Typography>
        <ModeToggle selection={selection} />
      </div>

      {selection.mode === "variant" ? (
        <VariantQtyList selection={selection} />
      ) : (
        <UnitSearch selection={selection} />
      )}

      {/* The list stays visible in BOTH modes so the operator always
          sees which serials the machine chose. */}
      {/* Only worth a summary when there is more than one unit — with a
          single blocked serial the row's own reason says it all. */}
      {selection.restartingInspection > 0 && pool.length > 1 ? (
        <Typography variant="helper" tone="warning" className="pb-2">
          {S.transferRestartsInspectionCount(selection.restartingInspection)}
        </Typography>
      ) : null}
      {/* Select-all over the CURRENT FILTER, not the whole pool: with a
          receipt of hundreds of units, ticking them one by one is not a
          workflow, and "all" after a search should mean the matches the
          operator is looking at. */}
      {selectableFiltered.length > 1 ? (
        <button
          type="button"
          onClick={selection.toggleAllFiltered}
          className="px-1 pb-1 text-left"
        >
          <Typography variant="helper" tone={allFilteredSelected ? "primary" : "muted"}>
            {allFilteredSelected
              ? S.clearSelection(selectableFiltered.length)
              : S.selectAll(selectableFiltered.length)}
          </Typography>
        </button>
      ) : null}
      <div className="max-h-56 overflow-y-auto rounded-md border">
        <UnitList pool={pool} selection={selection} isTransfer={isTransfer} />
      </div>
    </div>
  );
}
