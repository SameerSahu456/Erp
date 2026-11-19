import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { formatINRShort } from "@/lib/currency";

import type { TopOrderRow, TopOrdersParams } from "../../../../api/dashboard";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useTopOrders } from "../../../../hooks/dashboard/useTopOrders";
import { INSIGHTS_STRINGS } from "../insights.strings";
import type { RankingCol } from "../InsightRankingTable";
import { InsightRankingTable } from "../InsightRankingTable";
import type { Span } from "../InsightWidget";
import { INSIGHT_PAGER_CLASS } from "../InsightWidget";
import { InsightShimmer } from "../InsightShimmer"

// The Top Orders ranked table — `GET /crm/dashboard/revenue/top-orders`.
//
// Each row is ONE approved SO line item: the ACCOUNT is the headline, the rep +
// condition the sub-line, then PRODUCT (category · OEM) and the closed VALUE.
// This is a different shape from `RevenueBySourceTable` (which is grouped
// name + value + share + count), so it is its own component rather than a
// fourth `report_type`.
//
// ONE component, two callers:
//   * the dashboard tile passes NO `paging` → preview mode: the top
//     `previewSize` rows, no footer, and the whole card drills into the full
//     view (`detailHref`);
//   * the insight-detail cell passes `paging` → the full server-paginated
//     table with a `TablePagination` footer.

const S = INSIGHTS_STRINGS.topOrders;

// Widths, because this table's columns hold wildly different content and the
// default equal split served none of them: an account name is 20–45 chars, a
// rep name is 12–20, a condition label is one word, a product is 2–4 words,
// and a value is 7 ("₹2.89Cr").
//
// ACCOUNT NAME is deliberately left unsized so it takes the remainder — see
// `RankingCol.width`. Every other column is sized to its content ceiling in
// percentages so the same widths hold whether the card is span=6 on the
// dashboard or full-width in the drilldown.
const TOP_ORDERS_COLS: RankingCol[] = [
  { key: "rep", label: S.columnRep, width: "w-[18%]" },
  { key: "condition", label: S.columnCondition, width: "w-[10%]" },
  { key: "product", label: S.columnProduct, width: "w-[22%]" },
  { key: "value", label: S.columnValue, align: "right", width: "w-[12%]", emphasis: true },
];

/** Condition enum → display label, or the em-dash placeholder for freeform SO
 *  lines that carry none. Same label map the sub-line used to read from. */
function conditionLabel(r: TopOrderRow): string {
  return r.condition
    ? INSIGHTS_STRINGS.conditionLabels[r.condition]
    : S.noCondition;
}

/** `"<category> · <OEM>"` — `category_details.name` is already the composite
 *  `"Parent / Child"` label from the server. Either side can be null; a line
 *  with neither shows the em-dash placeholder. */
function productLabel(r: TopOrderRow): string {
  const parts = [r.category_details?.name, r.oem_details?.name].filter(Boolean);
  return parts.length > 0 ? parts.join(S.separator) : S.noProduct;
}

interface TopOrdersTableProps {
  /** Period / range / facet slice. Never carries `page`/`page_size` — those
   *  come from `paging` (full view) or the preview constants (tile). */
  params: TopOrdersParams;
  title: string;
  why: string;
  span: Span;
  /** Provided by the insight-detail cell → renders the server pager. Omitted by
   *  the dashboard tile → preview mode (top `previewSize`, no footer). */
  paging?: InsightPaging;
  /** Preview row cap when `paging` is absent. Defaults to 10 — "top 10". */
  previewSize?: number;
  /** Card-click drill-through — the full paginated view. Used by the tile. */
  detailHref?: string;
  /** Row click — the clicked line's ACCOUNT. Wired to apply the account facet
   *  (detail view) or drill into it (dashboard tile). Each row carries its
   *  account id in `account_details`, so the filter binds by id, not name. */
  onRowClick?: (row: TopOrderRow) => void;
}

export function TopOrdersTable({
  params,
  title,
  why,
  span,
  paging,
  previewSize = 10,
  detailHref,
  onRowClick,
}: TopOrdersTableProps) {
  const navigate = useNavigate();
  // Preview mode pins page 1 at the preview size; the full view pages via URL.
  const page = paging?.page ?? 1;
  const pageSize = paging?.pageSize ?? previewSize;

  const { data, isLoading, isFetching, isError, error } = useTopOrders({
    ...params,
    page,
    page_size: pageSize,
  });

  const rows = data?.rows ?? [];

  return (
    <InsightRankingTable
      title={title}
      why={why}
      span={span}
      columns={TOP_ORDERS_COLS}
      nameLabel={S.columnName}
      detailHref={detailHref}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // Out-of-scope `user_ids` is a 403 here, not an empty list — it must
          // read as "you don't have permission", not "failed to load".
          <LoadErrorState error={error} fallback={INSIGHTS_STRINGS.widget.loadError} compact />
        ) : undefined
      }
      rows={rows.map((r) => ({
        name: r.account_details.name,
        // Server-numbered across the whole result set — nothing to re-derive.
        rank: r.rank,
        // No sub-line: rep + condition are their own columns now, so a
        // secondary line under the name would duplicate what the row already
        // shows and put Top Orders out of step with every other ranking tile
        // (Category, OEM, Revenue by Account), which all render one-line rows.
        cells: {
          rep: { text: r.user_details.name },
          condition: { text: conditionLabel(r) },
          product: { text: productLabel(r) },
          value: { text: formatINRShort(r.value_closed) },
        },
      }))}
      // A row's headline IS its account, so a click filters by that account.
      // Rows can repeat an account (one line per order), but every row for an
      // account shares its id — resolving the first match by name is exact.
      onRowClick={
        onRowClick
          ? (name) => {
              const row = rows.find((r) => r.account_details.name === name);
              if (row) onRowClick(row);
            }
          : undefined
      }
      // The full (paged) view gets the pager; the preview tile gets a
      // "Show all N →" link when there is more than one page of line items —
      // the same affordance as the Sales Team tile. Both drill into the full
      // paginated view (the rest lives behind its server pagination, NOT a
      // client-side expand).
      footer={
        paging ? (
          // Gated on `total > 0`, NOT on `page_count > 1`: the page-size
          // dropdown lives in the footer, so hiding it once everything fits one
          // page would strand the user at that size.
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
        ) : detailHref && data && data.pagination.total > pageSize ? (
          <div className="mt-1.5">
            {/* A <button> is in the card's nav-ignore list, so this navigates
                itself rather than double-firing the card's own detailHref. */}
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0"
              onClick={() => navigate(detailHref)}
            >
              {S.showAll(data.pagination.total)}
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}

/** The tile's fixed preview size — top 10 lines, no pager. Exported so the
 *  layout/registry can speak in the same number the component defaults to. */
export const TOP_ORDERS_PREVIEW_SIZE = 10;
