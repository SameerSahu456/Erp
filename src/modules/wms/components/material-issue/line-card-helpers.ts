import type { MaterialIssueLineResponse, MaterialIssueStage } from "../../api";

/** Stage gates for one machine line in the detail view. */
export function lineStageFlags(line: MaterialIssueLineResponse) {
  const stage = line.stage as MaterialIssueStage;
  const isPrimary = line.role === "primary";
  return {
    isPrimary,
    // Outward QC only runs on a primary still in the build (issued / qc_failed).
    qcStage: isPrimary && (stage === "issued" || stage === "qc_failed"),
    // An issued machine (still in the engineer's custody) gets the inline
    // Issued-Components editor — add a part onto it, or pull one back into stock.
    showComponentsPanel:
      isPrimary &&
      (stage === "issued" || stage === "qc_failed" || stage === "ready_for_dispatch"),
  };
}

/** Return mode always has a body (the return checklist); QC-only engineers get
 *  no body at all — just the header's View device + Outward QC. */
export function lineHasBody(input: {
  qcOnly: boolean;
  returnActive: boolean;
  showComponentsPanel: boolean;
  itemCounts: number[];
}): boolean {
  return (
    !input.qcOnly &&
    (input.returnActive ||
      input.showComponentsPanel ||
      input.itemCounts.some((n) => n > 0))
  );
}
