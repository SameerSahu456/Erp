import { useState } from "react";

import { useDebounce } from "@/shared/hooks";
import { PAGINATION, UI } from "@/shared/constants";
import { toSortParam } from "@/shared/lib/sort-param";

import type { RackKind } from "../../api";
import { RACK_SORT_FIELDS } from "../../components/warehouses/warehouse-racks.columns";
import { useDeleteLocation, useLocation, useWarehouseRacks } from "./useWarehouseLocations";

export interface LocationDeleteTarget {
  kind: "rack" | "bin";
  id: string;
  name: string;
}

interface LocationEditTarget {
  id: string;
  parentRackName?: string;
}

type SortState = { column: string | null; direction: "asc" | "desc" | null };

/** State + data owner for a warehouse's rack table (§17). A table inside a
 *  detail tab pages with local state, per Coding-guideline §16.8. */
export function useRackTable(warehouseId: string) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });
  const [openRackId, setOpenRackId] = useState<string | null>(null);
  const [openBinId, setOpenBinId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<LocationEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationDeleteTarget | null>(null);

  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);
  const racksQ = useWarehouseRacks(warehouseId, {
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    kind: (kind || undefined) as RackKind | undefined,
    sort: toSortParam(sort.column, sort.direction, RACK_SORT_FIELDS),
  });
  const editingQ = useLocation(editTarget?.id);
  const deleteLocation = useDeleteLocation(warehouseId);

  const clearFilters = () => {
    setSearch("");
    setKind("");
    setPage(1);
  };

  return {
    search,
    changeSearch: (next: string) => {
      setSearch(next);
      setPage(1);
    },
    kind,
    changeFilter: (key: string, value: string) => {
      if (key === "kind") setKind(value);
      setPage(1);
    },
    clearFilters,
    filtersActive: !!debouncedSearch || !!kind,
    page,
    setPage,
    pageSize,
    changePageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    sort,
    changeSort: (column: string | null, direction: SortState["direction"]) => {
      setSort({ column, direction });
      setPage(1);
    },
    racksQ,
    openRackId,
    toggleRack: (rackId: string) => {
      setOpenRackId((current) => (current === rackId ? null : rackId));
      setOpenBinId(null);
    },
    openBinId,
    toggleBin: (binId: string) => {
      setOpenBinId((current) => (current === binId ? null : binId));
    },
    editTarget,
    editing: editTarget ? editingQ.data : undefined,
    setEditTarget,
    deleteTarget,
    setDeleteTarget,
    confirmDelete: () => {
      if (deleteTarget) deleteLocation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    },
  };
}
