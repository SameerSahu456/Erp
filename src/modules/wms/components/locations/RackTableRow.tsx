import type { MouseEvent } from "react";
import { ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/currency";

import type { RackSummary, WarehouseLocationTreeNode } from "../../api";
import { useRackBins } from "../../hooks/warehouses/useWarehouseLocations";
import { isOverCapacity, ratioPct } from "./locationModel";
import { LOCATIONS_STRINGS } from "./locations.strings";
import { LocationContentsPanel } from "./LocationContentsPanel";
import { LocationRowMenu } from "./LocationRowMenu";
import { OccupancyBar } from "./OccupancyBar";
import { OverCapacityMark } from "./OverCapacityMark";

const T = LOCATIONS_STRINGS.rackTable;
const ROW = "border-b border-border transition-colors hover:bg-muted/40";
const BAR_HEIGHT = 7;

export interface RackRowActions {
  canManage: boolean;
  onEdit: (target: { id: string; parentRackName?: string }) => void;
  onDelete: (target: { kind: "rack" | "bin"; id: string; name: string }) => void;
}

function ExpandButton({
  isOpen,
  label,
  onClick,
}: {
  isOpen: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-label={label}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50"
    >
      <ChevronRight
        className={cn("size-4 transition-transform duration-150", isOpen && "rotate-90")}
      />
    </button>
  );
}

function UtilisationCell({ occupied, capacity }: { occupied: number; capacity: number }) {
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <OccupancyBar occupied={occupied} capacity={capacity} height={BAR_HEIGHT} solid className="flex-1" />
      <span className="w-11 shrink-0 text-right">
        {isOverCapacity(occupied, capacity) ? (
          <OverCapacityMark variant="helper" />
        ) : (
          <Typography variant="table-figure" asChild>
            <span>{`${ratioPct(occupied, capacity)}%`}</span>
          </Typography>
        )}
      </span>
    </div>
  );
}

/** The cell holding a row's menu; a click on it must not also open the row. */
function MenuCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="w-14 px-2 text-right" onClick={(e) => e.stopPropagation()}>
      {children}
    </td>
  );
}

function BinRow({
  bin,
  rackName,
  isOpen,
  onToggle,
  colSpan,
  actions,
}: {
  bin: WarehouseLocationTreeNode;
  rackName: string;
  isOpen: boolean;
  onToggle: () => void;
  colSpan: number;
  actions: RackRowActions;
}) {
  const capacity = bin.capacity ?? 0;
  const leadingSpan = colSpan - (actions.canManage ? 2 : 1);
  return (
    <>
      <tr className={cn(ROW, "cursor-pointer")} onClick={onToggle}>
        <td colSpan={leadingSpan} className="py-2.5 pr-3 pl-12">
          <div className="flex min-w-0 items-center gap-2">
            <ExpandButton isOpen={isOpen} label={T.expandBin(bin.name)} onClick={onToggle} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <Typography variant="body-strong" tone="info" asChild>
                  <span className="min-w-0">
                    <TruncatedText value={bin.name} className="max-w-full" />
                  </span>
                </Typography>
                {!bin.is_active && (
                  <StatusBadge variant="neutral">{LOCATIONS_STRINGS.rackKind.inactive}</StatusBadge>
                )}
              </div>
              <Typography variant="table-secondary" tone="muted" numeric asChild>
                <p>{T.binSlots(bin.current_occupancy, capacity)}</p>
              </Typography>
            </div>
          </div>
        </td>
        <td className="px-3">
          <UtilisationCell occupied={bin.current_occupancy} capacity={capacity} />
        </td>
        {actions.canManage && (
          <MenuCell>
            <LocationRowMenu
              name={bin.name}
              onEdit={() => actions.onEdit({ id: bin.id, parentRackName: rackName })}
              onDelete={() => actions.onDelete({ kind: "bin", id: bin.id, name: bin.name })}
            />
          </MenuCell>
        )}
      </tr>
      {isOpen && (
        <tr className="border-b border-border bg-muted/40">
          <td colSpan={colSpan} className="p-4">
            <LocationContentsPanel locationId={bin.id} name={bin.name} />
          </td>
        </tr>
      )}
    </>
  );
}

