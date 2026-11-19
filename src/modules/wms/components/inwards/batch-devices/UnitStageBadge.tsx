import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  workflowStageBadge,
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
} from "../../devices/deviceLabels";
import {
  GRN_LINE_STATUS_VARIANT,
  GRN_LINE_STATUS_LABELS,
} from "../../../constants";
import type { GrnLine } from "../batch-devices-helpers";
import type { BatchDevice } from "./received-row-access";

/** The device's live pipeline stage, else its stock status once out of the pipeline.
 *  Prefers `d` (has vendor-custody detail), falls back to the line's server-resolved stage. */
export function UnitStageBadge({
  l,
  d,
}: {
  l: GrnLine;
  d: BatchDevice | undefined;
}) {
  const stage = d?.workflow_status ?? l.workflow_status;
  if (stage) {
    // Vendor custody reads as the real stage plus the section, e.g. "In Repair · In Display Repair".
    const b = workflowStageBadge(
      stage,
      d?.vendor_prior_workflow_status,
      d?.vendor_section_names,
    );
    return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>;
  }
  const stockStatus = d?.status ?? l.stock_status;
  if (stockStatus) {
    return (
      <StatusBadge variant={DEVICE_STATUS_VARIANT[stockStatus] ?? "neutral"}>
        {DEVICE_STATUS_LABELS[stockStatus] ?? stockStatus}
      </StatusBadge>
    );
  }
  // No device at all (unmatched scan): the GRN verdict is its only status.
  return (
    <StatusBadge variant={GRN_LINE_STATUS_VARIANT[l.status] ?? "neutral"}>
      {GRN_LINE_STATUS_LABELS[l.status] ?? l.status}
    </StatusBadge>
  );
}
