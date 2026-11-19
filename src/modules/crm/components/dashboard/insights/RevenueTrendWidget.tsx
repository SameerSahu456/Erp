import { useMemo } from "react";

import { type ChartAccent } from "@/components/common/display/chartTheme";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { formatINRShort } from "@/lib/currency";
import { cn } from "@/lib/utils";

import type { RevenueParams } from "../../../api/dashboard";
import type { InsightPaging } from "../../../hooks/dashboard/useInsightPaging";
import { useRevenue } from "../../../hooks/dashboard/useRevenue";
import { InsightEmptyState } from "./InsightEmptyState";
import { INSIGHTS_STRINGS } from "./insights.strings";
import { InsightShimmer } from "./InsightShimmer";
import { InsightTrendList } from "./InsightTrendList";
import { InsightWidget, INSIGHT_PAGER_CLASS, type Span } from "./InsightWidget";

// Revenue by time bucket — live on `GET /crm/dashboard/revenue`.
//
// The ONE live revenue series in the app. Three call sites render it with
// different copy — the dashboard's "Revenue by Month" widget, the Sales Team
// inner view's "Revenue Trend" cell, and the Revenue detail hero — so they can
// never drift apart or disagree about what a filter means.
//
// Thin component, like `SalesTeamWidget`: the page hands down `params` (the
// toolbar's period + facets) and the widget owns its own query, loading and
// error. A filter change re-queries server-side rather than re-bucketing a
// cached series (§16.7).

const S = INSIGHTS_STRINGS.revenueByMonth;

interface RevenueTrendWidgetProps {
  /** Page-level slice — period, range and the toolbar facets. */
  params: RevenueParams;
  /** A plain string for the period-neutral cells ("Revenue Trend", "AOV by
   *  Period"), or a function for the cells whose header names the bucket size.
   *
   *  The function is handed the RESPONSE's `period.type`, not `params.period`:
   *  the header must describe the buckets currently on screen, not the fetch in
   *  flight. Same rule as `conditionMix.title` / `verticalMix.title`. It falls
   *  back to `params.period` only before the first response, when the list is
   *  showing its loading state and there are no buckets to contradict. */
  title: string | ((bucketPeriod: RevenueParams["period"]) => string);
  why?: string;
  span?: Span;
  actions?: React.ReactNode;
  detailHref?: string;
  /** Server-page the series and render the standard pager, exactly like the
   *  leaderboard. Omit for the whole series in one request (`useRevenue`). */
  paging?: InsightPaging;
  /** Cap the series at the first N buckets — the dashboard's top-10 tile. Asks
   *  the API for N rather than slicing a cached series (§16.7). Ignored when
   *  `paging` is set; the two are different questions. */
  limit?: number;
  /** Rendered under the list when the series is capped — the "Show all N →"
   *  link into the paged inner view. Receives the FULL bucket count. */
  renderShowAll?: (total: number) => React.ReactNode;
  /** Forwarded to `InsightTrendList` — the dashboard hero passes `pt-4` as
   *  height-tuning; the insight detail cells keep the compact default. */
  footerGap?: string;
  /** Which bucket field to plot. `revenue` (default) is money and renders as
   *  currency; `count` is a plain entity count. NOT cosmetic — a `closed_leads`
   *  series carries `revenue: 0` in every bucket, so plotting revenue there
   *  draws a flat zero line. Pair it with the matching `params.metric`. */
  value?: "revenue" | "count";
  /** Accent for the list dot. Defaults to the revenue series' indigo; the
   *  funnel tiles override it so the three stages read as distinct. */
  accent?: ChartAccent;
  /** When `true`, render each bucket as a wider row split across the
   *  attribution columns the backend fan-out fills in (Leads / Deals /
   *  Lead ₹ / Deal ₹ / Account ₹ / Total) instead of the single-value
   *  trend list. Same query, same widget frame — only the row layout
   *  changes. Ignored for `value !== 'revenue'`. */
  breakdown?: boolean;
  /** Hide the ``Leads`` + ``Lead Rev`` columns in `breakdown` mode. Used on
   *  the Account 360° tab, where lead-level attribution is confusing on a
   *  per-account view (leads become accounts via conversion, so a lead
   *  counter on an account page reads as meta). Ignored outside breakdown
   *  mode. */
  hideLeadColumns?: boolean;
}

