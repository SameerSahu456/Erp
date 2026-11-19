import { INSIGHT_PAGER_CLASS } from "../InsightWidget";
import { useEffect, useRef } from "react";

import { TablePagination } from "@/components/common/tables/TablePagination";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { UI } from "@/shared/constants";
import { formatINRShort } from "@/lib/currency";

import type { SalesTeamRevenueParams } from "../../../../api/dashboard";
import type { FacetValue } from "../../../../data/insights/records";
import type { InsightPaging } from "../../../../hooks/dashboard/useInsightPaging";
import { useInsightView } from "../../../../hooks/dashboard/useInsightView";
import { useSalesTeamRevenue } from "../../../../hooks/dashboard/useSalesTeamRevenue";
import { useSalesTeamSearch } from "../../../../hooks/dashboard/useSalesTeamSearch";
import { INSIGHTS_STRINGS } from "../insights.strings";
import { InsightRankingTable } from "../InsightRankingTable";
import { Ratio } from "../Ratio";
import { InsightShimmer } from "../InsightShimmer"
import { SalesTeamActions } from "../SalesTeamActions";

// Sales Team — Leaderboard, live on `GET /crm/dashboard/hierarchy_wise_report`.
//
// The dashboard widget shows the top 10 of the same query; this pages through
// the whole scope server-side (§16.7) with the standard CRM footer, page-size
// dropdown included.
//
// Attainment is gone and Pipeline is now Leads: `attainment` was derived from a
// seeded target and `openPipeline` had no API field at all, while `lead_count`
// is real.
//
// The Target column is BACK. It had been removed on the belief that the fields
// were dropped from `SalesTeamRevenueRow` — they never were. `target` and
// `yearly_target` have shipped on the endpoint since the backend's "division of
// target" change; what was stale was `schema.gen.ts`, which had not been
// regenerated since, so the fields were invisible to the TYPE layer only and
// the column read as an em-dash on every row. Before deleting a column again
// because its field "left the API", regenerate the schema and check.
//
// Deals and Leads read `closed/total` here, exactly as in the dashboard widget:
// the denominators (`deal_total`, `lead_total`) are raw ownership in the window.

const S = INSIGHTS_STRINGS.salesTeamDetail;
// The ratio strings live with the widget that owns the pattern, so the two
// tables cannot word it differently.
const W = INSIGHTS_STRINGS.ratio;

// Set to `false` to keep the "+N" but stop the hover card from opening — the
// remaining roles are then never revealed.
const SHOW_ALL_ROLES_ON_HOVER = true;

/** Roles sub-line under a rep's name.
 *
 *  The LINE is the reference board's rep sub-line: plain muted caption text, no
 *  pills — a paginated table of 25 rows should not grow a second row of chips.
 *  The CARD is the app's standard multi-value hover table (Settings › Users
 *  Role column), so what you get when you point at "+2" is what you already get
 *  everywhere else.
 *
 *  The endpoint sends `roles: string[]` — live roles only, soft-deleted ones are
 *  dropped server-side — so a rep can legitimately hold several. */
