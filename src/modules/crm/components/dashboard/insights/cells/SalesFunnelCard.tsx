import { TablePagination } from "@/components/common/tables/TablePagination";
import { Typography } from "@/components/ui/typography";
import { PAGINATION } from "@/shared/constants";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";

import type { SalesFunnelParams, SalesFunnelRow } from "../../../../api/dashboard";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useSalesFunnel } from "../../../../hooks/dashboard/useSalesFunnel";
import { formatSharePct, rateTone } from "../insights.format";
import { INSIGHTS_STRINGS } from "../insights.strings";
import { productFacetNotes } from "./sales-funnel-notes";
import type { RankingCol } from "../InsightRankingTable";
import { InsightRankingTable } from "../InsightRankingTable";
import type { Span } from "../InsightWidget";
import { INSIGHT_PAGER_CLASS } from "../InsightWidget";
import { InsightShimmer } from "../InsightShimmer"

// The Sales Funnel conversion table — `GET /crm/dashboard/sales-funnel`.
//
// FOUR rows, always, in the fixed order `[leads, deals, quotes,
// demo_requests]`. Each row is a POPULATION with everything created in the
// window (`total`), how much of it produced a sales order (`converted`), and
// that population's `conv_rate`.
//
// NOT a drop-off sequence, despite reading top-to-bottom: a quote hangs off a
// lead or a deal and a demo request off either, so the rows overlap and one
// order can be the conversion for several of them. `total` falling down the
// list is four different denominators, not attrition — which is why there is
// no funnel chart here and no between-row arithmetic.
//
// `converted` is NOT one definition across the rows, and the split is
// deliberate:
//
//   * Leads / Deals / Demo Requests use the shared server-side gate
//     (`_order_counts`) — live revision head, live account, and at least one
//     APPROVED line. That is what makes an order count as revenue anywhere
//     else on the dashboard.
//   * Quotes instead mirrors the Summary strip's QUOTE → SO WIN RATE exactly:
//     any non-deleted linked SO, no further gate. Chosen so the row and the
//     tile above it can never print different numbers — matching the strip won
//     over matching the sibling rows.
//
// Worth knowing before comparing rows: the Quotes rate counts orders still in
// Draft, and orders that were Cancelled or Rejected. It therefore reads HIGHER
// than the other rows' definition would give. Tighten it only together with
// the summary tile, or the two drift apart again.
//
// A TABLE, deliberately — read as a list of figures, not a chart. It rides the
// shared `InsightRankingTable` (same `table-fixed` column rhythm, header,
// striping, truncation and toned cells as Top Accounts / Category / OEM / Top
// Orders) with `showRank={false}`: the rows are four different POPULATIONS,
// not an ordering, so a "#1 / #2" gutter would invent a ranking that does not
// exist. That flag is the only reason this needs no bespoke table.
//
// ONE component, two callers, the same split as `TopOrdersTable`:
//   * the dashboard tile passes `detailHref` → the whole card drills into
//     `/crm/insights/sales-funnel`;
//   * the insight-detail cell passes none → the same table, no drill-through
//     (it IS the page it would drill to).
//
// PAGING: both callers pass a `paging` handle, so the card carries the same
// URL-backed footer pager as every other cell on the board (§16.7's page-owns-
// `page` contract, its own `salesFunnel*` params so it never moves a neighbour).
//
// It is the one pager on the board that does NOT refetch, and that is a property
// of the endpoint, not a shortcut: `/sales-funnel` accepts no `page` /
// `page_size` and returns its WHOLE result set — four rows — in one response. So
// the pager slices rows already in hand. That is NOT the §16.7 anti-pattern,
// which forbids slicing a cached fetch that is only PART of the data (the rest
// then silently never loads); here there is no rest. With four rows against any
// page size it sits at a single page, and the page-size control still works — it
// is the same control, on the same URL params, as its siblings. If the endpoint
// ever returns more stages, the pager starts doing real work unchanged.
//
// NOT a `funnel-trends` variant. Those three tiles are a TIME SERIES off
// `/crm/dashboard/revenue` (counts per bucket); this is a conversion RATIO off
// its own endpoint. Different question, and they share a page.
//
// Three contract details drive the rendering (see `api/dashboard.ts` for all):
//
//   * `conv_rate` is ALREADY A PERCENT (0–100, 2 dp) — not a fraction like
//     `Ratio.rate` on `/dashboard/summary`. Rendered as sent.
//   * `conv_rate === null` means `total === 0`, i.e. NO DENOMINATOR — not "zero
//     percent". It renders as the muted placeholder with NO tone, never 0% in
//     danger red, which would read as a bad result rather than absent data.
//   * Category, OEM and Condition all reach Quotes and Demo Requests (their lines
//     record all three). Leads and Deals carry category and OEM but NO condition,
//     so Condition narrows only their WON side. The card footnotes that one caveat
//     whenever Condition is active — see `productFacetNotes` (CP-756 / DF-03).

