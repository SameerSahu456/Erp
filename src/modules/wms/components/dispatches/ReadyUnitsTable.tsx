import { Checkbox } from "@/components/ui/checkbox";
import { Typography } from "@/components/ui/typography";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { cn } from "@/lib/utils";

import type { DispatchReadyUnit } from "../../api/dispatch";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";

interface ReadyUnitsTableProps {
  units: DispatchReadyUnit[];
  selectedIds: Set<string>;
  onToggle: (materialIssueItemId: string) => void;
  onToggleAll: () => void;
}

// Shared column template — mirrors the Inward step-2 line table's bordered
// rounded grid (checkbox · serial · variant · MI · components), so both step-2
// pages read as the same component.
const ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_5rem] items-center gap-3 px-3 py-2";

/** Selection table of ready-for-dispatch primary units. Each row shows the
 *  primary's serial + variant + MI number and a count of its copied components
 *  (which ship with the primary automatically). */
export function ReadyUnitsTable({
  units,
  selectedIds,
  onToggle,
  onToggleAll,
}: ReadyUnitsTableProps) {
  const allSelected = units.length > 0 && selectedIds.size === units.length;

  return (
    <div className="overflow-hidden rounded-md border">
      {/* Selection toolbar — Select-all on the left, live count on the right,
          attached directly to the rows it summarizes. */}
      <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
        <label className="flex cursor-pointer select-none items-center gap-2">
          <Checkbox
            aria-label={S.selectAll}
            checked={allSelected}
            onCheckedChange={onToggleAll}
          />
          <Typography variant="caption" tone="muted">
            {S.selectAll}
          </Typography>
        </label>
        <span
          className={cn(
            "inline-flex shrink-0 items-baseline gap-1 rounded-full px-2.5 py-0.5",
            selectedIds.size > 0 ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Typography
            variant="body-strong"
            numeric
            tone={selectedIds.size > 0 ? "primary" : "muted"}
          >
            {selectedIds.size}
          </Typography>
          <Typography
            variant="caption"
            tone={selectedIds.size > 0 ? "primary" : "muted"}
          >
            {S.selectedSuffix}
          </Typography>
        </span>
      </div>

      {/* Column labels */}
      <div className={cn(ROW_GRID, "border-b bg-muted/10")}>
        <span />
        <Typography variant="caption" tone="muted">
          {S.colSerial}
        </Typography>
        <Typography variant="caption" tone="muted">
          {S.colVariant}
        </Typography>
        <Typography variant="caption" tone="muted">
          {S.colMi}
        </Typography>
        <Typography variant="caption" tone="muted" className="text-right">
          {S.colComponents}
        </Typography>
      </div>

      {/* Body rows */}
      {units.map((u) => {
        const checked = selectedIds.has(u.material_issue_item_id);
        return (
          <div
            key={u.material_issue_item_id}
            data-checked={checked}
            className={cn(
              ROW_GRID,
              "border-b last:border-b-0",
              checked && "bg-primary/5",
            )}
          >
            <Checkbox
              aria-label={u.serial_number}
              checked={checked}
              onCheckedChange={() => onToggle(u.material_issue_item_id)}
            />
            <Typography variant="mono">
              <TruncatedSerial value={u.serial_number} className="max-w-full" mono={false} />
            </Typography>
            <Typography variant="body" truncate>
              {u.variant_name || S.none}
            </Typography>
            <Typography variant="mono" tone="muted" truncate>
              {u.mi_number}
            </Typography>
            <Typography variant="caption" tone="muted" className="text-right">
              {u.components.length > 0
                ? S.componentsCount(u.components.length)
                : S.none}
            </Typography>
          </div>
        );
      })}
    </div>
  );
}