function RackBinRows({
  rack,
  openBinId,
  onToggleBin,
  colSpan,
  actions,
}: {
  rack: RackSummary;
  openBinId: string | null;
  onToggleBin: (binId: string) => void;
  colSpan: number;
  actions: RackRowActions;
}) {
  const binsQ = useRackBins(rack.id, true);
  if (binsQ.isLoading) {
    return (
      <tr className="border-b border-border">
        <td colSpan={colSpan} className="p-3">
          <Skeleton className="h-12 w-full rounded-md" />
        </td>
      </tr>
    );
  }
  const bins = binsQ.data ?? [];
  if (binsQ.isError || bins.length === 0) {
    return (
      <tr className="border-b border-border">
        <td colSpan={colSpan} className="py-4 pr-3 pl-14">
          <Typography variant="helper" tone="muted" asChild>
            <p>{binsQ.isError ? T.binsLoadError : T.noBins}</p>
          </Typography>
        </td>
      </tr>
    );
  }
  return (
    <>
      {bins.map((bin) => (
        <BinRow
          key={bin.id}
          bin={bin}
          rackName={rack.name}
          isOpen={openBinId === bin.id}
          onToggle={() => onToggleBin(bin.id)}
          colSpan={colSpan}
          actions={actions}
        />
      ))}
    </>
  );
}

interface RackTableRowProps {
  rack: RackSummary;
  isOpen: boolean;
  onToggle: () => void;
  openBinId: string | null;
  onToggleBin: (binId: string) => void;
  colSpan: number;
  actions: RackRowActions;
}

/** One rack; opening it shows its bins, or its stock when it stores items itself. */
export function RackTableRow({
  rack,
  isOpen,
  onToggle,
  openBinId,
  onToggleBin,
  colSpan,
  actions,
}: RackTableRowProps) {
  const holdsBins = rack.kind === "with-bins";
  return (
    <>
      <tr className={cn(ROW, "cursor-pointer", !rack.is_active && "opacity-65")} onClick={onToggle}>
        <td className="w-14 px-2 text-center">
          <ExpandButton isOpen={isOpen} label={T.expandRack(rack.name)} onClick={onToggle} />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Typography variant="body-strong" asChild>
              <span className="min-w-0">
                <TruncatedText value={rack.name} className="max-w-[320px]" />
              </span>
            </Typography>
            {!rack.is_active && (
              <StatusBadge variant="neutral">{LOCATIONS_STRINGS.rackKind.inactive}</StatusBadge>
            )}
          </div>
          <Typography variant="table-secondary" tone="muted" asChild>
            <p>
              {holdsBins
                ? LOCATIONS_STRINGS.rackKind.binCount(rack.bin_count)
                : LOCATIONS_STRINGS.rackKind.directStorage}
            </p>
          </Typography>
        </td>
        <td className="px-3 text-right">
          <Typography variant="table-cell" numeric asChild>
            <span>{formatCount(rack.capacity)}</span>
          </Typography>
        </td>
        <td className="px-3 text-right">
          <Typography variant="table-cell" numeric asChild>
            <span>{formatCount(rack.current_occupancy)}</span>
          </Typography>
        </td>
        <td className="px-3">
          <UtilisationCell occupied={rack.current_occupancy} capacity={rack.capacity} />
        </td>
        {actions.canManage && (
          <MenuCell>
            <LocationRowMenu
              name={rack.name}
              onEdit={() => actions.onEdit({ id: rack.id })}
              onDelete={() => actions.onDelete({ kind: "rack", id: rack.id, name: rack.name })}
            />
          </MenuCell>
        )}
      </tr>
      {isOpen && holdsBins && (
        <RackBinRows
          rack={rack}
          openBinId={openBinId}
          onToggleBin={onToggleBin}
          colSpan={colSpan}
          actions={actions}
        />
      )}
      {isOpen && !holdsBins && (
        <tr className="border-b border-border bg-muted/40">
          <td colSpan={colSpan} className="p-4">
            <LocationContentsPanel locationId={rack.id} name={rack.name} />
          </td>
        </tr>
      )}
    </>
  );
}
