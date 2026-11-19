import { useMemo, useState } from "react";

import {
  pullOutsForMachine,
  returnedUnitsForMachine,
  type LocationParts,
} from "./removedComponents";
import type {
  MaterialIssueLineResponse,
  MaterialIssuePullOutUnit,
} from "../../api";
import { useReturnWorkspace } from "./returnWorkspaceContext";
import { useWmsStageAccess } from "../../hooks/operations/useStageAccess";
import type { LineLabels } from "./material-issue-detail-helpers";
import { LineCardHeader } from "./LineCardHeader";
import { LineCardBody } from "./LineCardBody";
import { lineHasBody, lineStageFlags } from "./line-card-helpers";

export function LineCard({
  line,
  labels,
  onQc,
  materialIssueId,
  warehouseId,
  pullOuts,
  resolveLocation,
  defaultOpen = false,
  openAll = null,
  isDraft = false,
  qcOnly = false,
}: {
  line: MaterialIssueLineResponse;
  labels: LineLabels;
  onQc: (line: MaterialIssueLineResponse) => void;
  materialIssueId: string;
  warehouseId: string;
  pullOuts: MaterialIssuePullOutUnit[];
  resolveLocation: (locationId: string | null) => LocationParts;
  defaultOpen?: boolean;
  /** The page's Show all / Collapse all; a new object opens or closes this card. */
  openAll?: { open: boolean } | null;
  isDraft?: boolean;
  /** QC-only engineer: keep just the header (View device + Outward QC) and hide
   *  the machine's body entirely — no components panel, return section, or list. */
  qcOnly?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { active: returnActive } = useReturnWorkspace();
  const { canOutwardQc } = useWmsStageAccess();
  const { isPrimary, qcStage, showComponentsPanel } = lineStageFlags(line);
  // This machine's pulled-out parts (its own unit or any component).
  const machinePullOuts = useMemo(
    () => pullOutsForMachine(line, pullOuts),
    [line, pullOuts],
  );
  const returnedUnits = useMemo(() => returnedUnitsForMachine(line), [line]);
  // Outward QC inspects the ASSEMBLED machine, never a component alone (backend
  // MI_OUTWARD_QC_PRIMARY_ONLY); hidden in return mode. canOutwardQc mirrors the grant.
  const qcVisible = qcStage && !returnActive && canOutwardQc(warehouseId);
  const hasBody = lineHasBody({
    qcOnly,
    returnActive,
    showComponentsPanel,
    itemCounts: [
      (line.components ?? []).length,
      machinePullOuts.length,
      returnedUnits.length,
    ],
  });
  // Entering return mode auto-opens the checklist; synced during render (React's
  // "adjust state on prop change" pattern) so it lands in the same commit.
  const [prevOpenAll, setPrevOpenAll] = useState(openAll);
  if (openAll !== prevOpenAll) {
    setPrevOpenAll(openAll);
    if (openAll) setOpen(openAll.open);
  }
  const [prevReturnActive, setPrevReturnActive] = useState(returnActive);
  if (returnActive !== prevReturnActive) {
    setPrevReturnActive(returnActive);
    if (returnActive) setOpen(true);
  }
  const bodyOpen = open;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <LineCardHeader
        line={line}
        labels={labels}
        hasBody={hasBody}
        open={bodyOpen}
        onToggle={() => hasBody && setOpen((o) => !o)}
        qcVisible={qcVisible}
        onQc={onQc}
      />

      {bodyOpen && hasBody && (
        <LineCardBody
          line={line}
          labels={labels}
          materialIssueId={materialIssueId}
          warehouseId={warehouseId}
          resolveLocation={resolveLocation}
          isDraft={isDraft}
          returnMode={returnActive && isPrimary}
          showComponentsPanel={showComponentsPanel}
        />
      )}
    </div>
  );
}
