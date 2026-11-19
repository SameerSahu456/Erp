import { useInfiniteQuery } from "@tanstack/react-query";
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination";

import { PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";

import { fetchAllowedUsers } from "../../api/dashboard";

// The dashboard User filter's option source —
// `GET /crm/dashboard/allowed-users`.
//
// Replaces `useUserOptions` (the org-wide `/api/v1/users` list) for this one
// picker. Both render the same row shape, but only this one is SCOPE-RESOLVED:
// it returns exactly the users the caller may pass back as `user_ids`, so the
// picker can no longer offer someone the widgets reject with a 403
// DASHBOARD_SCOPE_DENIED.
//
// Shaped as an infinite query so `InsightFacet` gets scroll-to-load-more and
// debounced server-side search through the shared engine with no second
// implementation (§16.11). Paging is `offset`/`limit`, not `page`/`page_size` —
// "is there more" is `offset + items.length < total`, read off the response
// rather than counted locally.
//
// Search is debounced HERE rather than at the call site because the facet hands
// down its raw input; `UI.DEBOUNCE_SEARCH_MS` is the same constant every other
// picker uses, so the dropdowns all feel identical.
//
// No per-hook query config (§6.5.1): `staleTime` / `gcTime` / `retry` /
// `refetchOn*` come from the global QueryClient. `enabled` is not that — it
// gates the request on the dropdown actually opening, so six facets on a board
// don't fire six requests on page load.

export const ALLOWED_USERS_KEY = ["crm", "dashboard", "allowed-users"] as const;

export function useAllowedUsers(
  rawSearch: string,
  options?: { enabled?: boolean },
) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  const limit = PAGINATION.DEFAULT_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: [...ALLOWED_USERS_KEY, { search, is_active: true }],
    queryFn: ({ pageParam }) =>
      fetchAllowedUsers({
        page: pageParam,
        page_size: limit,
        search: search || undefined,
        is_active: true,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options?.enabled ?? true,
  });
}
