import { MachineComponentsView } from "./MachineComponentsView";
import type { LocationParts } from "./removedComponents";
import type { MaterialIssueLineResponse } from "../../api";
import { MachineReturnSection } from "./MachineReturnSection";
import { IssuedComponentsPanel } from "./IssuedComponentsPanel";
import { ReplacedPartPrompt } from "./ReplacedPartPrompt";
import type { LineLabels } from "./material-issue-detail-helpers";

interface LineCardBodyProps {
  line: MaterialIssueLineResponse;
  labels: LineLabels;
  materialIssueId: string;
  warehouseId: string;
  resolveLocation: (locationId: string | null) => LocationParts;
  isDraft: boolean;
  /** Return mode on a primary machine → its return checklist. */
  returnMode: boolean;
  showComponentsPanel: boolean;
}

export function LineCardBody({
  line,
  labels,
  materialIssueId,
  warehouseId,
  resolveLocation,
  isDraft,
  returnMode,
  showComponentsPanel,
}: LineCardBodyProps) {
  if (returnMode) {
    // The body becomes this machine's return checklist — machine on top, its
    // components beneath it, each with a location.
    return (
      <div className="border-t border-border">
        <MachineReturnSection machine={line} />
      </div>
    );
  }
  if (showComponentsPanel) {
    // Adding parts only fits while the build is assembled (issued / qc_failed);
    // a ready-for-dispatch machine can still shed parts but not take new ones.
    const allowAdd =
      line.role === "primary" &&
      (line.stage === "issued" || line.stage === "qc_failed");
    // The panel owns component add/remove AND the fitted list for an issued
    // machine, so nested component rows are not repeated here.
    return (
      <div className="border-t border-border">
        <ReplacedPartPrompt line={line} />
        <IssuedComponentsPanel
          materialIssueId={materialIssueId}
          warehouseId={warehouseId}
          machine={line}
          variantLabel={labels.variant}
          allowAdd={allowAdd}
          resolveLocation={resolveLocation}
        />
      </div>
    );
  }
  // Terminal states (dispatched / returned): the same tabbed components view, no
  // editors. A draft has no removed / returned units yet, so it shows added parts only.
  return (
    <div className="border-t border-border p-4">
      <MachineComponentsView
        materialIssueId={materialIssueId}
        machineLineId={line.id}
        stockItemId={line.stock_item_id ?? undefined}
        resolveLocation={resolveLocation}
        singleKind={isDraft ? "added" : undefined}
      />
    </div>
  );
}
