import { useMemo } from "react";

import { usePermission } from "@shared/rbac";

import { useGrnBatch } from "../inwards/useInwards";
import type { DeviceDossier } from "../../api";

export function useInspectionReturnToVendor(device: DeviceDossier["device"] | undefined) {
  // The GRN batch is fetched ONLY to decide whether to offer "Return to vendor",
  // which is itself gated on procurement:po_return_write. The batch endpoint
  // needs wms:inward_read, which floor engineers don't hold — so without this
  // gate they fire a guaranteed 403 for a button they can never use. Only the
  // warehouse roles that can raise a return (and hold inward_read) fetch it.
  const canReturnToVendor = usePermission().can("procurement:po_return_write");
  const grnBatchId = device?.grn_batch_id ?? null;
  // The shared batch query (one cache entry per batch, refreshed by inward and
  // identity writes); '' keeps it idle.
  const grnBatchQuery = useGrnBatch(canReturnToVendor ? (grnBatchId ?? "") : "");

  const poId = useMemo(() => {
    const grnBatch = grnBatchQuery.data;
    return grnBatch?.inward_type === "purchase_order" &&
      grnBatch?.source_entity_type === "purchase_orders"
      ? grnBatch.source_entity_id
      : null;
  }, [grnBatchQuery.data]);

  // The batch already embeds the source PO's display number, so the
  // "return to vendor" deep-link can carry it and the return form can label
  // its PO picker without a procurement:read detail fetch (which the
  // store_manager / mis raising the return does not hold).
  const poNumber = poId ? (grnBatchQuery.data?.source?.display_number ?? null) : null;

  return {
    grnBatchQuery,
    poId,
    poNumber,
    isPurchaseOrderOrigin: !!poId,
  };
}
