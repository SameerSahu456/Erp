import { useInfiniteQuery } from "@tanstack/react-query";
import { wmsKeys } from "../keys";

import { PAGINATION } from "@/shared/constants";

import { fetchOutwardSources, type OutwardSourceRow } from "../../api/dispatch";

// AsyncSelect requires every row to carry an `id`; OutwardSourceRow keys on
// `source_entity_id` instead. Expose an id-bearing shape for the picker so the
// picked option's `id` is the source entity id the MI form already expects.
export type OutwardSourceOption = OutwardSourceRow & { id: string };

// Infinite-scroll source picker for the Material Issue form (§16.11). Backed by
// `GET /wms/outward/sources`. Default mode returns only sources with pending
// pick qty > 0 — fully-fulfilled and demo-converted documents never surface, so
// the MI form can't offer a source that would fail its source-line guard.
//
// `readyOnly` switches the gate to "has >=1 issued + QC-passed unit ready to
// dispatch now" — the dispatch-create source dropdown, where the point is to
// only offer documents that will actually yield dispatchable units.
export function useOutwardSourcesInfinite(
  dispatchType: string,
  search: string,
  options?: {
    enabled?: boolean;
    pageSize?: number;
    readyOnly?: boolean;
    /** Scope the ready-only list to one warehouse (the dispatch-create
     *  dropdown passes the navbar's selected warehouse — CP-432). */
    warehouseId?: string;
    /** The New Issue form: only sales orders a Material Issue accepts. */
    forIssue?: boolean;
  },
) {
  const pageSize = options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const readyOnly = options?.readyOnly ?? false;
  const warehouseId = options?.warehouseId;
  const forIssue = options?.forIssue ?? false;
  return useInfiniteQuery({
    queryKey: wmsKeys.materialIssues.outwardSources({
      dispatchType,
      search,
      pageSize,
      readyOnly,
      warehouseId,
      forIssue,
    }),
    queryFn: async ({ pageParam }) => {
      const res = await fetchOutwardSources({
        dispatch_type: dispatchType,
        q: search || undefined,
        ready_only: readyOnly || undefined,
        warehouse_id: warehouseId || undefined,
        for_issue: forIssue || undefined,
        page: pageParam,
        page_size: pageSize,
      });
      return {
        ...res,
        items: res.items.map(
          (row): OutwardSourceOption => ({ ...row, id: row.source_entity_id }),
        ),
      };
    },
    initialPageParam: 1 as number,
    // The endpoint filters undispatchable rows AFTER paginating, so a short
    // `items` page is NOT end-of-list — it can still have more candidate pages
    // behind it. Page on the server's `has_more` flag (true while the candidate
    // page came back full), never on row count, or the picker stops early and
    // hides sources further down.
    getNextPageParam: (last, allPages) =>
      last.has_more ? allPages.length + 1 : undefined,
    enabled: options?.enabled ?? true,
  });
}
