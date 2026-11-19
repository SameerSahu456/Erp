import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchUsers, type UserListItem } from "@modules/users";
import { useDebounce } from "@/shared/hooks";
import { PAGINATION, UI } from "@/shared/constants";

import { warehouseScopeKey, wmsKeys } from "../keys";
import {
  fetchWarehouseEngineersPage,
  type AssignmentCapability,
  type AssignmentRole,
} from "../../api";
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination";

const EK = wmsKeys.engineers;
// The backend ignores (and some endpoints reject) a 1-char search.
const MIN_SEARCH_CHARS = 2;

// Global role a user needs for each assignment role (BR-2).
const ASSIGNMENT_ROLE_TO_GLOBAL: Record<AssignmentRole, string> = {
  warehouse_manager: "warehouse_manager",
  store_manager: "store_manager",
  mis: "mis",
  engineer: "engineer",
};

/** Display name for a user row in the assignment picker. */
function userLabel(u: UserListItem): string {
  const full = `${u.first_name} ${u.last_name ?? ""}`.trim();
  return full || u.email;
}

function useSearchParam(rawSearch: string): string | undefined {
  const debounced = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  return debounced.length >= MIN_SEARCH_CHARS ? debounced : undefined;
}

/** Picker option shape consumed by ``<AsyncSelect>``. */
export interface AssignableUserOption {
  id: string;
  label: string;
  email: string;
}

/** Infinite, debounced user picker limited to the matching global role (BR-2). */
export function useAssignableUserOptions(role: AssignmentRole) {
  const globalRole = ASSIGNMENT_ROLE_TO_GLOBAL[role];
  return function useOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
    const searchParam = useSearchParam(rawSearch);
    const limit = PAGINATION.DEFAULT_PAGE_SIZE;
    return useInfiniteQuery({
      queryKey: EK.options("assignable-users", globalRole, searchParam ?? ""),
      queryFn: async ({ pageParam }) => {
        const page = await fetchUsers({
          page: pageParam,
          page_size: limit,
          search: searchParam,
          is_active: true,
          role_names: [globalRole],
        });
        return {
          ...page,
          items: page.items.map(
            (u): AssignableUserOption => ({ id: u.id, label: userLabel(u), email: u.email }),
          ),
        };
      },
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextPage,
      enabled: options.enabled,
    });
  };
}

/** Engineer picker across the selected warehouses (empty = all); server-searched + paged (§16.11). */
export function useEngineersAcrossWarehousesOptions(
  warehouseIds: string[],
  capabilities: AssignmentCapability[],
) {
  const capsKey = capabilities.join(",");
  const whKey = warehouseScopeKey(warehouseIds);
  return function useOptions(rawSearch: string, options: { enabled?: boolean } = {}) {
    const searchParam = useSearchParam(rawSearch);
    const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
    return useInfiniteQuery({
      queryKey: EK.options("across-warehouses", whKey, capsKey, searchParam ?? ""),
      queryFn: async ({ pageParam }) => {
        const page = await fetchWarehouseEngineersPage({
          page: pageParam,
          page_size: pageSize,
          warehouse_ids: warehouseIds,
          role: "engineer",
          capabilities_any: capabilities,
          search: searchParam,
        });
        return {
          items: page.items.map((e) => ({ id: e.id, label: e.name, email: e.email })),
          total: page.total,
          page_size: page.page_size,
          page: pageParam,
        };
      },
      initialPageParam: 1 as number,
      getNextPageParam: (last, allPages) => {
        const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
        if (last.items.length === 0 || last.items.length < last.page_size) return undefined;
        return loaded < last.total ? last.page + 1 : undefined;
      },
      enabled: options.enabled !== false,
    });
  };
}