const S = INSIGHTS_STRINGS.salesFunnel;

const FUNNEL_COLS: RankingCol[] = [
  { key: "total", label: S.columnTotal, align: "right" },
  { key: "converted", label: S.columnConverted, align: "right" },
  { key: "rate", label: S.columnRate, align: "right" },
];

/** Stage label from the wire enum. A stage the backend ADDS is caught at compile
 *  time (the index would not resolve until `stageLabels` gains the key), so the
 *  fallback only covers the runtime case: an API sending a stage the generated
 *  type doesn't know about. Renders as itself rather than blank. */
const stageLabel = (stage: SalesFunnelRow["stage"]): string => S.stageLabels[stage] ?? stage;

const count = (n: number) => n.toLocaleString("en-IN");

interface SalesFunnelCardProps {
  /** Period / range / facet slice. Never carries `page` / `page_size` — the
   *  endpoint has neither; see the PAGING note above. */
  params: SalesFunnelParams;
  title: string;
  why: string;
  span: Span;
  /** Card-click drill-through. Set by the dashboard tile; omitted on the detail
   *  page, where the card is already on the page it would open. */
  detailHref?: string;
  /** URL-backed page + page size, same as every other cell's footer pager.
   *  Omitted → all rows, no footer. */
  paging?: InsightPaging;
}

export function SalesFunnelCard({
  params,
  title,
  why,
  span,
  detailHref,
  paging,
}: SalesFunnelCardProps) {
  const { data, isLoading, isError, error } = useSalesFunnel(params);

  const allRows = data?.rows ?? [];
  const total = allRows.length;
  const page = paging?.page ?? 1;
  const pageSize = paging?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  // Page over rows already in hand — the response IS the whole set (see above).
  // An out-of-range `?salesFunnelPage=` in the URL yields an empty slice and the
  // table's own empty state, exactly as a server-paged cell would return an
  // empty page.
  const rows = paging ? allRows.slice((page - 1) * pageSize, page * pageSize) : allRows;
  const productNotes = productFacetNotes(params);

  return (
    <InsightRankingTable
      title={title}
      why={why}
      span={span}
      detailHref={detailHref}
      columns={FUNNEL_COLS}
      // Four populations, not an ordering — see the header note.
      showRank={false}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // Out-of-scope `user_ids` is a 403 here, not an empty result — it must
          // read as "you don't have permission", not "failed to load".
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      rows={rows.map((r) => {
        // `null` is "no denominator" and has NO tone.
        const rate = r.conv_rate ?? null;
        return {
          // No `sub` line: two rows of "… created in the window" was noise in a
          // table this small, and it repeated what the window footnote and the
          // widget's `why` copy already say. The one non-obvious detail — the
          // Deals row counts ACCOUNT-DIRECT deals only — lives in `why`.
          name: stageLabel(r.stage),
          cells: {
            total: { text: count(r.total) },
            converted: { text: count(r.converted) },
            rate: {
              text: rate === null ? S.noValue : formatSharePct(rate),
              tone: rate === null ? undefined : rateTone(rate),
            },
          },
        };
      })}
      footer={
        isError ? undefined : (
          <>
            {/* The only footnote left is the product-facet warning, and it
                appears ONLY while Condition is active. No window /
                date-range line: the toolbar above already states the period, so
                reprinting the resolved range under a two-row table was noise.
                (`RevenueTrendWidget` still prints its own — it needs to, because
                `/revenue` resolves `period` to a different range than this
                endpoint does.) */}
            {productNotes.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                {/* Deliberately NOT truncated: this explains why the table looks
                    unchanged (or only partly moved), so it must be readable in
                    full. Wrapped text cannot cause a horizontal scrollbar (§8.7). */}
                {productNotes.map((note) => (
                  <Typography key={note} variant="caption" tone="muted" className="block">
                    {note}
                  </Typography>
                ))}
              </div>
            )}
            {/* Gated on `total > 0`, NOT on `page_count > 1` — the page-size
                dropdown lives in the footer, so hiding it once everything fits
                one page would strand the user at that size. Same rule as
                `TopOrdersTable` and the by-source cells. */}
            {paging && total > 0 && (
              <TablePagination
                className={INSIGHT_PAGER_CLASS}
                scrollCardIntoView
                page={page}
                pageSize={pageSize}
                totalPages={Math.max(1, Math.ceil(total / pageSize))}
                total={total}
                // No `isFetching`: paging here re-slices rows already in hand
                // rather than firing a request, so there is never a page in
                // flight to indicate.
                onPageChange={paging.setPage}
                onPageSizeChange={paging.setPageSize}
              />
            )}
          </>
        )
      }
    />
  );
}
