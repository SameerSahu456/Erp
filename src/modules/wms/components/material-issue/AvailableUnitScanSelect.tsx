import { useMemo } from "react";
import type { AsyncQueryShape } from "@/components/ui/async-select";
import type { AvailableStockRow } from "../../api";
import { useAvailableStockInfinite } from "../../hooks/material-issue/useAvailableStock";
import { ScanSelect } from "./ScanSelect";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { unitLabel } from "./issued-components-panel-helpers";

// Scan-to-pick serial over a variant's available units (query in useAvailableStockInfinite, §16.11).
export function AvailableUnitScanSelect({
  warehouseId,
  variantId,
  serial,
  onPicked,
  onClear,
}: {
  warehouseId: string;
  variantId: string;
  serial: string;
  onPicked: (serial: string) => void;
  onClear: () => void;
}) {
  // Named `use*` so it reads as the custom hook it is (ScanSelect calls it as
  // one); closes over the warehouse/variant scope.
  function useUnitOptions(
    search: string,
    opts: { enabled: boolean },
  ): AsyncQueryShape<AvailableStockRow> {
    const query = useAvailableStockInfinite(
      warehouseId,
      variantId,
      search,
      opts,
    );
    const data = useMemo(
      () =>
        query.data
          ? { pages: query.data.pages.map((p) => ({ items: p.items })) }
          : undefined,
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
      value={serial ? { id: serial, label: serial } : null}
      onChange={(opt) => {
        if (!opt) onClear();
      }}
      onPick={(u) => onPicked(u.internal_serial)}
      useOptions={useUnitOptions}
      toLabel={unitLabel}
      toCodes={(u) => [u.internal_serial, u.manufacturer_serial]}
      placeholder={S.form.lines.unitPlaceholder}
      searchPlaceholder={S.form.lines.unitSearchPlaceholder}
      emptyText={S.form.lines.unitEmpty}
      loadingText={S.form.lines.searching}
    />
  );
}
