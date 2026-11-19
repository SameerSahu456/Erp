import { useMemo } from "react";
import type { AsyncQueryShape } from "@/components/ui/async-select";

import type { AvailableStockRow } from "../../api";
import { useAvailableUnitScanInfinite } from "../../hooks/material-issue/useAvailableStock";
import { ScanSelect, type ScanOption } from "./ScanSelect";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { scannedVariantLabel, unitLabel } from "./material-issue-form-helpers";

/** What a scan fills into a line: its part, whether the part is serial-tracked,
 *  and the unit's serial. */
export interface ScannedUnit {
  variantOption: ScanOption;
  isTracking: boolean;
  serial: string;
}

/** Serial box for a line with no part chosen yet: scan (or type) the unit's
 *  serial and the part and serial fill in together. Searches every variant in
 *  the warehouse, exact match on either serial. */
export function ScanAnyUnitSelect({
  warehouseId,
  onScanned,
}: {
  warehouseId: string;
  onScanned: (unit: ScannedUnit) => void;
}) {
  // Named `use*` so it reads as the custom hook it is (ScanSelect calls it as one).
  function useUnitOptions(
    search: string,
    opts: { enabled: boolean },
  ): AsyncQueryShape<AvailableStockRow> {
    const query = useAvailableUnitScanInfinite(warehouseId, search, opts);
    const data = useMemo(
      () =>
        query.data ? { pages: query.data.pages.map((p) => ({ items: p.items })) } : undefined,
      [query.data],
    );
    return {
      data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      fetchNextPage: () => {
        void query.fetchNextPage();
      },
    };
  }

  return (
    <ScanSelect<AvailableStockRow>
      value={null}
      onChange={() => undefined}
      onPick={(u) =>
        onScanned({
          variantOption: { id: u.part_variant_id, label: scannedVariantLabel(u) },
          isTracking: !!u.is_tracking,
          serial: u.internal_serial,
        })
      }
      useOptions={useUnitOptions}
      toLabel={(u) => `${unitLabel(u)} — ${scannedVariantLabel(u)}`}
      toCodes={(u) => [u.internal_serial, u.manufacturer_serial]}
      placeholder={S.form.lines.scanAnyPlaceholder}
      searchPlaceholder={S.form.lines.scanAnySearchPlaceholder}
      emptyText={S.form.lines.scanAnyEmpty}
      loadingText={S.form.lines.searching}
    />
  );
}
