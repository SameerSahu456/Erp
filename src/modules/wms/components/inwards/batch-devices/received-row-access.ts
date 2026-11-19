import { EMPTY_VALUE } from "@/shared/constants";

import { correctionStageForWorkflow } from "../../devices/device-detail/helpers";
import type { GrnLine } from "../batch-devices-helpers";
import { CONDITION_LABELS } from "../../../constants/condition";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";

export type BatchDevice = BatchDevicesView["deviceById"][string];

type RowAccessPredicates = Pick<
  BatchDevicesView,
  "canAssign" | "canCorrectDevice" | "canStage"
>;

// Assignable only while it is the live stage (backend needs a live op); same
// resolution as the badge. Repair mirrors the Devices hub (in repair or waiting on spares).
const INSP_LIVE = new Set(["pending_inspection", "under_inspection"]);
const REPAIR_LIVE = new Set(["in_repair", "waiting_for_spares"]);
const QC_LIVE = new Set(["pending_qc", "under_qc"]);

// Filling a blank serial follows the current stage; every other correction is manager-tier.
function canFillSerial(
  l: GrnLine,
  d: BatchDevice | undefined,
  ctx: { wf: string; warehouseId: string; mayCorrectRow: boolean },
  access: RowAccessPredicates,
) {
  if (l.manufacturer_serial) return false;
  if (ctx.mayCorrectRow) return true;
  const benchStage = correctionStageForWorkflow(ctx.wf);
  return !!d && benchStage !== null && access.canStage(benchStage, ctx.warehouseId);
}

/** Per-row assignment + correction gating for one received unit. Pure — the
 *  access predicates come from useWmsStageAccess via the page hook. */
export function receivedRowAccess(
  l: GrnLine,
  d: BatchDevice | undefined,
  access: RowAccessPredicates,
) {
  // Fall back to the line's warehouse when the device record is absent.
  const warehouseId = d?.warehouse_id ?? l.warehouse_id ?? "";
  const wf = d?.workflow_status ?? l.workflow_status ?? "";
  const may = warehouseId ? access.canAssign(warehouseId) : false;
  const mayCorrectRow = warehouseId
    ? access.canCorrectDevice(warehouseId)
    : false;
  return {
    warehouseId,
    may,
    inspAssignable: INSP_LIVE.has(wf),
    repairAssignable: REPAIR_LIVE.has(wf),
    qcAssignable: QC_LIVE.has(wf),
    mayCorrectRow,
    mayFillSerial: canFillSerial(l, d, { wf, warehouseId, mayCorrectRow }, access),
  };
}

export type ReceivedRowAccess = ReturnType<typeof receivedRowAccess>;

/** The row's barcode: the linked stock unit's own when there is one (a held
 *  box brought into stock gets a fresh barcode), else the line's. A held box
 *  with no barcode of ours keeps its scanned maker's serial in the line's
 *  internal serial only because that column cannot be empty — that copy is
 *  not a barcode, so it is not shown (null). */
export function displayInternalSerial(l: GrnLine): string | null {
  if (l.stock_internal_serial) return l.stock_internal_serial;
  const copied =
    !l.stock_item_id && !!l.manufacturer_serial && l.internal_serial === l.manufacturer_serial;
  return copied ? null : l.internal_serial || null;
}

/** Display text for a received row's serial / variant / condition cells. */
export function receivedRowText(l: GrnLine) {
  const pv = l.part_variant;
  return {
    model: pv?.part_name ?? "",
    internalSerial: displayInternalSerial(l) ?? EMPTY_VALUE,
    variantName: pv?.name ?? pv?.sku_code ?? EMPTY_VALUE,
    condition: pv?.condition
      ? (CONDITION_LABELS[pv.condition] ?? pv.condition)
      : EMPTY_VALUE,
  };
}

/** Current stage assignees — the device record wins over the GRN line. The line
 *  carries only inspection + QC assignees; repair comes from the device. */
export function receivedRowAssignees(l: GrnLine, d: BatchDevice | undefined) {
  return {
    inspection: {
      id: d?.inspection_assignee_id ?? l.inspection_assignee_id,
      name: d?.inspection_assignee_name ?? l.inspection_assignee_name,
    },
    repair: { id: d?.repair_assignee_id, name: d?.repair_assignee_name },
    qc: {
      id: d?.qc_assignee_id ?? l.qc_assignee_id,
      name: d?.qc_assignee_name ?? l.qc_assignee_name,
    },
  };
}
