import { useMemo } from "react";

import type { PurchaseReturn, PurchaseReturnItem } from "../../api";
import { usePurchaseReturn } from "./usePurchaseReturns";

// Cancelled lines count as rejected; the rest split by disposition. On a
// cancelled return every line is cancelled, so Units counts them all (as the list does).
function countItems(items: PurchaseReturnItem[], returnCancelled: boolean) {
  return items.reduce(
    (acc, item) => {
      if (item.status === "cancelled") {
        acc.rejected += 1;
        if (returnCancelled) acc.total += 1;
        return acc;
      }
      acc.total += 1;
      if (item.disposition === "replace") acc.replace += 1;
      else if (item.disposition === "refund") acc.refund += 1;
      else acc.undecided += 1;
      return acc;
    },
    { total: 0, replace: 0, refund: 0, undecided: 0, rejected: 0 },
  );
}

// Embedded names, falling back to the raw ids.
function displayRefs(pr: PurchaseReturn | undefined) {
  return {
    vendorName: pr?.vendor_name ?? pr?.vendor_id ?? "",
    poNumber: pr?.po_number ?? pr?.purchase_order_id ?? "",
    creatorName: pr?.created_by_name ?? pr?.created_by ?? "",
    undecidedCount: pr?.undecided_count ?? 0,
  };
}

// The return response embeds po_number / vendor_name / created_by_name, so the
// detail view reads them straight off the record — no PO / vendor / user fetches.
// Those endpoints are procurement:read / auth:users_read gated, which the
// warehouse roles that raise returns (store_manager, mis) don't hold; fetching
// them 403'd and the UI fell back to raw UUIDs.
export function usePurchaseReturnDetailView(id: string | null | undefined) {
  const query = usePurchaseReturn(id);
  const purchaseReturn = query.data;

  const counts = useMemo(
    () => countItems(purchaseReturn?.items ?? [], purchaseReturn?.status === "cancelled"),
    [purchaseReturn?.items, purchaseReturn?.status],
  );

  return {
    query,
    purchaseReturn,
    ...displayRefs(purchaseReturn),
    counts,
  };
}

export function getPurchaseReturnItemLabel(item: PurchaseReturnItem) {
  return item.part_variant_name ?? item.internal_serial ?? item.stock_item_id;
}