function RoleLine({ roles }: { roles: string[] }) {
  const extra = roles.length - 1;

  // The "+2" ALONE is the hover target, not the whole line: hovering the role
  // name would fire a card the user never aimed at, once per row, as the
  // pointer crosses a 25-row page on its way to the pager.
  //
  // A plain span wraps the Typography because this is the element Base UI's
  // `render` clones — the same shape OverflowPillList hands its own trigger.
  // No underline, no cursor change: the count is styled exactly like the role
  // name beside it — same variant, same tone, same baseline — so the sub-line
  // reads as one caption instead of one caption plus a decorated control.
  const moreCount = (
    <span className="shrink-0 tabular-nums">
      <Typography variant="helper" tone="muted" asChild>
        <span>{S.moreRoles(extra)}</span>
      </Typography>
    </span>
  );

  return (
    // No `truncate` on the role name — it WRAPS onto a second line instead of
    // ellipsing. The name column is one equal share of a `table-fixed` layout,
    // narrow enough that clipping would eat most real role names; `break-words`
    // keeps even an unbroken one inside the column (§8.7).
    //
    // `items-baseline` sits the count on the SAME text baseline as the role
    // name — the first line of it, when the name wraps.
    <span className="flex min-w-0 items-baseline gap-1">
      <Typography variant="helper" tone="muted" className="min-w-0" asChild>
        <span className="break-words">{roles[0]}</span>
      </Typography>

      {extra > 0 &&
        (SHOW_ALL_ROLES_ON_HOVER ? (
          <HoverCard>
            {/* Base UI's trigger is polymorphic via `render`, never `asChild`
             *  (`asChild` leaks to the DOM and React warns). */}
            <HoverCardTrigger render={moreCount} />
            {/* Deliberately the same popover + table chrome as
             *  `OverflowPillList`'s hover card, class for class, so the two read
             *  as one pattern. Not reused from that component because it always
             *  renders PILLS as its trigger, and this line is text. */}
            <HoverCardContent
              align="start"
              sideOffset={2}
              className="w-auto min-w-[220px] max-w-[min(90vw,28rem)] overflow-hidden rounded-xl border border-border/70 bg-popover/98 p-0 shadow-[0_14px_40px_rgb(var(--shadow-rgb)/0.24)] backdrop-blur-sm"
            >
              {/* No top padding — the sticky header pins to `top: 0` of this
               *  scroll box, and padding above it would leave a translucent
               *  strip with rows scrolling through it. */}
              <div className="max-h-[260px] overflow-x-auto overflow-y-auto">
                <table className="w-max min-w-full">
                  <thead className="sticky top-0 z-10 bg-popover">
                    <tr className="border-b border-border">
                      <th className="w-14 px-2.5 py-2 text-left font-normal whitespace-nowrap">
                        <Typography variant="table-header">{S.rolesSrNo}</Typography>
                      </th>
                      <th className="px-2.5 py-2 text-left font-normal whitespace-nowrap">
                        <Typography variant="table-header">{S.rolesColumn}</Typography>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* EVERY role, the one already on the line included — a list
                     *  that skipped it would not match the count hovered. */}
                    {roles.map((role, i) => (
                      <tr key={role} className="border-b border-border/50 last:border-b-0">
                        <td className="w-14 px-2.5 py-2.5 align-top whitespace-nowrap">
                          <Typography variant="table-cell" tone="muted" numeric asChild>
                            <span>{i + 1}</span>
                          </Typography>
                        </td>
                        <td className="px-2.5 py-2.5 align-top">
                          <Typography variant="table-cell" asChild>
                            <span>{role}</span>
                          </Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : (
          moreCount
        ))}
    </span>
  );
}

// Target sits immediately after Closed — the two are read as a pair
// (achieved against goal), and any column between them would break that
// adjacency. Deals and Leads carry the same closed/total ratio as the dashboard
// widget they drill in from.
const COLUMNS = [
  { key: "closed", label: S.columnClosed, align: "right" as const, emphasis: true },
  { key: "target", label: S.columnTarget, align: "right" as const },
  { key: "orders", label: S.columnDeals, align: "right" as const },
  { key: "leads", label: S.columnLeads, align: "right" as const },
];

interface SalesLeaderboardProps {
  /** Page-level slice — period, range and the filter bar's facets. */
  params: SalesTeamRevenueParams;
  paging: InsightPaging;
  onRefine: (owner: FacetValue) => void;
}

export function SalesLeaderboard({
  params,
  paging,
  onRefine,
}: SalesLeaderboardProps) {
  // Same shape as the dashboard widget's search: local raw input, debounced
  // before it reaches the query, sent as the endpoint's `search` param so the
  // server filters the whole scope — not just the page on screen.
  const { raw: rawQuery, setRaw: setRawQuery, applied: search } = useSalesTeamSearch();
  // The role rides the URL (`?role=`): set on the board's Sales Team card, carried
  // here by "Show all", and editable here too — never an invisible filter (DF-12).
  const { role, setRole } = useInsightView();
  const roleFacetValue: FacetValue[] = role ? [{ id: role, label: role }] : [];

  // §16.7 — a filter change invalidates the page index. Without this, searching
  // from page 3 asks the server for page 3 of a result set that may now have
  // one page, and the table renders empty with no clue why.
  //
  // Guarded on the PREVIOUS search value, not on the effect's deps alone:
  // `useInsightPaging` builds a fresh `setPage` closure on every render (it
  // closes over the live `URLSearchParams`), so `[search, setPage]` changes on
  // every render — including the one caused by clicking "next page". An
  // unguarded effect therefore reset the page to 1 immediately after every page
  // change, and the pager looked dead. The ref makes the reset fire only when
  // the debounced search actually changes.
  const { setPage } = paging;
  const prevFilter = useRef(`${search}|${role ?? ""}`);
  useEffect(() => {
    const key = `${search}|${role ?? ""}`;
    if (prevFilter.current === key) return;
    prevFilter.current = key;
    setPage(1);
  }, [search, role, setPage]);

  const { data, isLoading, isFetching, isError, error } = useSalesTeamRevenue({
    ...params,
    search: search || undefined,
    roles: role ? [role] : undefined,
    page: paging.page,
    page_size: paging.pageSize,
  });

  const rows = data?.rows ?? [];

  return (
    <InsightRankingTable
      title={S.leaderboardTitle}
      why={S.leaderboardWhy}
      span={6}
      columns={COLUMNS}
      toolbar={
        <div className="mb-2 flex items-center gap-2">
          <Input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder={S.searchPlaceholder}
            maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
            aria-label={S.searchPlaceholder}
            className="h-8 min-w-0 flex-1"
          />
          <SalesTeamActions
            roles={roleFacetValue}
            roleOptions={data?.roles}
            totalUsers={data?.total_users}
            onRolesChange={(next) => setRole(next[0]?.id ?? null)}
          />
        </div>
      }
      // Page 2 starts at rank 11 — a rank is the row's place in the whole scope,
      // not its index on this page.
      rankOffset={(paging.page - 1) * paging.pageSize}
      state={
        isLoading ? (
          <InsightShimmer />
        ) : isError ? (
          // A 403 must read as "you don't have permission", not "failed to load".
          <LoadErrorState error={error} fallback={S.loadError} compact />
        ) : undefined
      }
      rows={rows.map((r) => ({
        name: r.name,
        // `roles` is optional on the wire (it defaults to `[]` server-side) and
        // an empty list is a real state — a rep holding no live role. No
        // sub-line at all then, rather than a muted em-dash that says nothing.
        sub: r.roles?.length ? <RoleLine roles={r.roles} /> : undefined,
        cells: {
          // `achieved` is a decimal STRING on the wire (`DecimalAsString`
          // server-side — float would lose paise above ~9e15), handed to the
          // shared formatter, which takes `number | string`, rather than
          // templated.
          closed: { text: formatINRShort(r.achieved) },
          // `target` — the PERIOD-specific figure from `user_sales_targets`
          // (plan.md: monthly=stored month col, quarterly=stored quarter
          // col, yearly=annual_target). Flipping the toolbar period changes
          // which column the backend reads — matches the user's expectation
          // of "monthly filter -> this month's target", not an unchanging
          // annual number. The response also carries `yearly_target` as the
          // always-annual anchor if a tooltip ever needs it.
          //
          // Null is a rep with no target set — an em-dash, NOT `formatINRShort(0)`,
          // which would print "₹0" and read as a goal they have already cleared.
          target: {
            text: r.target == null ? S.noTarget : formatINRShort(r.target),
          },
          // Closed over owned, the same pair the dashboard widget shows. `text`
          // carries the plain form; `node` is the two-tone rendering.
          orders: {
            text: W.ratio(r.deal_count, r.deal_total),
            node: <Ratio count={r.deal_count} total={r.deal_total} unit={W.unitDeals} />,
          },
          leads: {
            text: W.ratio(r.lead_count, r.lead_total),
            node: <Ratio count={r.lead_count} total={r.lead_total} unit={W.unitLeads} />,
          },
        },
      }))}
      // The row reports the USER, not just the name: `user_ids` is what the
      // query filters on.
      onRowClick={(name) => {
        const row = rows.find((r) => r.name === name);
        if (row) onRefine({ id: row.user_id, label: row.name });
      }}
      // Rendered whenever there are rows — NOT gated on `page_count > 1`.
      //
      // That gate was a one-way trap: the page-size dropdown lives inside this
      // footer, so raising the size until every row fit one page (page_count
      // === 1) unmounted the very control needed to lower it again, and the
      // "Showing 1–N of N" line went with it. Always rendering also matches
      // every other pager in the app (TasksListBody, RolesPermissionsBody) —
      // this cell was the odd one out.
      //
      // Still gated on `total > 0`: an empty result has page_count 0, and a
      // pager over an empty table is noise the empty state already covers.
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