export function RevenueTrendWidget({
  params,
  title,
  why,
  span = 4,
  actions,
  detailHref,
  paging,
  limit,
  renderShowAll,
  footerGap,
  value = "revenue",
  accent = "indigo",
  breakdown = false,
  hideLeadColumns = false,
}: RevenueTrendWidgetProps) {
  const { data, isLoading, isFetching, isError, error } = useRevenue({
    ...params,
    // Three modes, one query: paged (inner view), capped (dashboard tile), or
    // the whole series (default — `useRevenue` fills in page_size 100).
    ...(paging
      ? { page: paging.page, page_size: paging.pageSize }
      : limit
        ? { page: 1, page_size: limit }
        : {}),
  });

  // `label` is server-formatted and render-ready ("Jul 2026" / "Q3" / "Jul W3"),
  // and empty buckets are zero-filled server-side — so there is nothing to
  // format or gap-fill here.
  const points = useMemo(
    () =>
      (data?.buckets ?? []).map((b) => ({ label: b.label, value: b[value] })),
    [data, value],
  );

  // NO window footnote. The `01 Jan 2026 – 18 Aug 2026` line under the header
  // was removed per product call: it repeated the toolbar's own period on every
  // trend card and read as descriptive filler. The server's real window is
  // still in `data.period` if a future cell needs to surface it.

  // The FULL bucket count for this slice — the server's, not `points.length`,
  // which is only the page/cap we asked for.
  const total = data?.pagination.total ?? 0;

  // `data.period.type` is the server's echo of the bucket size it actually
  // grouped by, which is what the header should name.
  const resolvedTitle =
    typeof title === "function" ? title(data?.period.type ?? params.period) : title;

  const footer = paging ? (
    // Gated on `total > 0`, NOT `page_count > 1`: the page-size dropdown
    // lives inside this footer, so hiding it once everything fits one page
    // strands the user at that size with no way back (the trap fixed in
    // SalesLeaderboard).
    data && total > 0 ? (
      <TablePagination
        className={INSIGHT_PAGER_CLASS}
        scrollCardIntoView
        page={paging.page}
        pageSize={paging.pageSize}
        totalPages={data.pagination.page_count}
        total={total}
        isFetching={isFetching}
        onPageChange={paging.setPage}
        onPageSizeChange={paging.setPageSize}
      />
    ) : undefined
  ) : // Capped: offer the way to the rest rather than a pager. Only when
  // there IS more — `limit` alone doesn't mean the series is truncated.
  limit && renderShowAll && total > limit ? (
    renderShowAll(total)
  ) : undefined;

  if (breakdown && value === "revenue") {
    // Breakdown view — same live series, wider row per bucket. Uses the
    // 4 attribution fields the backend fan-out fills in
    // (`RevenueClosedOrdersService._merge_breakdown`).
    const rows = data?.buckets ?? [];
    return (
      <InsightWidget
        title={resolvedTitle}
        why={why}
        span={span}
        actions={actions}
        detailHref={detailHref}
      >
        {isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : rows.length === 0 ? (
          <InsightEmptyState label={S.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-right">
              {/* Equal column widths — 7 columns at ~14.28%, or 5 at 20% when
                  the Leads / Lead Rev pair is hidden (Account 360° tab).
                  `table-fixed` makes the browser honour the colgroup rather
                  than sizing to content, so long month labels can't push the
                  money columns narrow. */}
              <colgroup>
                {Array.from({ length: hideLeadColumns ? 5 : 7 }).map((_, i) => (
                  <col
                    key={i}
                    className={hideLeadColumns ? "w-[20%]" : "w-[14.28%]"}
                  />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-border/30">
                  <BHead className="text-left">{S.breakdown.period}</BHead>
                  {!hideLeadColumns && (
                    <>
                      <BHead>{S.breakdown.leads}</BHead>
                      <BHead>{S.breakdown.leadRevenue}</BHead>
                    </>
                  )}
                  <BHead>{S.breakdown.deals}</BHead>
                  <BHead>{S.breakdown.dealRevenue}</BHead>
                  <BHead>{S.breakdown.soCount}</BHead>
                  <BHead>{S.breakdown.total}</BHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {rows.map((b) => (
                  <tr key={b.key}>
                    <BCell className="text-left">
                      <Typography variant="table-name" className="block truncate">
                        {b.label}
                      </Typography>
                    </BCell>
                    {!hideLeadColumns && (
                      <>
                        <BCell>
                          <Typography variant="table-cell" numeric>
                            {b.leads_won.toLocaleString("en-IN")}
                            {" / "}
                            {b.leads_total.toLocaleString("en-IN")}
                          </Typography>
                        </BCell>
                        <BCell>
                          <Typography variant="table-cell" numeric>
                            {formatINRShort(b.lead_revenue)}
                          </Typography>
                        </BCell>
                      </>
                    )}
                    <BCell>
                      <Typography variant="table-cell" numeric>
                        {b.deals_won.toLocaleString("en-IN")}
                        {" / "}
                        {b.deals_total.toLocaleString("en-IN")}
                      </Typography>
                    </BCell>
                    <BCell>
                      <Typography variant="table-cell" numeric>
                        {formatINRShort(b.deal_revenue)}
                      </Typography>
                    </BCell>
                    <BCell>
                      <Typography variant="table-cell" numeric>
                        {b.count.toLocaleString("en-IN")}
                      </Typography>
                    </BCell>
                    <BCell>
                      <Typography variant="table-figure">
                        {formatINRShort(b.revenue)}
                      </Typography>
                    </BCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {footer && <div className={cn("mt-auto", footerGap ?? "pt-1.5")}>{footer}</div>}
      </InsightWidget>
    );
  }

  return (
    <InsightTrendList
      title={resolvedTitle}
      why={why}
      span={span}
      actions={actions}
      detailHref={detailHref}
      points={points}
      footerGap={footerGap}
      currency={value === "revenue"}
      accent={accent}
      isLoading={isLoading}
      isError={isError}
      error={error}
      loadingLabel={S.loading}
      loadErrorLabel={S.loadError}
      emptyLabel={S.empty}
      footer={footer}
    />
  );
}

interface BCellProps {
  children: React.ReactNode;
  className?: string;
}

function BHead({ children, className }: BCellProps) {
  return (
    // `font-normal` on the <th> so the browser's bold header default can't
    // leak into anything outside the Typography span.
    <th className={cn("px-2 py-1.5 font-normal", className)}>
      <Typography variant="table-header">{children}</Typography>
    </th>
  );
}

function BCell({ children, className }: BCellProps) {
  return <td className={cn("px-2 py-1.5", className)}>{children}</td>;
}
