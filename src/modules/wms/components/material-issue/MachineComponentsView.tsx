import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableSearchInput } from "@/components/common/tables/TableSearchInput";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { MachineComponentKind } from "../../api";
import {
  MACHINE_COMPONENTS_PAGE_SIZE,
  useMachineComponentsView,
} from "../../hooks/material-issue/useMachineComponentsView";
import type { LocationParts } from "./removedComponents";
import { ChecklistRunsCard } from "../devices/device-detail/ChecklistRunsCard";
import { MachineComponentsTable } from "./MachineComponentsTable";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

const T = S.componentsTabs;

const KINDS: { id: MachineComponentKind; label: string }[] = [
  { id: "added", label: T.added },
  { id: "removed", label: T.removed },
  { id: "returned", label: T.returned },
];

function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" className={cn("cpt-tab", active && "active")} onClick={onClick}>
      {label}
      <span className={cn("cpt-tab-count", active && "active")}>{count}</span>
    </button>
  );
}

// Tabbed machine components with server-side search + paging; inactive tabs run a slim count.
export function MachineComponentsView({
  materialIssueId,
  machineLineId,
  stockItemId,
  resolveLocation,
  singleKind,
}: {
  materialIssueId: string;
  machineLineId: string;
  /** The unit's stock item — drives the Outward QC checklist tab. */
  stockItemId?: string;
  resolveLocation: (locationId: string | null) => LocationParts;
  // When set, render ONLY this kind with no tab bar. A draft MI has no
  // removed/returned components yet, so its detail shows just "added" directly.
  singleKind?: MachineComponentKind;
}) {
  const v = useMachineComponentsView({ materialIssueId, machineLineId, stockItemId, singleKind });

  function renderBody() {
    // Outward QC checklist — the QC tab's content (not a components table).
    if (v.isQcTab) return <ChecklistRunsCard runs={v.outwardRuns} flat />;
    if (v.rows.length > 0) {
      return <MachineComponentsTable rows={v.rows} cols={v.cols} flat={!!singleKind} resolveLocation={resolveLocation} />;
    }
    let message: string = T.empty;
    if (v.isLoading) message = T.loading;
    else if (v.debouncedSearch) message = T.noMatches;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Typography variant="helper" tone="muted">
          {message}
        </Typography>
        {!v.isLoading && v.debouncedSearch && (
          <Button variant="outline" size="sm" onClick={() => v.setSearch("")}>
            {T.clearSearch}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {/* Tabs — hidden in single-kind mode (draft detail shows added directly). */}
      {!singleKind && (
        <div className="cpt-tabs">
          {KINDS.map((k) => (
            <TabButton
              key={k.id}
              active={v.active === k.id}
              label={k.label}
              count={v.countFor(k.id)}
              onClick={() => v.goTab(k.id)}
            />
          ))}
          {v.qcTabVisible && (
            <TabButton
              active={v.isQcTab}
              label={T.outwardQc}
              count={v.outwardRuns.length}
              onClick={() => v.goTab("outward_qc")}
            />
          )}
        </div>
      )}

      {/* Search — the SAME `.cpt-table-toolbar` band + input as the listing
          pages. Hidden in single-kind mode and on the QC tab. */}
      {!singleKind && !v.isQcTab && (
        <div className="cpt-table-toolbar">
          <TableSearchInput
            value={v.search}
            onChange={v.setSearch}
            placeholder={T.searchPlaceholder}
            className="w-full max-w-xs"
          />
        </div>
      )}

      {renderBody()}

      {/* Pagination — server-driven; only shown when more than one page. */}
      {!v.isQcTab && v.total > MACHINE_COMPONENTS_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <Typography variant="caption" tone="muted" asChild>
            <span>{T.page(v.page, v.totalPages)}</span>
          </Typography>
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={v.page <= 1}
              onClick={() => v.setPage((p) => Math.max(1, p - 1))}
              aria-label={T.prev}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={v.page >= v.totalPages}
              onClick={() => v.setPage((p) => Math.min(v.totalPages, p + 1))}
              aria-label={T.next}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
