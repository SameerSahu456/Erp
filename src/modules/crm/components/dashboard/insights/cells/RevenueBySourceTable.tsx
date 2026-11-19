import { TablePagination } from "@/components/common/tables/TablePagination";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { formatINRShort } from "@/lib/currency";

import type {
  RevenueBySourceParams,
  RevenueBySourceRow,
} from "../../../../api/dashboard";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useRevenueBySource } from "../../../../hooks/dashboard/useRevenueBySource";
import { INSIGHTS_STRINGS } from "../insights.strings";
import type { Span } from "../InsightWidget";
import { INSIGHT_PAGER_CLASS } from "../InsightWidget";
import { InsightRankingTable, type RankingCol } from "../InsightRankingTable";
import { InsightShimmer } from "../InsightShimmer";
// Share column hidden (product request) — commented out, not deleted.
// import { formatSharePct } from "../insights.format";
import { VALUE_COLS } from "./rank-columns";

// The Accounts / Category / OEM breakdowns — all three live on
// `GET /crm/dashboard/revenue/by-source`, which groups by `report_type`.
//
// ONE component for three cells. The rows are identical in shape (name +
// value_closed + share + order_count); only the grouping and the copy differ,
// so three components would be three places to fix the same bug.
//
// `VALUE_COLS` already matches the row 1:1 — no new table, columns or copy.
//
// Money is a JSON NUMBER here (DecimalAsFloat), unlike the decimal strings
// `hierarchy_wise_report` sends. `formatINRShort` takes either. `share` also
// arrives ready-computed (% of the pre-pagination total), so there is no
// percentage maths on this side.

const S_BRK = INSIGHTS_STRINGS.breakdowns;

interface RevenueBySourceTableProps {
  /** Page-level slice — period, range and the toolbar facets, already carrying
   *  `report_type`. */
  params: RevenueBySourceParams;
  paging: InsightPaging;
  title: string;
  why: string;
  span: Span;
  /** The clicked row — carries a real entity id in `extra_metadata`, which is
   *  what the drill-in filter needs. */
  onRowClick?: (row: RevenueBySourceRow) => void;
  /** Card-click drill-through — the same page a row opens, minus the filter. */
  detailHref?: string;
  /** Opt-in extra column — reads `extra_metadata.oem_name` on `top_products`
   *  rows. Freeform "Other" rows have no OEM and render an em-dash. Non-
   *  `top_products` report_types also render em-dash (their metadata shape
   *  doesn't carry the field). The dashboard omits this; the account 360°
   *  tab passes it. */
  showOem?: boolean;
  /** Opt-in extra column — reads `qty_sold`. Only meaningful for
   *  `top_products`; other report_types return `0` and render em-dash. */
  showQty?: boolean;
  /** Move the Value Closed column to the end of the row rather than its
   *  default first position. Used by the account 360° tab, where the
   *  categorical columns (OEM / Orders / Qty) read first and the
   *  money figure lands last as the summary. Dashboard mounts keep the
   *  default (value first) so the money column still anchors the row. */
  valueAtEnd?: boolean;
  /** Size the SHORT columns for a full-width (`span={6}`) mount.
   *
   *  These cells are built for `span={3}` — what the dashboard mounts them at.
   *  Under `table-fixed` the unsized columns split the remainder EQUALLY, so at
   *  half width each ~115px column is filled by its content, but at full width
   *  the same four columns become ~235px each and every cell turns into ~40px
   *  of ink floating in a box six times its size. That is the void down the
   *  middle of the row, and no alignment fixes it: right-aligning parks the ink
   *  at the far wall of each box, left-aligning parks it at the near one.
   *
   *  So pin the columns that hold BOUNDED content — an order count, a qty,
   *  a money figure — and leave NAME unsized so it absorbs the
   *  slack. The numbers then read as one group on the right instead of four
   *  marooned islands, exactly as `RankingCol.width` prescribes.
   *
   *  Percentages, never px (§8.7): the same card renders at several spans. */
  wide?: boolean;
}

export function RevenueBySourceTable({
  params,
  paging,
  title,
  why,
  span,
  onRowClick,
  detailHref,
  showOem = false,
  showQty = false,
  valueAtEnd = false,
  wide = false,
}: RevenueBySourceTableProps) {
  const { data, isLoading, isFetching, isError, error } = useRevenueBySource({
    ...params,
    page: paging.page,
    page_size: paging.pageSize,
  });

  const rows = data?.rows ?? [];

  // Column set — the shared two (value / count; no Share column) plus the two
  // opt-ins. Default order: value first (dashboard tiles anchor the row on
  // money). With `valueAtEnd`, the categorical columns lead and value lands
  // last — the 360° tab uses this so the summary figure reads as the outcome
  // of the row, not its heading.
  // Widths only in `wide` mode — at span=3 the equal split already fits, and
  // percentages tuned for a 985px card would squeeze the columns of a 480px one.
  const w = (cls: string) => (wide ? cls : undefined);

  const valueCol: RankingCol = { ...VALUE_COLS[0]!, width: w("w-[14%]") };
  // Share column hidden — VALUE_COLS[1] is now `count`; restore both together.
  // const shareCol: RankingCol = { ...VALUE_COLS[1]!, width: w("w-[18%]") };
  const countCol: RankingCol = { ...VALUE_COLS[1]!, width: w("w-[10%]") };
  const oemCol: RankingCol = {
    key: "oem",
    label: S_BRK.columnOem,
    align: "left",
    width: w("w-[16%]"),
  };
  const qtyCol: RankingCol = {
    key: "qty",
    label: S_BRK.columnQty,
    align: "right",
    width: w("w-[9%]"),
  };

  const columns: RankingCol[] = [];
  if (!valueAtEnd) columns.push(valueCol);
  if (showOem) columns.push(oemCol);
  // columns.push(shareCol);
  columns.push(countCol);
  if (showQty) columns.push(qtyCol);
  if (valueAtEnd) columns.push(valueCol);

  return (
    <InsightRankingTable
      title={title}
      why={why}
      span={span}
      columns={columns}
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
      rows={rows.map((r) => {
        // OEM lives on TopProductExtraMetadata only. The freeform "Other"
        // bucket (`is_freeform: true`) has no OEM, and every non-top_products
        // metadata shape doesn't carry the field — both cases render em-dash
        // rather than a misleading blank cell.
        const meta = r.extra_metadata as { oem_name?: string | null } | undefined;
        const oemText = meta?.oem_name || S_BRK.emptyCell;
        // qty_sold is `0` for non-top_products by schema contract.
        const qtyText =
          Number(r.qty_sold) > 0 ? String(r.qty_sold) : S_BRK.emptyCell;
        return {
          name: r.name,
          // Straight from the API — the server numbers rows across the whole
          // result set, so there is nothing to re-derive from page/pageSize.
          rank: r.rank,
          cells: {
            value: { text: formatINRShort(r.value_closed) },
            // share: { text: formatSharePct(r.share), pct: r.share },
            count: { text: String(r.order_count) },
            // Extra opt-in columns — the ranking table ignores keys whose
            // columns are not in the `columns` array, so unwanted cells here
            // are inert on mounts that didn't opt in.
            oem: { text: oemText },
            qty: { text: qtyText },
          },
        };
      })}
      onRowClick={
        onRowClick
          ? (name) => {
              const row = rows.find((r) => r.name === name);
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
