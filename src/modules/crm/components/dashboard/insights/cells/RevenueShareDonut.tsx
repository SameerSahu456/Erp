import type { ChartAccent } from "@/components/common/display/chartTheme";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";

import type { RevenueBySourceParams } from "../../../../api/dashboard";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useRevenueBySource } from "../../../../hooks/dashboard/useRevenueBySource";
import { INSIGHTS_STRINGS } from "../insights.strings";
import { InsightDonutList } from "../InsightDonutList";
import {
  INSIGHT_PAGER_CLASS,
  InsightWidget,
  type Span,
} from "../InsightWidget";
import { InsightShimmer } from "../InsightShimmer"

// The SHARE DONUT for any `by-source` grouping — one component, N report
// types. Revenue by Condition and Channel vs End Customer are the same
// endpoint (`GET /crm/dashboard/revenue/by-source`) under a different
// `report_type`, the same row shape, and the same picture: a handful of
// buckets and their share of the whole. Two components would be two places to
// fix the same bug.
//
// What varies is DATA, passed in: which `extra_metadata` key holds the value a
// click filters on (`metaField`), and an optional accent palette. Everything
// else — paging, states, share/total from the server — is shared.
//
// This exists as its own file because hooks cannot be called inside the
// renderer's `switch`, exactly as `RevenueBySourceTable` does for the tables.
//
// PAGINATION — this cell pages server-side, exactly like the table cells.
// The first cut sent the default `page_size: 10`, read `data.rows` and threw
// the envelope away, so an 11th row would have vanished with nothing on screen
// to say so. It now owns a `page` (its own URL param via `useInsightPaging`,
// so paging the donut cannot move Accounts / Category / OEM) and renders a
// `TablePagination` footer off `pagination.total` / `page_count` (§16.7).
//
// The grouping is closed today — `sales_order_items.condition` is CHECK-
// constrained to new / refurbished / new_pull or NULL, so 4 rows max — but
// that is the BACKEND's invariant and this component no longer depends on it.

interface RevenueShareDonutProps {
  params: RevenueBySourceParams;
  paging: InsightPaging;
  title: string;
  why: string;
  span: Span;
  /** Key inside the row's `extra_metadata` holding the value a click filters
   *  on — `condition` for the condition split, `account_type` for the channel
   *  split. The filter binds by that value, not by the display name. */
  metaField: string;
  /** Optional per-bucket palette keyed by the row's display name. Omit for the
   *  app's theme colour. */
  accents?: Record<string, ChartAccent>;
  /** Wire value a click filters by when the row's `metaField` is NULL — the
   *  "No Condition" bucket on the condition split (`NO_CONDITION_ID`). Omit for
   *  splits that have no null bucket (`account_type`), where such a click must
   *  stay inert. */
  nullId?: string;
  /** The clicked slice. */
  onSliceClick?: (value: { id: string; label: string }) => void;
  /** Card-click drill-through — the same page a slice opens, minus the filter. */
  detailHref?: string;
}

export function RevenueShareDonut({
  params,
  paging,
  title,
  why,
  span,
  metaField,
  accents,
  nullId,
  onSliceClick,
  detailHref,
}: RevenueShareDonutProps) {
  const { data, isLoading, isFetching, isError, error } = useRevenueBySource({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  });

  // `!data` is part of the guard, not a formality: every figure below now comes
  // off the response (`totals.value_closed`, each row's `share`), so there is
  // no client-side fallback to render with if it is missing.
  if (isLoading || isError || !data) {
    return (
      <InsightWidget title={title} why={why} span={span}>
        {isError ? (
          // An out-of-scope `user_ids` is a 403 here, not an empty list — that
          // must read as "you don't have permission", not "failed to load".
          <LoadErrorState
            error={error}
            fallback={INSIGHTS_STRINGS.widget.loadError}
            compact
          />
        ) : (
          <InsightShimmer />
        )}
      </InsightWidget>
    );
  }

  const rows = data.rows;
  return (
    <InsightDonutList
      title={title}
      why={why}
      span={span}
      unit="currency"
      detailHref={detailHref}
      data={rows.map((r) => ({
        label: r.name,
        value: Number(r.value_closed),
        // Server-computed, measured against the FULL result set — NOT
        // re-derived from the rows on this page. This is what keeps the
        // percentage and the bar identical whatever the page size is.
        share: r.share,
        // Keyed by the display name the API sends. A bucket with no entry —
        // the freeform "No Condition" row — falls back to slate, exactly as it
        // did when this was condition-only.
        accent: accents?.[r.name] ?? "slate",
      }))}
      // Total across every row, from the server. Without it the footer reports
      // the sum of the current page.
      total={data.totals.value_closed}
      onSliceClick={
        onSliceClick
          ? (label) => {
              const row = rows.find((r) => r.name === label);
              const meta = row?.extra_metadata as Record<
                string,
                string | null
              > | null;
              // A null `metaField` is a real bucket, not missing data: under
              // `condition` it is the freeform lines (`condition IS NULL`).
              // `nullId` is the wire value that selects them; without one there
              // is nothing to filter by and the click stays a no-op rather than
              // becoming a broken query.
              const value = meta?.[metaField] ?? nullId;
              if (value) onSliceClick({ id: value, label });
            }
          : undefined
      }
      // Gated on `total > 0`, NOT `page_count > 1` — the page-size dropdown
      // lives in this footer, so hiding it once everything fits one page
      // strands the user at that size with no way back. Same rule as
      // `RevenueBySourceTable`.
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
