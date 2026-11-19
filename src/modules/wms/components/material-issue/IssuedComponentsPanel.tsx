import { cn } from "@/lib/utils";

import type { MaterialIssueLineResponse } from "../../api";
import { useIssuedComponentsPanel } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { MachineComponentsView } from "./MachineComponentsView";
import type { LocationParts } from "./removedComponents";
import { AddComponentsSection } from "./AddComponentsSection";
import { PullOutComponentsSection } from "./PullOutComponentsSection";
import {
  IssuedComponentsCommitBar,
  IssuedComponentsError,
} from "./IssuedComponentsCommitBar";

// The inline "Issued Components" editor for one issued machine. Adds/removes are
// STAGED locally; nothing hits the API until "Save changes" — which commits all
// staged adds in one batched top-up, then the staged removes (pull-outs).
export function IssuedComponentsPanel({
  materialIssueId,
  warehouseId,
  machine,
  variantLabel,
  allowAdd,
  resolveLocation,
}: {
  materialIssueId: string;
  warehouseId: string;
  machine: MaterialIssueLineResponse;
  variantLabel: (variantId: string) => string;
  /** Adding parts is only offered while assembling (issued / qc_failed); a
   *  ready-for-dispatch machine shows the Pull-Out side alone. */
  allowAdd: boolean;
  resolveLocation: (locationId: string | null) => LocationParts;
}) {
  const { add, rm, commit } = useIssuedComponentsPanel({
    materialIssueId,
    machine,
    variantLabel,
  });

  return (
    <div className="space-y-5 p-4">
      {/* Editors on top: Add (only while assembling) · Pull Out. Single-column
          when Add is hidden (ready-for-dispatch). */}
      <div
        className={cn(
          "grid gap-6",
          allowAdd && "lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border",
        )}
      >
        {allowAdd && <AddComponentsSection add={add} warehouseId={warehouseId} />}
        <PullOutComponentsSection
          rm={rm}
          warehouseId={warehouseId}
          besideAdd={allowAdd}
        />
      </div>

      <IssuedComponentsError commit={commit} />
      <IssuedComponentsCommitBar commit={commit} />

      {/* The machine's components — tabbed (Added · Removed · Returned),
          searchable and paginated from the backend. Shown under the editors. */}
      <MachineComponentsView
        materialIssueId={materialIssueId}
        machineLineId={machine.id}
        stockItemId={machine.stock_item_id ?? undefined}
        resolveLocation={resolveLocation}
      />
    </div>
  );
}
