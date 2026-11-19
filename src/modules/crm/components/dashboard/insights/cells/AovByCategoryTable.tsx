import { TablePagination } from "@/components/common/tables/TablePagination";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { formatINRShort } from "@/lib/currency";

import type {
  AvgOrderValueByCategoryParams,
  AvgOrderValueByCategoryRow,
} from "../../../../api/dashboard";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useAvgOrderValueByCategory } from "../../../../hooks/dashboard/useAvgOrderValueByCategory";
import { INSIGHTS_STRINGS } from "../insights.strings";
import type { Span } from "../InsightWidget";
import { INSIGHT_PAGER_CLASS } from "../InsightWidget";
import { InsightRankingTable } from "../InsightRankingTable";
import { AOV_COLS } from "./rank-columns";
import { InsightShimmer } from "../InsightShimmer"

// Avg Order Value per IMS category, live off
// `GET /crm/dashboard/insights/avg-order-value/by-category`.
//
// Structurally the twin of `RevenueBySourceTable` — same chrome, same pager,
// same error routing — but a SEPARATE component rather than a fourth report
// type on that one, because it is a different endpoint with a different row
// shape: no `share`, and identity in a real `category_details` object instead
// of the untyped `extra_metadata` bag. Folding the two together would mean a
// union row type and a conditional column set at every call site.
//
// Money arrives as a JSON NUMBER (DecimalAsFloat); `formatINRShort` takes
// either that or the decimal strings `hierarchy_wise_report` sends.
//
// Parent and child categories both carrying SOs appear as SEPARATE rows — the
// endpoint does not roll children up into their parent, so a category name can
// legitimately look like a duplicate of its parent's line.

interface AovByCategoryTableProps {
  /** Page-level slice — period, range and the toolbar facets. Unlike the
   *  by-source cells there is no `report_type`: this endpoint groups by
   *  category and nothing else. */
  params: AvgOrderValueByCategoryParams;
  paging: InsightPaging;
  title: string;
  why: string;
  span: Span;
  /** The clicked row — carries the real IMS category id, which is what the
   *  drill-in facet needs. */
  onRowClick?: (row: AvgOrderValueByCategoryRow) => void;
  /** Card-click drill-through — the same page a row opens, minus the filter. */
  detailHref?: string;
}

export function AovByCategoryTable({
  params,
  paging,
  title,
  why,
  span,
  onRowClick,
  detailHref,
}: AovByCategoryTableProps) {
  const { data, isLoading, isFetching, isError, error } = useAvgOrderValueByCategory({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  });

  const rows = data?.rows ?? [];

  return (
    <InsightRankingTable
      title={title}
      why={why}
      span={span}
      columns={AOV_COLS}
      detailHref={detailHref}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // An out-of-scope `user_ids` is a 403 here, not an empty list — that
          // must read as "you don't have permission", not "failed to load".
          <LoadErrorState
            error={error}
            fallback={INSIGHTS_STRINGS.widget.loadError}
            compact
          />
        ) : undefined
      }
      rows={rows.map((r) => ({
        name: r.category_details.name,
        // Straight from the API — the server numbers rows across the whole
        // result set (verified: page 2 of a 6-row set starts at rank 6), so
        // there is nothing to re-derive from page/pageSize.
        rank: r.rank,
        cells: {
          value: { text: formatINRShort(r.avg_order) },
          count: { text: String(r.orders) },
        },
      }))}
      onRowClick={
        onRowClick
          ? (name) => {
              const row = rows.find((r) => r.category_details.name === name);
              if (row) onRowClick(row);
            }
          : undefined
      }
      // Gated on `total > 0`, NOT on `page_count > 1`: the page-size dropdown
      // lives inside this footer, so hiding it once everything fits one page
      // strands the user at that size with no way back (the bug fixed in
      // SalesLeaderboard — see tests/unit/crm/insights-leaderboard-paging).
      footer={
        data && data.pagination.total > 0 ? (
          <TablePagination
            className={INSIGHT_PAGER_CLASS}
            scrollCardIntoView
            page={paging.page}
            pageSize={paging.pageSize}
            totalPages={data.pagination.page_count}
            total={data.pagination.total}
            isFetching={isFetching}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
          />
        ) : undefined
      }
    />
  );
}
