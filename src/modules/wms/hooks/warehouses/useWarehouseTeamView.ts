import { useState } from "react";

import { useAuth } from "@shared/auth/use-auth";
import { PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";
import { toSortParam } from "@/shared/lib/sort-param";
import { usePermission } from "@shared/rbac";

import type { AssignmentLevel, AssignmentRole, WarehouseAssignmentListItem } from "../../api";
import { TEAM_SORT_FIELDS } from "../../components/warehouses/warehouse-team.columns";
import { wmsPermissions } from "../../permissions";
import { useRemoveWarehouseAssignment, useWarehouseTeamPage } from "./useWarehouseTeam";

type SortState = { column: string | null; direction: "asc" | "desc" | null };

/** State + data owner for a warehouse's Team Members tab (§17). */
export function useWarehouseTeamView(warehouseId: string) {
  const canManage = usePermission().can(wmsPermissions.TEAM_MANAGE);
  // CP-466: you can't remove yourself from a team. Removing someone above you
  // is blocked by the backend (403) and surfaced as an error toast.
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AssignmentRole | "">("");
  // Level only means something for engineers, so it is cleared with any other role.
  const [level, setLevel] = useState<AssignmentLevel | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });
  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS);
  const teamQ = useWarehouseTeamPage(warehouseId, {
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    role: role || undefined,
    level: level || undefined,
    sort: toSortParam(sort.column, sort.direction, TEAM_SORT_FIELDS),
  });
  const remove = useRemoveWarehouseAssignment(warehouseId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseAssignmentListItem | undefined>(undefined);
  const [removing, setRemoving] = useState<WarehouseAssignmentListItem | undefined>(undefined);
  const [reason, setReason] = useState("");

  const closeRemove = () => {
    setRemoving(undefined);
    setReason("");
  };

  async function confirmRemove() {
    if (!removing || !reason.trim()) return;
    await remove.mutateAsync({ userId: removing.user.id, reason: reason.trim() });
    closeRemove();
  }

  return {
    canManage,
    currentUserId: user?.id,
    search,
    changeSearch: (next: string) => {
      setSearch(next);
      setPage(1);
    },
    role,
    level,
    changeFilter: (key: string, value: string) => {
      if (key === "role") {
        setRole(value as AssignmentRole | "");
        if (value !== "engineer") setLevel("");
      }
      if (key === "level") setLevel(value as AssignmentLevel | "");
      setPage(1);
    },
    clearFilters: () => {
      setSearch("");
      setRole("");
      setLevel("");
      setPage(1);
    },
    filtersActive: !!debouncedSearch || !!role || !!level,
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
    teamQ,
    formOpen,
    setFormOpen,
    editing,
    openAdd: () => {
      setEditing(undefined);
      setFormOpen(true);
    },
    openEdit: (row: WarehouseAssignmentListItem) => {
      setEditing(row);
      setFormOpen(true);
    },
    removing,
    openRemove: (row: WarehouseAssignmentListItem) => {
      setRemoving(row);
      setReason("");
    },
    closeRemove,
    reason,
    setReason,
    removePending: remove.isPending,
    // Fire-and-forget from the click; a failure is toasted by the mutation's
    // onError and the dialog stays open for a retry.
    confirmRemove: () => void confirmRemove().catch(() => undefined),
  };
}
