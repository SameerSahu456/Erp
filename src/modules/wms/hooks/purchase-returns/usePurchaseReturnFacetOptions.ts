import { useMemo } from "react";

import { makeStaticAsyncOptions, type AsyncSelectOption } from "@/components/ui/async-select";

import { usePurchaseReturnFilterOptions } from "./usePurchaseReturns";

/** PO / vendor filter options from the scoped facets, plus the selected chips. */
export function usePurchaseReturnFacetOptions(
  selectedWarehouseIds: string[],
  poId: string | undefined,
  vendorId: string | undefined,
) {
  // Facets list only POs/vendors that have a return in scope.
  const facets = usePurchaseReturnFilterOptions(selectedWarehouseIds).data;

  // Adapt the already-fetched facets to AsyncSelect with no extra request.
  const poOptionRows = useMemo(() => facets?.purchase_orders ?? [], [facets]);
  const vendorOptionRows = useMemo(() => facets?.vendors ?? [], [facets]);
  const usePoOptions = useMemo(
    () => makeStaticAsyncOptions(poOptionRows, (o) => o.label),
    [poOptionRows],
  );
  const useVendorFilterOptions = useMemo(
    () => makeStaticAsyncOptions(vendorOptionRows, (o) => o.label),
    [vendorOptionRows],
  );
  // The chip label rides on the value so the trigger renders it; resolve it from
  // the scoped facets (falls back to the id until they load).
  const poValue = useMemo<AsyncSelectOption | null>(
    () =>
      poId
        ? { id: poId, label: poOptionRows.find((o) => o.id === poId)?.label ?? poId }
        : null,
    [poId, poOptionRows],
  );
  const vendorValue = useMemo<AsyncSelectOption | null>(
    () =>
      vendorId
        ? {
            id: vendorId,
            label: vendorOptionRows.find((o) => o.id === vendorId)?.label ?? vendorId,
          }
        : null,
    [vendorId, vendorOptionRows],
  );

  return { usePoOptions, useVendorFilterOptions, poValue, vendorValue };
}
