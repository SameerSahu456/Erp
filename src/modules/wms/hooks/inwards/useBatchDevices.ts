import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useNavigateBack } from "@/hooks/use-navigate-back";
import { useRecordLabel } from "@shared/routing/record-label";
import { asUuid } from "@shared/lib/validation";
import { usePermission } from "@shared/rbac";
import { useVariantsByIds } from "@modules/ims";

import { useGrnBatch } from "./useInwards";
import { useAllBatchDevices } from "../devices/useDevices";
import { useWmsStageAccess } from "../operations/useStageAccess";
import { wmsCan } from "../../permissions";
import {
  unnamedVariantIds,
  type GrnLine,
} from "../../components/inwards/batch-devices-helpers";
import {
  deriveBatchView,
  filterReceivedLines,
  type UnitCorrection,
} from "../../components/inwards/batch-devices/batch-view-helpers";
import {
  batchFacts,
  useBatchActions,
  useBatchAssignPools,
  useBatchListState,
  useBatchParkUnits,
} from "./useBatchDevicesParts";

/** Live names for off-PO + description-line staged parts that predate
 *  label-stashing on create. */
function useOffPoVariantInfo(offIds: string[]) {
  const offVariantQueries = useVariantsByIds(offIds);
  // Stable key over the resolved variant ids so the memo recomputes as queries land.
  const offVariantDataKey = offVariantQueries.map((q) => q.data?.id).join(",");
  return useMemo(() => {
    const m: Record<string, { name: string; sku_code: string }> = {};
    offVariantQueries.forEach((q, i) => {
      const v = q.data;
      if (v) m[offIds[i]] = { name: v.name ?? "", sku_code: v.sku_code ?? "" };
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offIds, offVariantDataKey]);
}

/** All state, queries, derived maps and handlers for the GRN batch detail page
 *  (BatchDevicesBody). The body and its sections stay presentational. */
export function useBatchDevices() {
  // §11.1 — the route `:id` is untrusted; a malformed id becomes '' so every
  // query stays disabled and the not-found state renders (no 422).
  const { id: rawId = "" } = useParams<{ id: string }>();
  const id = asUuid(rawId) ?? "";
  const label = useRecordLabel();
  const goBack = useNavigateBack("/wms/inward");

  const batchQuery = useGrnBatch(id);
  const batch = batchQuery.data;
  const actions = useBatchActions(id);
  const canManageInward = usePermission().can(wmsCan.inwardManage);

  const facts = batchFacts(batch);
  const { isCompletedBatch, batchWarehouseId } = facts;

  const list = useBatchListState(id);
  const { unitSearch, receivedPage, stagedPage, pageSize } = list;

  const offIds = useMemo(() => unnamedVariantIds(batch), [batch]);
  const variantInfoById = useOffPoVariantInfo(offIds);

  const lines = useMemo<GrnLine[]>(() => batch?.lines ?? [], [batch]);

  // Devices only exist once the batch is finalized, so skip the call otherwise.
  const { items: deviceItems } = useAllBatchDevices(id, {
    enabled: isCompletedBatch,
  });
  const park = useBatchParkUnits(deviceItems);
  // Gating reads the app-wide WarehouseScopeProvider — no fetch here.
  const { canAssign, canCorrectDevice, canStage, isManager } =
    useWmsStageAccess();

  // One dialog per kind for the whole table, not per row.
  const [correction, setCorrection] = useState<UnitCorrection | null>(null);
  const pools = useBatchAssignPools(
    batchWarehouseId,
    isManager && isCompletedBatch,
  );

  const filteredLines = useMemo(
    () => filterReceivedLines(lines, unitSearch),
    [lines, unitSearch],
  );

  const derived = batch
    ? deriveBatchView({
        batch,
        lines,
        filteredLines,
        variantInfoById,
        unitSearch,
        receivedPage,
        stagedPage,
        pageSize,
      })
    : null;

  return {
    id,
    label,
    goBack,
    batchQuery,
    derived,
    lines,
    finalize: actions.finalize,
    cancel: actions.cancel,
    canManageInward,
    isPoSource: facts.isPoSource,
    isRentalReturn: facts.isRentalReturn,
    sourceVendorName: facts.sourceVendorName,
    sourceEta: facts.sourceEta,
    isCompletedBatch,
    batchWarehouseId,
    collapsedModels: list.collapsedModels,
    toggleModel: list.toggleModel,
    unitSearch,
    onSearch: list.onSearch,
    filteredLines,
    setReceivedPage: list.setReceivedPage,
    setStagedPage: list.setStagedPage,
    pageSize,
    setPageSize: list.setPageSize,
    parkOpen: park.parkOpen,
    setParkOpen: park.setParkOpen,
    parkUnits: park.parkUnits,
    parkWarehouseId: park.parkWarehouseId,
    deviceById: park.deviceById,
    canAssign,
    canCorrectDevice,
    canStage,
    correction,
    setCorrection,
    l1l2ByWarehouse: pools.l1l2ByWarehouse,
    qcByWarehouse: pools.qcByWarehouse,
    repairByWarehouse: pools.repairByWarehouse,
    handleFinalize: actions.handleFinalize,
    handleCancelBatch: actions.handleCancelBatch,
  };
}

export type BatchDevicesView = ReturnType<typeof useBatchDevices>;
