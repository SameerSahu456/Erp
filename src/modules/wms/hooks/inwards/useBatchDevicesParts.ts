// Concern-sized hooks composed by `useBatchDevices` (list state · park units ·
// assign pools · finalize/cancel actions).
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMemoryState } from "@/shared/hooks/useMemoryState";

import { WMS_PAGE_SIZE } from "../../constants";

import { useFinalizeGrnBatch, useCancelGrnBatch } from "./useInwards";
import { type useAllBatchDevices } from "../devices/useDevices";
import { useAssignPoolsByWarehouse } from "../devices/useAssignPools";
import { duplicateSerialFromError } from "../../inwardErrors";
import type { GrnBatchResponse } from "../../api";
import type { MovableUnit } from "../../components/stock-transfer/move-stock-helpers";
import { isLocationAssignable } from "../../components/inwards/batch-devices-helpers";

type BatchDevice = ReturnType<typeof useAllBatchDevices>["items"][number];

/** Collapsed models + the shared search box and both table pagers. */
export function useBatchListState(id: string) {
  const [collapsedModels, setCollapsedModels] = useState<
    Record<string, boolean>
  >({});
  // Search + page in section memory so Back from a device keeps the list as left (PAGE-UI §1.1-B).
  const [unitSearch, setUnitSearch] = useMemoryState(
    `wms-inward-details:${id}:search`,
    "",
  );
  // Both tables page over data already in the batch GET.
  const [receivedPage, setReceivedPage] = useMemoryState(
    `wms-inward-details:${id}:receivedPage`,
    1,
  );
  const [stagedPage, setStagedPage] = useMemoryState(
    `wms-inward-details:${id}:stagedPage`,
    1,
  );
  // One page size for both tables — only one of them shows at a time.
  const [pageSize, setPageSizeValue] = useMemoryState(
    `wms-inward-details:${id}:pageSize`,
    WMS_PAGE_SIZE,
  );
  // One search box drives both tables; reset both pagers when the query changes
  // so a filtered result never lands the viewer on a now-empty page.
  const onSearch = (v: string) => {
    setUnitSearch(v);
    setReceivedPage(1);
    setStagedPage(1);
  };
  const setPageSize = (size: number) => {
    setPageSizeValue(size);
    setReceivedPage(1);
    setStagedPage(1);
  };
  const toggleModel = (model: string) =>
    setCollapsedModels((prev) => ({ ...prev, [model]: !prev[model] }));

  return {
    collapsedModels,
    toggleModel,
    unitSearch,
    onSearch,
    receivedPage,
    setReceivedPage,
    stagedPage,
    setStagedPage,
    pageSize,
    setPageSize,
  };
}

/** Park the batch: received units have no location yet, and placement is allowed at any stage. */
export function useBatchParkUnits(deviceItems: BatchDevice[]) {
  const [parkOpen, setParkOpen] = useState(false);
  const parkUnits: MovableUnit[] = useMemo(
    () =>
      deviceItems
        // Only units still in a warehouse at a location-assignable stage.
        .filter((d) => !!d.warehouse_id && isLocationAssignable(d))
        .map((d) => ({
          id: d.id,
          status: d.status ?? null,
          internalSerial: d.internal_serial,
          // Without the variant id every unit collapses into one "unknown"
          // group, so "Select by variant" could only ever show a single row.
          variantPartId: d.part_variant_id ?? undefined,
          variantLabel: d.part_variant_name ?? null,
          // Current Rack / Bin; null (no location yet) renders "Unassigned". (CP-444)
          locationName:
            [d.parent_location_name, d.location_name].filter(Boolean).join(" / ") || null,
        }))
        // Serials are zero-padded, so lexical order is numeric order — show them
        // in sequence rather than the API's default last-touched order.
        .sort((a, b) => a.internalSerial.localeCompare(b.internalSerial)),
    [deviceItems],
  );
  const parkWarehouseId =
    deviceItems.find((d) => !!d.warehouse_id)?.warehouse_id ?? "";

  const deviceById = useMemo(() => {
    const m: Record<string, BatchDevice> = {};
    for (const d of deviceItems) m[d.id] = d;
    return m;
  }, [deviceItems]);

  return { parkOpen, setParkOpen, parkUnits, parkWarehouseId, deviceById };
}

/** All batch devices land in one warehouse, so assign pools key off the batch. */
export function useBatchAssignPools(
  batchWarehouseId: string | undefined,
  enabled: boolean,
) {
  const poolWarehouseIds = useMemo(
    () => (batchWarehouseId ? [batchWarehouseId] : []),
    [batchWarehouseId],
  );
  const l1l2ByWarehouse = useAssignPoolsByWarehouse(
    poolWarehouseIds,
    "inspection",
    { enabled },
  );
  const qcByWarehouse = useAssignPoolsByWarehouse(poolWarehouseIds, "qc", {
    enabled,
  });
  const repairByWarehouse = useAssignPoolsByWarehouse(
    poolWarehouseIds,
    "repair",
    { enabled },
  );
  return { l1l2ByWarehouse, qcByWarehouse, repairByWarehouse };
}

/** Finalize / cancel the batch, with their post-success navigation. */
export function useBatchActions(id: string) {
  const navigate = useNavigate();
  const finalize = useFinalizeGrnBatch();
  const cancel = useCancelGrnBatch();

  const handleFinalize = async () => {
    try {
      await finalize.mutateAsync(id); // refetches as closed; units appear
    } catch (e) {
      // Duplicate serial: open the edit form's line step with it flagged (onError already toasts).
      const serial = duplicateSerialFromError(e);
      if (serial)
        navigate(`/wms/inward/${id}/edit`, {
          state: { flagSerials: [serial] },
        });
    }
  };
  const handleCancelBatch = async () => {
    // Navigate only on success; on error the hook toasts and we stay on the batch.
    try {
      await cancel.mutateAsync({
        id,
        body: { reason: "Cancelled before receipt" },
      });
      // `replace` — the batch is now cancelled; Back shouldn't return to its page.
      navigate("/wms/inward", { replace: true });
    } catch {
      /* cancel.onError toasts; stay on the batch */
    }
  };

  return { finalize, cancel, handleFinalize, handleCancelBatch };
}

/** Flags + source facts read straight off the batch (undefined while loading). */
export function batchFacts(batch: GrnBatchResponse | undefined) {
  return {
    // SourceBrief carries supplier + expected date, so no whole-PO fetch.
    isPoSource: batch?.source_entity_type === "purchase_orders",
    // Rental returns get a kit check per received unit (return-by-count §9).
    isRentalReturn: batch?.inward_type === "rental_return",
    // Devices only exist once the batch is finalized.
    isCompletedBatch: batch?.status === "closed",
    sourceVendorName: batch?.source?.vendor_name ?? null,
    sourceEta: batch?.source?.expected_delivery_date ?? null,
    batchWarehouseId: batch?.to_warehouse?.id,
  };
}
