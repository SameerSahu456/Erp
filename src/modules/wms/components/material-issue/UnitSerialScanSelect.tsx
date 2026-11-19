import { useMemo } from "react";

import {
  AsyncSelect,
  type AsyncQueryShape,
} from "@/components/ui/async-select";

import { type AvailableStockRow } from "../../api";
import {
  useAvailableStockInfinite,
  useAvailableUnitScanInfinite,
} from "../../hooks/material-issue/useAvailableStock";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { scannedVariantLabel, unitLabel } from "./material-issue-form-helpers";

// AsyncSelect keys rows on `id`; the available-stock row keys on its serial.
type UnitOption = AvailableStockRow & { id: string };

// Serial cell — the SAME searchable dropdown (AsyncSelect) used by the variant
// picker beside it, backed by the available-units endpoint. Opened empty it
// lists the row's part's units; a typed or scanned serial is looked up across
// the whole warehouse, so scanning the device in hand finds it even when it is
// a different model (the caller switches the part). A pick locks qty to 1.
// Units already picked on other rows are hidden so the same unit can't be
// issued twice.
export function UnitSerialScanSelect({
  warehouseId,
  variantId,
  serial,
  selectedSerials,
  onPicked,
  onClear,
}: {
  warehouseId: string;
  variantId: string;
  serial: string;
  /** Every serial currently picked across the form. The dropdown hides all of
   *  them EXCEPT this row's own pick, so a unit can't be selected twice. */
  selectedSerials?: Set<string>;
  /** The picked unit — its serial, and its part when the scan found another model. */
  onPicked: (unit: AvailableStockRow) => void;
  onClear: () => void;
}) {
  // Stable dep key for the exclusion set (a Set's identity isn't a useMemo dep).
  const excludeKey = selectedSerials
    ? [...selectedSerials].sort().join("|")
    : "";

  // Named `use*` so it reads as the custom hook it is (AsyncSelect calls it as
  // one); closes over the warehouse/variant/exclusion.
  function useUnitOptions(
    search: string,
    opts?: { enabled?: boolean },
  ): AsyncQueryShape<UnitOption> {
    // Paging uses the raw page length, so hiding picked units can't stop it early (§16.11).
    // Browsing (no search) stays on this part; a serial searches the warehouse.
    const scanning = search.trim().length > 0;
    const browse = useAvailableStockInfinite(warehouseId, variantId, search, {
      enabled: (opts?.enabled ?? true) && !scanning,
    });
    const scan = useAvailableUnitScanInfinite(warehouseId, search.trim(), {
      enabled: (opts?.enabled ?? true) && scanning,
    });
    const query = scanning ? scan : browse;
    const data = useMemo(() => {
      const rows = (query.data?.pages ?? [])
        .flatMap((p) => p.items)
        // Keep this row's own pick; drop units already taken by other rows.
        .filter(
          (u) =>
            u.internal_serial === serial ||
            !selectedSerials?.has(u.internal_serial),
        )
        .map((u) => ({ ...u, id: u.internal_serial }));
      return { pages: [{ items: rows }] };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.data, excludeKey, serial]);
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
    <AsyncSelect<UnitOption>
      value={serial ? { id: serial, label: serial } : null}
      onValueChange={(opt) => {
        if (!opt) onClear();
      }}
      onItemPick={(u) => onPicked(u)}
      useOptions={useUnitOptions}
      // Another model's unit says which part it is, so the switch is visible.
      toLabel={(u) =>
        u.part_variant_id === variantId
          ? unitLabel(u)
          : `${unitLabel(u)} — ${scannedVariantLabel(u)}`
      }
      // Flag, never block: a device whose components were never checked can
      // still be issued, but the picker says so (inward-verification D8).
      getDescription={(u) =>
        u.components_unchecked ? S.form.lines.componentsUnchecked : null
      }
      placeholder={S.form.lines.unitPlaceholder}
      searchPlaceholder={S.form.lines.unitSearchPlaceholder}
      emptyText={S.form.lines.unitEmpty}
      loadingText={S.form.lines.searching}
      searchable
      loadOnOpen
    />
  );
}
