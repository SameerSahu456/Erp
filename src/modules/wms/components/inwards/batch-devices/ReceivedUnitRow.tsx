import { useNavigate } from "react-router-dom";

import { TableRow, TableCell } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { BarcodeText } from "@/components/common/display/BarcodeText";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { GrnLine } from "../batch-devices-helpers";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import {
  displayInternalSerial,
  receivedRowAccess,
  receivedRowAssignees,
  receivedRowText,
  type BatchDevice,
  type ReceivedRowAccess,
} from "./received-row-access";
import { UnitStageBadge } from "./UnitStageBadge";
import { AssignEngineerCell } from "./AssignEngineerCell";
import { UnitCorrectionMenu } from "./UnitCorrectionMenu";
import { ReturnKitButton } from "../../kits/ReturnKitDialog";

/** Identity corrections only make sense for PO-sourced units still in an
 *  inspection stage: after it the part, PO line and serial are settled, and
 *  return sources have no PO line to re-identify against. */
function RowActionsCell({
  l,
  d,
  view,
  access,
}: {
  l: GrnLine;
  d: BatchDevice | undefined;
  view: BatchDevicesView;
  access: ReceivedRowAccess;
}) {
  const { inspAssignable, mayCorrectRow, mayFillSerial } = access;
  // Re-identify fits every inward; the serial and PO-line fixes stay PO-only.
  const hasItem = mayCorrectRow || (view.isPoSource && mayFillSerial);
  const showCorrection = !!d && inspAssignable && hasItem;
  return (
    <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
      {showCorrection ? (
        <UnitCorrectionMenu
          l={l}
          isPoSource={view.isPoSource}
          mayFillSerial={mayFillSerial}
          mayCorrectRow={mayCorrectRow}
          onPick={view.setCorrection}
        />
      ) : null}
      {view.isRentalReturn && l.id ? <ReturnKitButton grnLineItemId={l.id} /> : null}
    </TableCell>
  );
}

/** One received unit: serials, variant, condition, live stage, the three
 *  engineer pickers and the identity-correction menu. */
export function ReceivedUnitRow({
  l,
  view,
}: {
  l: GrnLine;
  view: BatchDevicesView;
}) {
  const navigate = useNavigate();
  const d = l.stock_item_id ? view.deviceById[l.stock_item_id] : undefined;
  const access = receivedRowAccess(l, d, view);
  const { warehouseId, may } = access;
  const text = receivedRowText(l);
  const assignees = receivedRowAssignees(l, d);
  const barcode = displayInternalSerial(l);
  // Row click opens the device; the print button and assign dropdowns stop propagation.
  const openDevice = () =>
    l.stock_item_id && navigate(`/wms/devices/${l.stock_item_id}`);
  return (
    <TableRow
      onClick={openDevice}
      className={l.stock_item_id ? "cursor-pointer hover:bg-muted/50" : undefined}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <BarcodeText
          stockItemId={l.stock_item_id ?? undefined}
          model={text.model}
          serial={barcode ?? undefined}
          // A held box with no barcode of ours has nothing to print.
          hidePrint={!barcode}
        >
          {text.internalSerial}
        </BarcodeText>
      </TableCell>
      <TableCell>
        <Typography variant="body" tone="muted">
          <TruncatedSerial value={l.manufacturer_serial} mono={false} />
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body-strong">
          {text.variantName}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body">
          {text.condition}
        </Typography>
      </TableCell>
      <TableCell>
        <UnitStageBadge l={l} d={d} />
      </TableCell>
      <AssignEngineerCell
        stockItemId={l.stock_item_id}
        stage="inspection"
        pool={view.l1l2ByWarehouse[warehouseId] ?? []}
        currentUserId={assignees.inspection.id}
        currentName={assignees.inspection.name}
        mayAssign={may}
        assignable={access.inspAssignable}
        notReadyText="—"
        placeholder={INWARDS_STRINGS.batchDevices.assignEngineerPlaceholder}
      />
      <AssignEngineerCell
        stockItemId={l.stock_item_id}
        stage="repair"
        pool={view.repairByWarehouse[warehouseId] ?? []}
        currentUserId={assignees.repair.id}
        currentName={assignees.repair.name}
        mayAssign={may}
        assignable={access.repairAssignable}
        notReadyText={INWARDS_STRINGS.batchDevices.assignRepairNotReady}
        placeholder={INWARDS_STRINGS.batchDevices.assignRepairEngineerPlaceholder}
      />
      <AssignEngineerCell
        stockItemId={l.stock_item_id}
        stage="qc"
        pool={view.qcByWarehouse[warehouseId] ?? []}
        currentUserId={assignees.qc.id}
        currentName={assignees.qc.name}
        mayAssign={may}
        assignable={access.qcAssignable}
        notReadyText={INWARDS_STRINGS.batchDevices.assignQcNotReady}
        placeholder={INWARDS_STRINGS.batchDevices.assignQcEngineerPlaceholder}
      />
      <RowActionsCell l={l} d={d} view={view} access={access} />
    </TableRow>
  );
}
