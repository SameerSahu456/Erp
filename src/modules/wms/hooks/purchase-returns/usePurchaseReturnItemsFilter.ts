import { useMemo, useState } from "react";

import type { PurchaseReturnItem } from "../../api";
import { RETURN_REASON_LABELS } from "../../components/purchase-returns/purchase-returns.strings";
import {
  dispositionMeta,
  isUndecided,
} from "../../components/purchase-returns/purchase-return-items-helpers";
import { getPurchaseReturnItemLabel } from "./usePurchaseReturnDetailView";

/** Line-item search + disposition filter and the header select-all. These narrow
 *  only the DISPLAYED rows; selection + bulk actions still use the full set. */
export function usePurchaseReturnItemsFilter(
  items: PurchaseReturnItem[],
  selectedIds: string[],
  setSelectedIds: (update: (prev: string[]) => string[]) => void,
) {
  const [itemSearch, setItemSearch] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("");

  const visibleItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (dispositionFilter && dispositionMeta(item).label !== dispositionFilter) return false;
      if (q) {
        const hay = `${item.internal_serial ?? ""} ${getPurchaseReturnItemLabel(item)} ${
          RETURN_REASON_LABELS[item.reason_code] ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, itemSearch, dispositionFilter]);
  // Select-all toggles every SELECTABLE (undecided) row currently visible.
  const selectableVisible = useMemo(
    () => visibleItems.filter(isUndecided),
    [visibleItems],
  );
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((i) => selectedIds.includes(i.id));
  function toggleAllVisible() {
    const ids = selectableVisible.map((i) => i.id);
    setSelectedIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])],
    );
  }

  return {
    itemSearch,
    setItemSearch,
    dispositionFilter,
    setDispositionFilter,
    visibleItems,
    selectableVisible,
    allVisibleSelected,
    toggleAllVisible,
  };
}
