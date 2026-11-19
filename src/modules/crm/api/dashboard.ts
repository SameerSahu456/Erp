import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import {
  FIRST_PAGE,
  type PageParams,
  type PageResponse,
} from "@/shared/api/pagination";
import { PAGINATION } from "@/shared/constants";
import type { components, operations } from "@/shared/api/schema.gen";

// ─── CRM dashboard — Sales Team revenue ──────────────────────────────────
// Wire types are GENERATED, never hand-written (CLAUDE.md §1). Backend:
// app/modules/crm/api/v1/dashboard/revenue_report/sales_team_revenue.py

export type SalesTeamRevenueResponse =
  components["schemas"]["SalesTeamRevenueResponse"];
export type SalesTeamRevenueRow = components["schemas"]["SalesTeamRevenueRow"];
export type SalesTeamRevenueTotals =
  components["schemas"]["SalesTeamRevenueTotals"];

/** One role held by ≥1 user in the report, with its user count.
 *
 *  Rides along on the report response (`SalesTeamRevenueResponse.roles`) —
 *  there is NO separate request for it, and it is UNPAGINATED: the counts span
 *  every user in the filtered set, not the current page.
 *
 *  Computed server-side BEFORE the `roles` filter, so selecting one role
 *  leaves the rest in the list and a second can be added. That is what makes
 *  the multi-select work.
 *
 *  `name` is the wire value for `?roles=` — `id` is a number and would 422.
 *  `user_count` values do NOT sum to `pagination.total` (multi-role users are
 *  counted twice; role-less ones land in `users_without_role`), so never
 *  render them as a share of the total.
 *
 *  The "All" figure beside these is `SalesTeamRevenueResponse.total_users` —
 *  the same set counted distinctly, on the same pre-`roles` basis. Do NOT use
 *  `pagination.total` for it: that is post-filter, so it reports the selected
 *  role's size the moment one is picked. */
export type SalesTeamRoleFacet = components["schemas"]["SalesTeamRoleFacet"];

export type RevenueResponse = components["schemas"]["RevenueResponse"];
export type RevenueBucket = components["schemas"]["RevenueBucket"];

/** Rolling-window presets + a custom range. Presets ignore `start`/`end` and
 *  compute the window from today; `custom` requires both. */
export type DashboardPeriod =
  "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

/** `AccountTypeLiteral` on the backend. */
export type DashboardAccountType =
  "End Customer" | "Channel Partner" | "Cloud / Data Center" | "End User";

/** IMS `ConditionEnum` — the wire values, not the display labels. */
export type DashboardCondition = "new" | "refurbished" | "new_pull";

/** The "No Condition" filter value, sent as the literal
 *  `?conditions=no-condition`.
 *
 *  `sales_order_items.condition` is nullable — freeform SO lines carry no
 *  condition, and the condition-mix / by-source reports already return them as
 *  their own bucket (wire key `no_condition`, see
 *  `INSIGHTS_STRINGS.conditionLabels`). The enum values cannot express "that
 *  bucket": `?conditions=new` narrows to rows tagged `new`, so the untagged
 *  rows are reachable only by asking for them explicitly.
 *
 *  BACKEND CONTRACT: seeing this token in `?conditions=` means "rows where
 *  `condition IS NULL`", OR-ed with any real enum values sent alongside it
 *  (`?conditions=new&conditions=no-condition` → `new` rows plus untagged ones).
 *  It is NOT a member of `ConditionEnum`, so the param has to be widened
 *  (`str` / its own Literal) before the enum coercion, or FastAPI 422s first.
 *
 *  The exact spelling is HYPHENATED here, unlike the report's `no_condition`
 *  response key. ONE constant, so the facet option, the URL validator and the
 *  wire can never drift — if the two spellings are unified later, this is the
 *  only line that changes. */
export const NO_CONDITION_ID = "no-condition";

/** What `?conditions=` accepts: the enum, plus the no-condition sentinel. */
export type DashboardConditionFilter =
  DashboardCondition | typeof NO_CONDITION_ID;

export interface SalesTeamRevenueParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  roles?: string[];
  search?: string;
  /** Sent REPEATED (`?type=A&type=B`), like every other list param. The backend
   *  honours the full list — rows matching ANY of the selected account types. */
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens (`?months=2026-01&months=2026-07`). A
   *  record-level date filter intersected with the period window — `period`
   *  still picks the bucket size. Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  page?: number;
  page_size?: number;
}

/** Drop empty arrays so they don't serialise as `?user_ids=` (which the
 *  backend would parse as a single empty value rather than "unset"). */
const list = (v: string[] | undefined) => (v && v.length > 0 ? v : undefined);

export async function fetchSalesTeamRevenue(
  params: SalesTeamRevenueParams,
): Promise<SalesTeamRevenueResponse> {
  return apiClient.get<SalesTeamRevenueResponse>(
    endpoints.crm.dashboardSalesTeam,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        search: params.search?.trim() || undefined,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        roles: list(params.roles),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  );
}

// ─── CRM dashboard — Revenue by time bucket ──────────────────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/revenue.py
//
// Same filter vocabulary as SalesTeamRevenueParams MINUS `search` + `roles`,
// which this endpoint does not accept — hence a separate type rather than a
// reuse: passing an unknown param is how a filter silently stops filtering.
//
// NOTE on `period`: this endpoint reads it as the BUCKET SIZE, not the window.
// Every preset spans "Apr 1 of the current Indian FY → today"; only `custom`
// uses `start`/`end`. `hierarchy_wise_report` reads the SAME param as a
// rolling window (monthly = last 30 days), so the two widgets legitimately
// show different ranges for one toolbar setting. The response carries its own
// `period.start`/`period.end` — render them rather than inferring the window.

/** What each bucket counts. This endpoint is ONE time-series with three
 *  subjects dispatched by this param — not three endpoints:
 *
 *    * `closed_orders` (default) — SOs with an Approved line. `revenue` is the
 *      SO value; this is the Revenue Trend / SO Closed Value series.
 *    * `closed_leads` — leads in a terminal stage. `revenue` is ALWAYS 0
 *      (leads carry no money), so read `count`.
 *    * `closed_deals` — direct deals at `closed_won`. Both `count` and
 *      `revenue` are meaningful.
 *
 *  Filters that do NOT narrow every metric, because leads/deals carry no
 *  product columns — the backend accepts and ignores them (no 422):
 *  `conditions` / `category_ids` / `oem_ids` on `closed_leads`, and
 *  `conditions` / `oem_ids` on `closed_deals`.
 *
 *  Backend: `revenue.py` docstring. */
export type RevenueMetric = components["schemas"]["RevenueMetric"];

export interface RevenueParams {
  period: DashboardPeriod;
  /** Omitted → backend defaults to `closed_orders` (the legacy behaviour). */
  metric?: RevenueMetric;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  /** Sent REPEATED (`?type=A&type=B`), like every other list param. The backend
   *  honours the full list — buckets narrow to ANY of the selected types. */
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — a record-level date filter intersected with the
   *  period window (bucket size unchanged). Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  page?: number;
  page_size?: number;
  /** Skip every visibility lane so the response reflects the `account_ids`
   *  filter alone. Sent by the Account 360° tab; omitted everywhere else. */
  bypass_visibility?: boolean;
}

export async function fetchRevenue(
  params: RevenueParams,
): Promise<RevenueResponse> {
  return apiClient.get<RevenueResponse>(endpoints.crm.dashboardRevenue, {
    params: {
      period: params.period,
      metric: params.metric,
      // Only meaningful for `custom`; the backend ignores them otherwise.
      start: params.start,
      end: params.end,
      type: list(params.type),
      months: list(params.months),
      // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
      user_ids: list(params.user_ids),
      conditions: list(params.conditions),
      category_ids: list(params.category_ids),
      oem_ids: list(params.oem_ids),
      account_ids: list(params.account_ids),
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      bypass_visibility: params.bypass_visibility,
    },
  });
}

// ─── CRM dashboard — Revenue by source (account / category / OEM) ────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/revenue_by_source.py
//
// ONE endpoint, three groupings, dispatched by `report_type`. The Accounts,
// Category and OEM breakdown cells all run this — same filter vocabulary, so
// they can never disagree about what a filter means.
//
// Differences from the two endpoints above, each verified against a running
// backend rather than read off the source:
//
//   * NO `roles` param. FastAPI drops unknown query params silently, so sending
//     it would 200 and quietly NOT filter — a filter that stops filtering. It is
//     absent from this type on purpose; do not "helpfully" add it.
//   * `search` has `min_length=1` — an empty string is a 422, not "unfiltered".
//     Hence the `|| undefined` below; it is load-bearing, not a tidy-up.
//   * Money (`value_closed`) is a JSON NUMBER here (DecimalAsFloat), unlike the
//     decimal STRINGS the other two send. `formatINRShort` takes either.
//   * Out-of-scope `user_ids` → 403 DASHBOARD_SCOPE_DENIED, not empty rows.
//     Route the error through `LoadErrorState` so it reads as "no access".

export type RevenueBySourceResponse =
  components["schemas"]["RevenueBySourceResponse"];
export type RevenueBySourceRow = components["schemas"]["RevenueBySourceRow"];
export type RevenueBySourceTotals =
  components["schemas"]["RevenueBySourceTotals"];
/** One user credited with closing orders on an account, in the current slice.
 *  Present on `report_type=account` rows only, and populated for the RETURNED
 *  PAGE only — the backend scopes the closer scan to the sliced rows because
 *  `share` / `totals` are computed over the full pre-pagination set.
 *
 *  `user_id` is `sales_orders.submitted_by_id`, which the backend stamps from
 *  the SO's SOURCE OWNER (the lead's `assigned_to` / deal's `owner_id`), not
 *  from whoever clicked Submit — so label this "Closed By", never
 *  "Submitted By". A manager raising an order for a rep credits the rep. */
export type AccountCloser = components["schemas"]["AccountCloser"];

/** The grouping dimension — the endpoint's dispatch key. `condition` groups by
 *  `sales_order_items.condition`; freeform lines come back as a "No Condition"
 *  row whose `extra_metadata.condition` is null. */
export type DashboardReportType =
  | "account"
  | "category"
  | "oem"
  | "condition"
  | "account_type_wise"
  /** Top Products — rows grouped per `part_variant_id`. Unlike every other
   *  report type this one emits TWO `extra_metadata` shapes: catalog rows carry
   *  `is_freeform: false` plus part/SKU/category/OEM identity, while every
   *  freeform SO line collapses into a single `is_freeform: true` "Other" row
   *  carrying no identity fields at all. Discriminate on `is_freeform` before
   *  reading any of them. */
  | "top_products";

export interface RevenueBySourceParams {
  report_type: DashboardReportType;
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — record-level date filter intersected with the
   *  period window. Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  /** Omitted when blank — `min_length=1` (see the note above). */
  search?: string;
  page?: number;
  page_size?: number;
  /** Skip every visibility lane so the response reflects the `account_ids`
   *  filter alone. Sent by the Account 360° tab; omitted everywhere else. */
  bypass_visibility?: boolean;
}

/** A tile's server-built drill-down target — see `TileDrilldown` on the backend.
 *  `params` arrives as an opaque dict because the endpoint it targets is chosen
 *  server-side.
 *
 *  Two different questions get asked of a block, and they must not be confused:
 *  `drilldownKind` asks WHETHER the FE can render this target at all (any of
 *  the four), while the `to*Params` narrowers below each read the dict for ONE
 *  endpoint and return `null` for the rest. Gate a tile's clickability on the
 *  former; use the latter only inside the branch that already matched. */
export type TileDrilldown = components["schemas"]["TileDrilldown"];

/** The path `TileDrilldown.endpoint` carries when the target is by-source.
 *  Compared, never concatenated — if the backend ever points a tile somewhere
 *  else, the mismatch must fail closed rather than send by-source params to
 *  another route. */
const BY_SOURCE_DRILLDOWN_ENDPOINT = "/crm/dashboard/revenue/by-source";
/** The other three targets a tile can point at. Same compare-never-concatenate
 *  rule: each narrower returns `null` unless the block names ITS endpoint, so a
 *  block aimed elsewhere renders the tile inert instead of being coerced into
 *  the wrong request. */
const RECORDS_DRILLDOWN_ENDPOINT = "/crm/dashboard/records";
const TOP_ORDERS_DRILLDOWN_ENDPOINT = "/crm/dashboard/revenue/top-orders";
const AOV_BY_CATEGORY_DRILLDOWN_ENDPOINT =
  "/crm/dashboard/insights/avg-order-value/by-category";

/** Every drill-down target the FE knows how to render. Used by the tile
 *  drill-down page to pick a body; a block naming anything else is treated as
 *  no drill-down at all, which is the safe direction to fail. */
export type DrilldownKind =
  "by-source" | "records" | "top-orders" | "aov-by-category";

export function drilldownKind(
  drilldown: TileDrilldown | null | undefined,
): DrilldownKind | null {
  switch (drilldown?.endpoint) {
    case BY_SOURCE_DRILLDOWN_ENDPOINT:
      return "by-source";
    case RECORDS_DRILLDOWN_ENDPOINT:
      return "records";
    case TOP_ORDERS_DRILLDOWN_ENDPOINT:
      return "top-orders";
    case AOV_BY_CATEGORY_DRILLDOWN_ENDPOINT:
      return "aov-by-category";
    default:
      return null;
  }
}

const asStringArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((x) => typeof x === "string") && v.length > 0
    ? (v as string[])
    : undefined;

/** Narrow a server-built drill-down block into params `fetchRevenueBySource`
 *  can take. Returns `null` when the block targets a different endpoint or is
 *  missing the fields that make it usable.
 *
 *  The values are NOT re-derived here, and that is the point: `period`, `start`
 *  and `end` are copied verbatim from what the tile computed. Recomputing them
 *  client-side is exactly the bug this block exists to prevent — the tile
 *  bundle resolves presets to FY-to-date while by-source resolves `monthly`
 *  to the current calendar month, so a locally-rebuilt window would open a
 *  one-month drill-down under an FY-to-date tile. Same for Peak: the winning
 *  bucket depends on the active filters and the tile only ships a label
 *  ("Aug"), so its range cannot be reconstructed here at all.
 *
 *  This validates SHAPE, not truth — the payload is server-authored, so the
 *  job is to keep TypeScript honest about an `unknown` dict, not to defend
 *  against a hostile value the way `§11.1` requires for URL params. */
export function toRevenueBySourceParams(
  drilldown: TileDrilldown | null | undefined,
): RevenueBySourceParams | null {
  if (!drilldown || drilldown.endpoint !== BY_SOURCE_DRILLDOWN_ENDPOINT)
    return null;

  const p = drilldown.params;
  const reportType = p.report_type;
  const period = p.period;
  if (typeof reportType !== "string" || typeof period !== "string") return null;

  // `custom` without both bounds is the one combination the backend 422s on,
  // and it is also the shape every block from this endpoint should have.
  const start = typeof p.start === "string" ? p.start : undefined;
  const end = typeof p.end === "string" ? p.end : undefined;
  if (period === "custom" && (!start || !end)) return null;

  return {
    report_type: reportType as DashboardReportType,
    period: period as DashboardPeriod,
    start,
    end,
    user_ids: asStringArray(p.user_ids),
    type: asStringArray(p.type) as DashboardAccountType[] | undefined,
    months: asStringArray(p.months),
    conditions: asStringArray(p.conditions) as
      DashboardConditionFilter[] | undefined,
    category_ids: asStringArray(p.category_ids),
    oem_ids: asStringArray(p.oem_ids),
    account_ids: asStringArray(p.account_ids),
    page: typeof p.page === "number" ? p.page : 1,
    page_size: typeof p.page_size === "number" ? p.page_size : undefined,
  };
}

/** The window + facet fields every block carries, narrowed once.
 *
 *  `null` when `period === "custom"` without both bounds — the one shape the
 *  backends 422 on, and the shape every block from this endpoint should have.
 *  Shared so the three narrowers below cannot disagree about what a usable
 *  block looks like. */
function commonDrilldownParams(drilldown: TileDrilldown) {
  const p = drilldown.params;
  const period = p.period;
  if (typeof period !== "string") return null;

  const start = typeof p.start === "string" ? p.start : undefined;
  const end = typeof p.end === "string" ? p.end : undefined;
  if (period === "custom" && (!start || !end)) return null;

  return {
    period: period as DashboardPeriod,
    start,
    end,
    user_ids: asStringArray(p.user_ids),
    months: asStringArray(p.months),
    conditions: asStringArray(p.conditions) as
      DashboardConditionFilter[] | undefined,
    category_ids: asStringArray(p.category_ids),
    oem_ids: asStringArray(p.oem_ids),
    account_ids: asStringArray(p.account_ids),
    page: typeof p.page === "number" ? p.page : 1,
    page_size: typeof p.page_size === "number" ? p.page_size : undefined,
  };
}

/** Narrow a server-built block into `fetchRecords` params.
 *
 *  Note the ACCOUNT-TYPE rename: `/records` spends `type` on the record type
 *  (lead / deal / quote / sales_order), so the account-type facet arrives as
 *  `account_type`. The server builds it that way; this only has to read it
 *  back under the right name.
 *
 *  `status` is copied through verbatim and matters: the AOV tiles pin
 *  `["Approved"]` so the panel does not re-admit `PartiallyApproved` rows the
 *  tile never counted. */
export function toRecordsDrilldownParams(
  drilldown: TileDrilldown | null | undefined,
): RecordsParams | null {
  if (!drilldown || drilldown.endpoint !== RECORDS_DRILLDOWN_ENDPOINT)
    return null;
  const common = commonDrilldownParams(drilldown);
  if (!common) return null;

  const p = drilldown.params;
  if (typeof p.type !== "string") return null;

  return {
    ...common,
    type: p.type as RecordType,
    metric:
      typeof p.metric === "string" ? (p.metric as RecordMetric) : undefined,
    account_type: asStringArray(p.account_type) as
      DashboardAccountType[] | undefined,
    status: asStringArray(p.status) as SalesOrderStatus[] | undefined,
    stage: asStringArray(p.stage),
    cohort:
      p.cohort === "new_accounts" || p.cohort === "inactive_accounts"
        ? p.cohort
        : undefined,
    cohort_until:
      typeof p.cohort_until === "string" ? p.cohort_until : undefined,
  };
}

/** Narrow a server-built block into `fetchTopOrders` params. */
export function toTopOrdersDrilldownParams(
  drilldown: TileDrilldown | null | undefined,
): TopOrdersParams | null {
  if (!drilldown || drilldown.endpoint !== TOP_ORDERS_DRILLDOWN_ENDPOINT)
    return null;
  const common = commonDrilldownParams(drilldown);
  if (!common) return null;
  return {
    ...common,
    type: asStringArray(drilldown.params.type) as
      DashboardAccountType[] | undefined,
  };
}

/** Narrow a server-built block into `fetchAvgOrderValueByCategory` params.
 *
 *  No `status` to carry: that endpoint is strictly-`Approved` by construction,
 *  which is exactly why the AOV bundle's headline tile points here. */
export function toAovByCategoryDrilldownParams(
  drilldown: TileDrilldown | null | undefined,
): AvgOrderValueByCategoryParams | null {
  if (!drilldown || drilldown.endpoint !== AOV_BY_CATEGORY_DRILLDOWN_ENDPOINT)
    return null;
  const common = commonDrilldownParams(drilldown);
  if (!common) return null;
  return {
    ...common,
    type: asStringArray(drilldown.params.type) as
      DashboardAccountType[] | undefined,
  };
}

export async function fetchRevenueBySource(
  params: RevenueBySourceParams,
): Promise<RevenueBySourceResponse> {
  return apiClient.get<RevenueBySourceResponse>(
    endpoints.crm.dashboardRevenueBySource,
    {
      params: {
        report_type: params.report_type,
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        // `""` would 422 — omit rather than send an empty search.
        search: params.search?.trim() || undefined,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        bypass_visibility: params.bypass_visibility,
      },
    },
  );
}

// ─── CRM dashboard — Avg Order Value by category ─────────────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/
//          avg_order_value_by_category.py
//
// Row = one IMS category. Per-row AOV = SUM(sales_order_items.amount) /
// COUNT(DISTINCT sales_orders.id) over the strict-`Approved` SO universe.
//
// The filter set is `RevenueBySourceParams` MINUS `report_type` — this
// endpoint groups by category and nothing else, so there is no dispatch key.
// It is deliberately NOT folded into `fetchRevenueBySource`: different route,
// different row shape (see below).
//
// Differences from by-source that bite if missed, each verified against a
// running backend rather than read off the source:
//
//   * Mounted under `/dashboard/insights`, NOT `/dashboard/revenue`
//     (`/revenue/avg-order-value/by-category` → 404).
//   * Rows carry NO `share`. Only `avg_order` + `orders`, so the ranking table
//     renders two columns rather than by-source's three.
//   * Row identity is a real `category_details: { id, name }` object — there is
//     no `extra_metadata` bag to cast through for the drill-in id.
//   * `rank` is assigned across the WHOLE result set, not per page (verified:
//     `?page=2&page_size=5` on a 6-row set returns rank 6). Never re-derive it.
//   * Money is a JSON NUMBER (DecimalAsFloat). `formatINRShort` takes either.
//   * `search` has `min_length=1` — `""` is a 422, hence the `|| undefined`.
//   * `totals.avg_order` is the WINDOW AOV (Σ value ÷ Σ orders), not the mean
//     of the per-row AOVs — do not recompute it by averaging `rows`.
//   * Out-of-scope `user_ids` → 403, not empty rows. Route the error through
//     `LoadErrorState` so it reads "no access", not "failed to load".

export type AvgOrderValueByCategoryResponse =
  components["schemas"]["AvgOrderValueByCategoryResponse"];
export type AvgOrderValueByCategoryRow =
  components["schemas"]["AvgOrderValueByCategoryRow"];
export type AvgOrderValueByCategoryTotals =
  components["schemas"]["AvgOrderValueByCategoryTotals"];

export interface AvgOrderValueByCategoryParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — record-level date filter intersected with the
   *  period window. Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  /** Omitted when blank — `min_length=1` (see the note above). */
  search?: string;
  page?: number;
  page_size?: number;
}

export async function fetchAvgOrderValueByCategory(
  params: AvgOrderValueByCategoryParams,
): Promise<AvgOrderValueByCategoryResponse> {
  return apiClient.get<AvgOrderValueByCategoryResponse>(
    endpoints.crm.dashboardAvgOrderValueByCategory,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        // `""` would 422 — omit rather than send an empty search.
        search: params.search?.trim() || undefined,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  );
}

// ─── CRM dashboard — Allowed users (the User filter's source) ────────────
// Backend: app/modules/crm/api/v1/dashboard/allowed_users.py
//
// The user picker on every dashboard widget reads THIS, not `/api/v1/users`.
// It returns the exact set the caller may pass back as `user_ids`, resolved by
// the same scope rules the widgets enforce (superadmin → all; manager → self +
// subtree; PM/APM → hierarchy ∪ PM-scope submitters). The generic users list is
// org-wide, so it offered people the widgets would then reject with a 403
// DASHBOARD_SCOPE_DENIED — picking them blanked the board.
//
// Contract differences from the sibling dashboard endpoints, each verified
// against a running backend rather than read off the source:
//
//   * Paginates by `offset` / `limit` (limit ≤ 200), NOT `page` / `page_size`.
//     The response echoes both back, so "is there more" is
//     `offset + items.length < total`.
//   * `is_active` defaults to TRUE server-side. Passing it explicitly keeps
//     the intent visible at the call site.
//   * Rows carry `roles: string[]` (names) — handy if the picker ever wants to
//     group or annotate by role.
//
// TYPES ARE HAND-WRITTEN, not from `schema.gen.ts`, which is the exception to
// CLAUDE.md §1. The dashboard backend this endpoint lives on currently serves a
// narrower OpenAPI than the one the committed `schema.gen.ts` was generated
// from (533 schemas vs 818), so regenerating to pick these up would delete ~295
// schemas the rest of the app compiles against. Swap these for
// `components["schemas"]["AllowedUsers*"]` as soon as one backend serves the
// whole surface again.

/** One row in the dashboard user picker. Field-compatible with the admin
 *  `UserListItem`, so `getUserDisplayName` renders it unchanged. */
export interface AllowedUsersItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  last_login_at: string | null;
  manager_ids: string[];
  roles: string[];
  channel_tags?: string[] | null;
}

export interface AllowedUsersResponse extends PageResponse<AllowedUsersItem> {
  stats: { total: number; active: number; inactive: number };
}

export interface AllowedUsersParams extends PageParams {
  search?: string;
  /** Role NAMES, repeated on the wire — narrows within the allowed set. */
  roles?: string[];
  /** Defaults to true server-side; sent explicitly so the intent is visible. */
  is_active?: boolean;
}

export async function fetchAllowedUsers(
  params: AllowedUsersParams,
): Promise<AllowedUsersResponse> {
  return apiClient.get<AllowedUsersResponse>(
    endpoints.crm.dashboardAllowedUsers,
    {
      params: {
        // `""` would be a pointless filter — omit rather than send it.
        search: params.search?.trim() || undefined,
        roles: list(params.roles),
        is_active: params.is_active ?? true,
        page: params.page ?? FIRST_PAGE,
        // Server caps at 200.
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      },
    },
  );
}

// ─── CRM dashboard — Summary (the 7-tile strip) ──────────────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/summary.py
//
// Notes that cost debugging time if missed:
//   * This is a scalar widget: no pagination, no search. `SummaryQuery` is
//     `extra="forbid"`, but that guards the model the ROUTE builds, not the
//     query string — FastAPI binds params individually and silently ignores
//     extras (verified: `?page=1` → 200, not 422). So a stray param does not
//     error, it just misleads the next reader. Send only what's below.
//   * `Ratio.rate` is a FRACTION (0.4444), not a percent. Convert at the
//     component boundary; `null` when the denominator is 0.
//   * `lead_to_order_rate` CAN exceed 1.0 — orders closed in the window need
//     not descend from leads created in it. The tile caps its bar at 100%.
//   * Visibility is applied server-side per role, same as `/revenue/by-source`
//     — out-of-scope `user_ids` → 403, so route errors through LoadErrorState.

export type SummaryResponse = components["schemas"]["SummaryResponse"];
export type SummaryRatio = components["schemas"]["Ratio"];
// Hand-written, NOT generated — the backend has `lead_to_order_time` commented
// out of `SummaryResponse` (schemas/dashboard/revenue_report/summary.py), so
// both the field and the `TimeAvg` schema are absent from the current OpenAPI
// dump. The tile that consumes it is already conditional, so it simply never
// renders until the backend re-enables the field; keeping the shape here means
// that is a one-line revert rather than a re-write.
export interface SummaryTimeAvg {
  avg_days: number | null;
  n: number;
}

export interface SummaryParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — the tiles narrow to these months with the rest
   *  of the board. Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  /** Skip every visibility lane so the response reflects the `account_ids`
   *  filter alone. Sent by the Account 360° tab; omitted everywhere else. */
  bypass_visibility?: boolean;
}

export async function fetchSummary(
  params: SummaryParams,
): Promise<SummaryResponse> {
  return apiClient.get<SummaryResponse>(endpoints.crm.dashboardSummary, {
    params: {
      period: params.period,
      // Only meaningful for `custom`; the backend ignores them otherwise.
      start: params.start,
      end: params.end,
      type: list(params.type),
      months: list(params.months),
      user_ids: list(params.user_ids),
      conditions: list(params.conditions),
      category_ids: list(params.category_ids),
      oem_ids: list(params.oem_ids),
      account_ids: list(params.account_ids),
      bypass_visibility: params.bypass_visibility,
    },
  });
}

// ─── CRM dashboard — Summary-tile drill-down records ─────────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/records.py
//
// The list of items sitting behind ANY summary tile (or either side of a ratio
// tile), dispatched by `type` + `metric`. `header.total_count` equals the tile
// numeric it drills into — the same WHERE clause runs, so the modal always
// reconciles with the tile face value.
//
// NOTE on `account_type`: this endpoint renamed the account-type filter to
// `account_type` (the other dashboard endpoints call it `type`) to avoid a
// collision with the record-`type` param. The FE's summary filter bar still
// calls it `type`, so the drill-down maps `SummaryParams.type` → `account_type`
// here. It is honoured as a repeated list server-side, the same contract as
// `type` on `/revenue`.

export type RecordType = components["schemas"]["RecordType"];
/** The two SO statuses `/records` will narrow to.
 *
 *  Derived from the OPERATION, not from a named schema: the backend declares
 *  the param as an inline `Literal`, so `openapi-typescript` emits it inline
 *  too and there is no `components["schemas"]` entry to point at. Reading it
 *  off the generated query type keeps this honest anyway — widen the literal
 *  server-side and this alias follows without a hand edit. */
export type SalesOrderStatus = NonNullable<
  operations["dashboard_records_api_v1_crm_dashboard_records_get"]["parameters"]["query"]["status"]
>[number];
export type RecordMetric = components["schemas"]["RecordMetric"];
export type RecordsResponse = components["schemas"]["RecordsResponse"];
export type OrderItem = components["schemas"]["OrderItem"];
/** `lead:won` rows — order columns without the deal, plus the lead's rep. */
export type LeadOrderItem = components["schemas"]["LeadOrderItem"];
export type QuoteItem = components["schemas"]["QuoteItem"];
export type LeadItem = components["schemas"]["LeadItem"];

export interface RecordsParams {
  /** Which entity the panel lists. Required — there is no default type. */
  type: RecordType;
  /** Which side of the tile: `total` (whole/denominator) or `won` (numerator).
   *  Omitted → backend defaults to `total`. */
  metric?: RecordMetric;
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  /** Account-type filter — sent as `account_type` (NOT `type`) on this
   *  endpoint. Sent repeated; the backend honours the full list. */
  account_type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — record-level date filter intersected with the
   *  period window, matching the tile it drills into. Omitted → no narrowing. */
  months?: string[];
  account_ids?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  /** Narrows the SO panels below the tile's own universe — pass `["Approved"]`
   *  to drop `PartiallyApproved`. The AOV drill-downs depend on it: without the
   *  pin the panel re-admits rows the strictly-Approved tile never counted, and
   *  the row total stops matching the tile face.
   *
   *  Undeclared on the route until 2026-08 — FastAPI silently dropped it — so
   *  an older backend accepts the param and ignores it rather than erroring. */
  status?: SalesOrderStatus[];
  /** `lead:total` only — narrows to specific lead stages. Same history as
   *  `status`: present on the query model long before the route declared it. */
  stage?: string[];
  /** Free-text search on the row's per-type identifier. Backend validates
   *  min-2-chars-after-strip; empty / one-char strings 422. Substring, case-
   *  insensitive. Matches SO # + Deal # on the deal panel, SO # on lead:won and
   *  sales_order:total, quote # on quote panels, lead code on lead:total. */
  q?: string;
  /** `<field>_<asc|desc>`; the allowed fields differ per record shape. Omitted
   *  → the backend picks the shape's own default. */
  /** `new_accounts` → only orders of accounts whose first-ever SO fell in the
   *  window. Sent by the New Accounts tiles' drill-down, never by a toolbar. */
  cohort?: "new_accounts" | "inactive_accounts";
  /** With `cohort: "inactive_accounts"`: the day the inactivity window ended
   *  (ISO date). The panel's own range is the PAST; "inactive" is decided
   *  over `[end, cohort_until]`. */
  cohort_until?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export async function fetchRecords(
  params: RecordsParams,
): Promise<RecordsResponse> {
  return apiClient.get<RecordsResponse>(endpoints.crm.dashboardRecords, {
    params: {
      type: params.type,
      metric: params.metric,
      period: params.period,
      // Only meaningful for `custom`; the backend ignores them otherwise.
      start: params.start,
      end: params.end,
      user_ids: list(params.user_ids),
      account_type: list(params.account_type),
      months: list(params.months),
      account_ids: list(params.account_ids),
      conditions: list(params.conditions),
      category_ids: list(params.category_ids),
      oem_ids: list(params.oem_ids),
      status: list(params.status),
      stage: list(params.stage),
      cohort: params.cohort,
      cohort_until: params.cohort_until,
      q: params.q,
      sort: params.sort,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  });
}

// ─── CRM dashboard — Top Orders (ranked SO line items) ───────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/top_orders.py
//
// Each row is ONE approved sales-order LINE ITEM, ranked by
// `sales_order_items.amount DESC` — one SO can contribute several rows. This is
// NOT the by-source endpoint: the row shape is per-line (account + rep +
// condition + category · OEM + value), not a grouped aggregate, so it has its
// own response types and its own fetcher rather than riding `report_type`.
//
// Same contract notes as `/revenue/by-source`, each of which bites if missed:
//   * NO `roles` param — FastAPI drops unknown query params silently, so a
//     stray one would 200 and quietly NOT filter.
//   * `search` is `min_length=1` — an empty string is a 422, not "unfiltered";
//     hence the `|| undefined` below.
//   * Money (`value_closed`, `totals.value_closed`) is a JSON NUMBER
//     (DecimalAsFloat). `formatINRShort` takes it directly.
//   * Out-of-scope `user_ids` → 403, not empty rows — route through
//     `LoadErrorState` so it reads as "no access".

export type TopOrdersResponse = components["schemas"]["TopOrdersResponse"];
export type TopOrderRow = components["schemas"]["TopOrderRow"];
export type TopOrdersTotals = components["schemas"]["TopOrdersTotals"];

export interface TopOrdersParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  /** Sent REPEATED like every other list param; the backend matches any
   *  listed account type (union). */
  type?: DashboardAccountType[];
  /** `YYYY-MM` tokens — a record-level filter intersected with the period
   *  window, not a replacement for it. `period` still sets the bucket size. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
  /** Omitted when blank — `min_length=1` (see the note above). */
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── CRM dashboard — Sales Funnel (conversion by population) ─────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/sales_funnel.py
//
// FOUR rows, always, in the fixed order `[leads, deals, quotes,
// demo_requests]`, each carrying `total` / `converted` / `conv_rate`. A scalar
// widget in the same class as `/dashboard/summary`: NO `page` / `page_size` /
// `search` / `roles`.
//
// Contract notes, each verified against the backend source rather than assumed:
//
//   * `conv_rate` is ALREADY A PERCENT (0–100, rounded to 2 dp). This is the
//     opposite of `Ratio.rate` on `/dashboard/summary`, which is a FRACTION.
//     Multiplying by 100 here would render 15% as 1500%.
//   * `conv_rate` is null when `total === 0` — "no denominator", NOT "zero
//     percent". Render it muted with an empty bar, never 0% in danger red.
//   * `converted <= total` is enforced by a Pydantic validator, so a bar built
//     from `converted / total` can never exceed 100%.
//   * `conditions` / `oem_ids` are ACCEPTED AND IGNORED on every row's TOTAL —
//     no population here carries either column. `category_ids` is the
//     exception: it narrows the QUOTES row (via `quote_items.category_id`) and
//     the DEMO REQUESTS row (via `demo_request_items.category_id`), but not
//     leads or deals. All three still narrow the CONVERTED half of leads, deals
//     and demo requests, because that half hangs off `sales_order_items`, which
//     has all three columns. They are always SENT: the endpoint takes them
//     without a 422, and keeping them in the params means this card's query key
//     moves with the rest of the board, so it refetches in step with its
//     neighbours instead of looking frozen. Stripping them would be worse — the
//     card would silently not refetch on a product facet change and read as
//     stale data. `SalesFunnelCard` surfaces a footnote when one is active so
//     the partial no-op is visible, not mysterious.
//   * `period` resolves as a WINDOW here (`_resolve_window`, the same resolver
//     `/summary` uses), NOT as a bucket size like `/revenue`. So this card and
//     the revenue hero beside it legitimately cover different ranges for one
//     toolbar setting — render the response's own `period.start`/`period.end`.
//   * Out-of-scope `user_ids` → 403, not empty rows. Route the error through
//     `LoadErrorState` so it reads as "no access", not "failed to load".

export type SalesFunnelResponse = components["schemas"]["SalesFunnelResponse"];
export type SalesFunnelRow = components["schemas"]["SalesFunnelRow"];
export type SalesFunnelStage = components["schemas"]["SalesFunnelStage"];

//   * The Quotes row does NOT use the same `converted` rule as its siblings.
//     Leads / Deals / Demo Requests require an order that is the live revision
//     head, on a live account, with at least one APPROVED line. Quotes counts
//     any non-deleted linked SO — the Summary strip's QUOTE → SO WIN RATE
//     definition, matched on purpose so the card and that tile agree. It reads
//     HIGHER than the shared gate would give.
//   * The Demo Requests row reaches its order through
//     `demo_requests.sales_order_id`, the only DR→SO link there is.

export interface SalesFunnelParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  /** Sent REPEATED like every other list param; the backend matches any listed
   *  account type (`Lead.channel_type` for leads, the account's own
   *  `account_type` for deals). */
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — a record filter intersected with the window,
   *  narrowing on the SAME column the window uses (`created_at`). */
  months?: string[];
  account_ids?: string[];
  /** Accepted by the endpoint but NEVER forwarded to the query — see the
   *  "accepted and ignored" note above. Sent deliberately. */
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  /** How a lead's `company_name` is matched against `account_ids`. The backend
   *  defaults to `exact`; no UI exposes this, so it stays unset. */
  lead_account_match?: "exact" | "partial";
}

export async function fetchSalesFunnel(
  params: SalesFunnelParams,
): Promise<SalesFunnelResponse> {
  return apiClient.get<SalesFunnelResponse>(
    endpoints.crm.dashboardSalesFunnel,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
        lead_account_match: params.lead_account_match,
      },
    },
  );
}

// ─── CRM dashboard — Insights summary tiles (the 4-tile KPI strip) ───────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/insight_summary_tiles.py
//
// ONE endpoint, four tile bundles, dispatched by `report_type` — the strip that
// sits under the 7-tile Summary card on the Revenue by Month / Revenue by
// Account / Category & OEM / Channel vs End Customer pages. A scalar widget in
// the same class as `/dashboard/summary`: NO `page` / `page_size` / `search`.
//
// Contract notes, each read off the backend source rather than assumed:
//
//   * `data` is ALWAYS exactly 4 tiles, in a FIXED order per `report_type`.
//     The FE renders positionally (hence `TILE_ACCENTS` keyed by report type in
//     `RevenueCells.tsx`) — it does not match on `label`.
//   * `value` is a PRE-FORMATTED display string owned by the server
//     ("₹15.9Cr", "33%", "Intel", "7 / 7"). Do NOT re-format it and do NOT run
//     it through `formatINRShort` — it is already short-scale INR, and the
//     server owns the thresholds so this strip and the tiles beside it round
//     identically.
//   * `metadata` is ALWAYS an object, never null and never omitted. An
//     empty-metadata tile ships `{label: "", value: ""}`, so render
//     `metadata.value || undefined` rather than null-checking the field.
//   * `report_type` here is NOT the by-source `report_type`. The two enums
//     overlap on `account_type_wise` only; the rest differ — see
//     `InsightTilesReportType` vs `DashboardReportType`.
//   * Visibility is applied server-side per role, same as `/revenue/by-source`
//     — out-of-scope `user_ids` → 403, so route errors through LoadErrorState.

export type InsightSummaryTilesResponse =
  components["schemas"]["InsightSummaryTilesResponse"];
export type InsightTile = components["schemas"]["Tile"];
export type InsightTileMetadata = components["schemas"]["TileMetadata"];

/** Which tile bundle to compute. One value per Insights page that carries the
 *  strip — the mapping lives in `INSIGHT_TILES_REPORT_TYPE` (registry). */
export type InsightTilesReportType = components["schemas"]["ReportType-Output"];

export interface InsightSummaryTilesParams {
  report_type: InsightTilesReportType;
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — a record-level date filter intersected with
   *  the period window, exactly as on the cells below the strip. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
}

export async function fetchInsightSummaryTiles(
  params: InsightSummaryTilesParams,
): Promise<InsightSummaryTilesResponse> {
  return apiClient.get<InsightSummaryTilesResponse>(
    endpoints.crm.dashboardInsightSummaryTiles,
    {
      params: {
        report_type: params.report_type,
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

export async function fetchTopOrders(
  params: TopOrdersParams,
): Promise<TopOrdersResponse> {
  return apiClient.get<TopOrdersResponse>(endpoints.crm.dashboardTopOrders, {
    params: {
      period: params.period,
      // Only meaningful for `custom`; the backend ignores them otherwise.
      start: params.start,
      end: params.end,
      // `""` would 422 — omit rather than send an empty search.
      search: params.search?.trim() || undefined,
      type: list(params.type),
      months: list(params.months),
      // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
      user_ids: list(params.user_ids),
      conditions: list(params.conditions),
      category_ids: list(params.category_ids),
      oem_ids: list(params.oem_ids),
      account_ids: list(params.account_ids),
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  });
}

// ─── CRM dashboard — Period-wise breakdown ───────────────────────────────
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/period_wise_breakdown.py
//
// Row-per-bucket companion to the `revenue_by_month` KPI bundle. Notes that
// cost debugging time if missed:
//   * The bucket UNIT is the server's, not the toolbar's: `period` drives it
//     (monthly/custom → month, quarterly → quarter, yearly → year, weekly →
//     month-relative W1..W5) and the response echoes it as `bucket_unit`. Read
//     THAT for headers and labels — reading the request instead lets the header
//     disagree with the rows mid-refetch.
//   * NO `page` / `page_size` / `search` / `roles` — the endpoint has none. It
//     returns its WHOLE result set, bounded by the calendar (≤ 12 months / ≤ 4
//     quarters / 1 year / ~31 weeks in an FY-to-date window).
//   * Money is a JSON NUMBER here (`DecimalAsFloat`), unlike
//     `hierarchy_wise_report` where `achieved` is a decimal string. Format it,
//     don't parse it.
//   * `delta` / `delta_pct` are NEVER null. Row 0 is flagged by
//     `direction: "none"` — read the enum, don't test the index.
//   * `Σ rows[].revenue` reconciles 1:1 with `/dashboard/revenue?metric=
//     closed_orders` and the `revenue_by_month` tiles for the same query
//     string, which is why this shares the standard filter body.

export type PeriodWiseBreakdownResponse =
  components["schemas"]["PeriodWiseBreakdownResponse"];
export type PeriodWiseBreakdownRow =
  components["schemas"]["PeriodWiseBreakdownRow"];
export type BucketUnit = components["schemas"]["BucketUnit"];
export type BucketDirection = components["schemas"]["BucketDirection"];

export interface PeriodBreakdownParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  /** Repeated `YYYY-MM` tokens — record-level date filter intersected with the
   *  period window. Omitted → no month narrowing. */
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
}

export async function fetchPeriodBreakdown(
  params: PeriodBreakdownParams,
): Promise<PeriodWiseBreakdownResponse> {
  return apiClient.get<PeriodWiseBreakdownResponse>(
    endpoints.crm.dashboardPeriodBreakdown,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── Growth — `GET /crm/dashboard/growth` ───────────────────────────────────
//
// A SCALAR tile: this window's revenue against the previous FULL window. One
// request, no rows, no pager.
//
// Three things this endpoint does NOT share with its neighbours, each of which
// has bitten a sibling widget before:
//
//   * `period` is NARROWER than the board's. `GrowthPeriod` is
//     weekly|monthly|quarterly|yearly — there is **no `custom`**, because a
//     custom range has no well-defined "previous window" of equal length.
//     Sending `custom` is a guaranteed 422, so `toGrowthParams` coerces it.
//   * There is **no `months`, no `start`, no `end`.** Both windows are derived
//     from `period` alone and are calendar-strict (January compares against
//     December of the prior year; Q1 against Q4 of the prior year).
//   * `direction` is the SERVER's verdict and must be rendered as given.
//     `flat` is a BAND (|delta_pct| < 0.05), not `delta_pct === 0`, so deriving
//     the arrow from the sign of the percentage disagrees with the API near
//     zero — exactly the bug fixed in `PeriodicBreakdown`.
//
// `delta_pct` is never null. Zero-previous is ENCODED, not undefined:
// previous 0 + current > 0 → `+100.0`; both 0 → `0.0`; previous > 0 +
// current 0 → `-100.0` (backend `_compute_delta_pct`).
//
// Universe is `closed_orders` only (SOs Approved / PartiallyApproved, revenue
// on Approved lines) — there is no `metric` param in v1. Filters apply to BOTH
// windows identically, which is what keeps the comparison honest.
//
// Out-of-scope `user_ids` → 403, not an empty result. Route the error through
// `LoadErrorState` so it reads as "no access" rather than "failed to load".

export type GrowthResponse = components["schemas"]["GrowthResponse"];
export type GrowthWindow = components["schemas"]["GrowthWindow"];
export type GrowthPeriod = components["schemas"]["GrowthPeriod"];
export type GrowthDirection = components["schemas"]["GrowthDirection"];

export interface GrowthParams {
  /** The narrowed period — `custom` is not a member. See the note above. */
  period: GrowthPeriod;
  type?: DashboardAccountType[];
  user_ids?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
}

export async function fetchGrowth(
  params: GrowthParams,
): Promise<GrowthResponse> {
  return apiClient.get<GrowthResponse>(endpoints.crm.dashboardGrowth, {
    params: {
      period: params.period,
      type: list(params.type),
      // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
      user_ids: list(params.user_ids),
      conditions: list(params.conditions),
      category_ids: list(params.category_ids),
      oem_ids: list(params.oem_ids),
      account_ids: list(params.account_ids),
    },
  });
}

// ── Account Movement — `GET /crm/dashboard/account-movement` ──────────────
//
// Per-account period-over-period revenue movement. Shares the Growth tile's
// window pair (`resolve_growth_windows`), so the two widgets always agree on
// what "this period" means and the SAME filter stack applies to BOTH windows
// identically — same slice of the business, different time.
//
// Dual-mode endpoint:
//
//   * `movement` ABSENT → widget response. `summary` + top-`limit` of each
//     bucket under `growing` / `declining`; `rows` + `pagination` are null.
//   * `movement` SET to `growing` / `declining` / `all` → drill-down. `rows`
//     + `pagination` populated for the chosen bucket; `growing` / `declining`
//     are null. `all` returns every classified account (growing + declining
//     + new + lapsed + flat) sorted by `abs(delta)` DESC.
//
// Window math + `delta_pct` zero-previous encoding are identical to Growth —
// a lapsed row carries `delta_pct: -100`, a new row carries `+100`, flat is
// `0`. `summary` carries counts for all five statuses so the Movement Mix
// donut + the 4 summary tiles on the drill-down page both work regardless of
// which mode the FE requested.
//
// Backend contract: see `account_movement.py` in
// `app/modules/crm/services/dashboard/revenue_report/`.
//
// TYPES BELOW ARE A HAND-WRITTEN STUB mirroring the backend schema in
// `account_movement.py`. The project rule (CLAUDE.md §1) is that wire types
// come from `components["schemas"]…` — but the extended backend endpoint
// is NEW in this PR and `pnpm api:gen` hasn't run against a backend that
// knows about it yet. Once that regen lands, swap these for one-line
// generated aliases (see the Growth block above for the pattern). Field
// shapes here are kept 1:1 with the Pydantic models so the swap is
// mechanical.

export type AccountMovementStatus =
  "growing" | "declining" | "new" | "lapsed" | "flat";
export type AccountMovementType = "growing" | "declining" | "all";

export interface AccountMovementBiggestMover {
  account_id: string;
  account_name: string;
  /** Signed delta — negative for declining / lapsed, positive otherwise. */
  delta: number;
  status: AccountMovementStatus;
}

export interface AccountMovementSummary {
  growing_count: number;
  declining_count: number;
  new_count: number;
  lapsed_count: number;
  flat_count: number;
  /** Sum of signed deltas across every classified account. */
  net_delta: number;
  /** Sum of signed deltas across the growing bucket (growing + new). Positive
   *  by construction. Powers the "+₹X" subline on the Growing Accounts tile. */
  growing_delta: number;
  /** Sum of signed deltas across the declining bucket (declining + lapsed).
   *  Negative by construction when the bucket is non-empty. Powers the
   *  "-₹X" subline on the Declining Accounts tile. */
  declining_delta: number;
  biggest_mover: AccountMovementBiggestMover | null;
}

export interface AccountMovementWindow {
  /** Pre-formatted label — `"Q2 FY 2026-27"` / `"Oct 2026"` / `"Wk 40 2026"`.
   *  Never re-derive from `start` / `end`. */
  label: string;
  /** ISO date (`YYYY-MM-DD`), inclusive. */
  start: string;
  /** ISO date (`YYYY-MM-DD`), inclusive. */
  end: string;
}

export interface AccountMovementRow {
  account_id: string;
  account_name: string;
  account_type: string | null;
  /** Display name of the account's PRIMARY owner — the "Rep" column. Null
   *  when the account has no live primary owner. */
  rep_name: string | null;
  current_value: number;
  previous_value: number;
  current_order_count: number;
  previous_order_count: number;
  /** Signed delta — negative for declining / lapsed, positive otherwise. */
  delta: number;
  /** Never null. +100 for `new`, -100 for `lapsed`, 0 for `flat` (and
   *  both-zero which the backend excludes). */
  delta_pct: number;
  status: AccountMovementStatus;
}

export interface AccountMovementPagination {
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export interface AccountMovementResponse {
  period: DashboardPeriod;
  /** Echoes the request's `movement` param so the FE can branch on mode. */
  movement: AccountMovementType | null;
  current_window: AccountMovementWindow;
  previous_window: AccountMovementWindow;
  /** Populated in BOTH modes — the 4 top tiles and Movement Mix donut read
   *  the same object regardless of which bucket the user is drilling into. */
  summary: AccountMovementSummary;
  /** Widget mode only. Top-`limit` growing-bucket rows. */
  growing: AccountMovementRow[] | null;
  /** Widget mode only. Top-`limit` declining-bucket rows. */
  declining: AccountMovementRow[] | null;
  /** Drill-down only. Paginated single-bucket rows. */
  rows: AccountMovementRow[] | null;
  /** Drill-down only. */
  pagination: AccountMovementPagination | null;
}

export interface AccountMovementParams {
  /** Window pair — resolved server-side exactly like Growth: presets, a
   *  `custom` range (`start` / `end`) or the `months` facet. */
  period: DashboardPeriod;
  start?: string;
  end?: string;
  months?: string[];
  /** Bucket selector; omit for widget mode. */
  movement?: AccountMovementType;
  /** Widget-mode cap, per bucket. Ignored in drill-down mode. */
  limit?: number;
  /** Drill-down page (1-indexed). Ignored in widget mode. */
  page?: number;
  /** Drill-down page size. Ignored in widget mode. */
  page_size?: number;
  type?: DashboardAccountType[];
  user_ids?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
}

export async function fetchAccountMovement(
  params: AccountMovementParams,
): Promise<AccountMovementResponse> {
  return apiClient.get<AccountMovementResponse>(
    endpoints.crm.dashboardAccountMovement,
    {
      params: {
        period: params.period,
        start: params.start,
        end: params.end,
        months: list(params.months),
        movement: params.movement,
        limit: params.limit,
        page: params.page,
        page_size: params.page_size,
        type: list(params.type),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── New Accounts — `GET /crm/dashboard/new-accounts` ───────────────────────
//
// Top-N approved accounts whose FIRST-EVER sales order landed in the current
// period window ("Rule A" per NEW_ACCOUNTS_WIDGET_PLAN at the FE repo root)
// OR that were created in it ("Rule B" — a freshly approved logo counts the
// day it is approved, before its first order; its `first_order_*` fields
// are then null and the row reads "no order yet"). Shares
// the Growth / Account Movement window pair — presets, a `custom` range or
// the `months` facet, resolved server-side. `rows` is server-ranked by `first_order_value` DESC and trimmed
// to `limit` (default 5); `summary.*` always reflects the FULL set.
//
// Types below are a HAND-WRITTEN STUB mirroring the backend schema in
// `new_accounts.py`. Once `pnpm api:gen` runs against a backend that knows
// this endpoint, swap for one-line generated aliases from
// `components["schemas"]…` — same approach the Account Movement block
// above uses while its generated types land.

export interface NewAccountRow {
  account_id: string;
  account_name: string;
  account_type: string | null;
  /** Pre-formatted `"May 2026"` — never re-derive from `first_order_date`.
   *  `null` when the account has not raised any order yet (Rule B). */
  first_order_month: string | null;
  /** ISO date (`YYYY-MM-DD`). `null` with no order yet. */
  first_order_date: string | null;
  /** The opening order's ex-tax value. `null` with no order yet. */
  first_order_value: number | null;
  order_count_in_window: number;
  revenue_in_window: number;
}

export interface NewAccountsSummary {
  new_count_current: int_safe;
  new_count_previous: int_safe;
  /** Signed — positive = more new buyers than last period. */
  delta_count: int_safe;
  /** Full-set SUM of revenue these new accounts generated in the window —
   *  NOT the SUM of the top-N `rows[].revenue_in_window` (which can
   *  understate when the server trimmed). */
  total_revenue_current: number;
  /** `{account_type: count}` over the whole current cohort — the "New
   *  Accounts by Vertical" split. A type with no new logo is absent. */
  by_account_type: Record<string, number>;
  /** Closed revenue in the window across EVERY visible account, same filters.
   *  `total_revenue_current / window_revenue_total` is the cohort's share of
   *  closed revenue; `0` means nothing closed, so no share to show. */
  window_revenue_total: number;
  /** Mean opening-order value over the `first_order_count` cohort members
   *  whose first order fell in the window. `null` when none did. */
  avg_first_order_value: number | null;
  first_order_count: int_safe;
  /** Cohort members that have raised a SECOND order (lifetime, any status,
   *  up to the window end). Over `new_count_current` = the reordered share. */
  reordered_count: int_safe;
}

/** TS has no distinct int type at runtime; this alias is purely for reader
 *  clarity in a block that mixes count-ish and money-ish numeric fields. */
type int_safe = number;

export interface NewAccountsResponse {
  period: DashboardPeriod;
  current_window: AccountMovementWindow;
  previous_window: AccountMovementWindow;
  summary: NewAccountsSummary;
  rows: NewAccountRow[];
  /** Drill-down mode only (`page` sent); null in widget mode. */
  pagination: NewAccountsPagination | null;
}

export interface NewAccountsPagination {
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export interface NewAccountsParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  /** Repeated `YYYY-MM` tokens — the month facet. */
  months?: string[];
  /** Widget mode — top-N ranked rows. Default 5, max 20. Ignored when `page`
   *  is set. */
  limit?: number;
  /** Drill-down mode — a page of the WHOLE cohort + `pagination`. */
  page?: number;
  page_size?: number;
  type?: DashboardAccountType[];
  user_ids?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  account_ids?: string[];
}

export async function fetchNewAccounts(
  params: NewAccountsParams,
): Promise<NewAccountsResponse> {
  return apiClient.get<NewAccountsResponse>(
    endpoints.crm.dashboardNewAccounts,
    {
      params: {
        period: params.period,
        start: params.start,
        end: params.end,
        months: list(params.months),
        limit: params.limit,
        page: params.page,
        page_size: params.page_size,
        type: list(params.type),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── Inactive Accounts by Period — `GET /crm/dashboard/insights/inactive-accounts-by-period`
// Backend: app/modules/crm/api/v1/dashboard/revenue_report/inactive_accounts.py
//
// Per bucket of the period-wise window: buyers who ordered in it, and earlier
// buyers who did not. Same query contract as period-wise-breakdown, so the
// page's one `PeriodBreakdownParams` object serves it.

export type InactiveAccountsByPeriodParams = PeriodBreakdownParams;

export interface InactiveAccountsByPeriodRow {
  bucket_key: string;
  /** Pre-formatted (`"Q1 FY 2026-27"`, `"Jul 2026"`, `"Jul W2"`). */
  bucket_label: string;
  active_buyers: int_safe;
  inactive_buyers: int_safe;
  /** `inactive / (active + inactive)`, nearest integer. */
  inactive_pct: int_safe;
}

export interface InactiveAccountsByPeriodResponse {
  period: { type: DashboardPeriod; start: string; end: string };
  bucket_unit: BucketUnit;
  /** NEWEST FIRST, one per bucket of the window, zero-filled. */
  rows: InactiveAccountsByPeriodRow[];
}

export async function fetchInactiveAccountsByPeriod(
  params: InactiveAccountsByPeriodParams,
): Promise<InactiveAccountsByPeriodResponse> {
  return apiClient.get<InactiveAccountsByPeriodResponse>(
    endpoints.crm.dashboardInactiveAccountsByPeriod,
    {
      params: {
        period: params.period,
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── New Accounts by Period — `GET /crm/dashboard/insights/new-accounts-by-period`
//
// The New Accounts insight page's two per-bucket series in one response:
// accounts won per bucket (first-ever SO raised in it) and the bucket's
// revenue split new-vs-repeat. SAME query contract as the period breakdown
// and the mix cross-tabs — one params object serves the whole page.

export type NewAccountsByPeriodParams = PeriodBreakdownParams;

export interface NewAccountsByPeriodRow {
  bucket_key: string;
  /** Pre-formatted (`"Q1 FY 2026-27"`, `"Jul 2026"`, `"Jul W2"`). */
  bucket_label: string;
  new_accounts: number;
  new_value: number;
  repeat_value: number;
  total: number;
}

export interface NewAccountsByPeriodResponse {
  period: { type: DashboardPeriod; start: string; end: string };
  bucket_unit: BucketUnit;
  totals: {
    new_accounts: number;
    new_value: number;
    repeat_value: number;
    total: number;
  };
  /** NEWEST FIRST, one per bucket of the window, zero-filled. */
  rows: NewAccountsByPeriodRow[];
}

export async function fetchNewAccountsByPeriod(
  params: NewAccountsByPeriodParams,
): Promise<NewAccountsByPeriodResponse> {
  return apiClient.get<NewAccountsByPeriodResponse>(
    endpoints.crm.dashboardNewAccountsByPeriod,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── Inactive Accounts — `GET /crm/dashboard/inactive-accounts` ─────────────
//
// Buyers whose most recent approved sales order is older than a rolling day
// threshold driven by `period`:
//   weekly=7d · monthly=30d · quarterly=90d · yearly=365d
// Anchored to today, not to the filter end date. Root accounts only.
// Backed server-side by `accounts.last_order_at` (denorm maintained via SO
// status hooks) + lifetime `sales_orders.taxable_amount`.
//
// Hand-written stub — swap for `components["schemas"]…` after the next
// `pnpm api:gen` picks up the backend route.

export interface InactiveAccountRow {
  account_id: string;
  account_name: string;
  account_type: string | null;
  /** ISO datetime (UTC) — render via `formatIST()` / `<DateDisplay />`. */
  last_order_at: string;
  /** Pre-formatted `"last May"` / `"last May 2024"` — FE renders verbatim. */
  last_order_label: string;
  /** Whole idle units (`summary.idle_unit`: weeks on a weekly window, months
   *  otherwise) from the last order to today. */
  idle_units: int_safe;
  /** Lifetime pre-tax approved revenue (SUM of `taxable_amount`). */
  lifetime_revenue: number;
  /** Counted orders on the account up to the window end. */
  order_count: int_safe;
  /** `lifetime_revenue / order_count`; `null` with no orders. */
  avg_order_value: number | null;
  /** The rep who submitted the account's last order; `null` when unknown. */
  rep_name: string | null;
}

export interface InactiveAccountsSummary {
  inactive_count: int_safe;
  total_buyers: int_safe;
  /** 0..100 integer — matches the dashboard mock's "33%" tile. */
  inactive_pct: int_safe;
  total_revenue_at_risk: number;
  /** Unit of `avg_idle` and every row's `idle_units`: weeks on a weekly
   *  window, months otherwise. */
  idle_unit: "week" | "month";
  /** Mean whole idle units over the inactive set, last order to today, 1 dp. */
  avg_idle: number;
  /** Inactive buyers idle for under 5 months, and what they used to buy. */
  recoverable_count: int_safe;
  recoverable_revenue: number;
}

export interface InactiveAccountsResponse {
  period: DashboardPeriod;
  /** The window actually applied — `"Last 30 days"` for a preset,
   *  `"1 Jun - 31 Aug 2026"` for a custom range / month selection. Label is
   *  pre-rendered; display verbatim. */
  current_window: AccountMovementWindow;
  /** The window length the backend used (days). */
  threshold_days: int_safe;
  summary: InactiveAccountsSummary;
  rows: InactiveAccountRow[];
  /** Drill-down mode only (`page` sent); `null` in widget mode. */
  pagination: InactiveAccountsPagination | null;
}

export interface InactiveAccountsPagination {
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export interface InactiveAccountsParams {
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  /** Repeated `YYYY-MM` tokens — the month facet. */
  months?: string[];
  /** Top-N ranked rows. Default 5, max 50 (backend validator). */
  /** Widget mode — the top-`limit` rows. Ignored when `page` is set. */
  limit?: number;
  /** Drill-down mode — a page of the WHOLE inactive set + `pagination`. */
  page?: number;
  page_size?: number;
  /** Account-level facets — narrow WHO counts as a buyer. */
  type?: DashboardAccountType[];
  user_ids?: string[];
  account_ids?: string[];
  /** Line-level facets — narrow WHICH orders count (an SO counts when at
   *  least one of its revenue lines matches), so "inactive on Dell" reads as
   *  a Dell buyer with no Dell order in the window. */
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
}

export async function fetchInactiveAccounts(
  params: InactiveAccountsParams,
): Promise<InactiveAccountsResponse> {
  return apiClient.get<InactiveAccountsResponse>(
    endpoints.crm.dashboardInactiveAccounts,
    {
      params: {
        period: params.period,
        start: params.start,
        end: params.end,
        months: list(params.months),
        limit: params.limit,
        page: params.page,
        page_size: params.page_size,
        type: list(params.type),
        user_ids: list(params.user_ids),
        account_ids: list(params.account_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
      },
    },
  );
}

// ── Condition Mix by Period — `GET /crm/dashboard/insights/condition-mix-by-period`
//
// A rectangular CROSS-TAB of the same slice `period-wise-breakdown` returns:
// one row per bucket, one column per condition, plus window totals.
//
// The query contract is 1:1 with period-wise-breakdown — the backend schema
// says so outright ("Superset overlaps 1:1 with PeriodWiseBreakdownQuery —
// same filter row on the FE drives both widgets"). So the params type is an
// ALIAS, not a second interface that could drift, and callers pass the very
// same object they already built for the breakdown table.
//
// Two response properties the UI must not second-guess:
//
//   * `conditions` is THE COLUMN SET, and it is DYNAMIC. With a `conditions`
//     filter active it is exactly those; with none it is the full enum PLUS
//     `no_condition` when freeform SO lines contributed revenue. Never hardcode
//     three conditions — read this list and render it in the order given.
//   * `bucket_unit` drives the title. Key off the RESPONSE, not the toolbar:
//     keying off the toolbar makes the header describe the *next* fetch while
//     the rows still show the previous one.
//
// Rows are rectangular and zero-filled — every row's `conditions` dict carries
// the same keys as the envelope's list — so a missing key means a contract
// change, not a sparse row.
//
// `Σ rows[].total` reconciles 1:1 with period-wise-breakdown's total for the
// same query string, which makes the two cells cross-checkable on screen.

export type ConditionMixByPeriodResponse =
  components["schemas"]["ConditionMixByPeriodResponse"];
export type ConditionMixByPeriodRow =
  components["schemas"]["ConditionMixByPeriodRow"];
export type ConditionMixByPeriodTotals =
  components["schemas"]["ConditionMixByPeriodTotals"];

/** Alias, deliberately — see the 1:1 note above. */
export type ConditionMixByPeriodParams = PeriodBreakdownParams;

export async function fetchConditionMixByPeriod(
  params: ConditionMixByPeriodParams,
): Promise<ConditionMixByPeriodResponse> {
  return apiClient.get<ConditionMixByPeriodResponse>(
    endpoints.crm.dashboardConditionMixByPeriod,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ── Category — Period Comparison — `GET /crm/dashboard/insights/category-period-comparison`
//
// One row per category (ranked by revenue across the columns), one cell per
// bucket of the board window — the same window and buckets as `/revenue`
// (FY-to-date for presets, start → end for custom), newest first. Same shared
// filter body as the other by-period cross-tabs, minus `months` (the columns
// ARE periods).
export type CategoryPeriodComparisonResponse =
  components["schemas"]["CategoryPeriodComparisonResponse"];
export type CategoryPeriodColumn =
  components["schemas"]["CategoryPeriodColumn"];
export type CategoryPeriodRow = components["schemas"]["CategoryPeriodRow"];
export type CategoryPeriodCell = components["schemas"]["CategoryPeriodCell"];

export type CategoryPeriodComparisonParams = Omit<
  PeriodBreakdownParams,
  "months"
> & {
  page?: number;
  page_size?: number;
};

export async function fetchCategoryPeriodComparison(
  params: CategoryPeriodComparisonParams,
): Promise<CategoryPeriodComparisonResponse> {
  return apiClient.get<CategoryPeriodComparisonResponse>(
    endpoints.crm.dashboardCategoryPeriodComparison,
    {
      params: {
        period: params.period,
        start: params.start,
        end: params.end,
        type: list(params.type),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
        page: params.page,
        page_size: params.page_size,
      },
    },
  );
}

// ── Vertical Mix by Period — `GET /crm/dashboard/insights/vertical-mix-by-period`
//
// The Condition Mix cross-tab above, over the ACCOUNT-TYPE dimension instead:
// one row per bucket, one column per vertical, plus window totals. Same 1:1
// query contract as `period-wise-breakdown` — see the Condition Mix note above
// for why the params type is an alias rather than a second interface.
//
// THREE differences from Condition Mix, all of them simplifications:
//
//   * The column keys are DISPLAY LABELS already ("End Customer",
//     "Channel Partner", "Cloud / Data Center"), not wire enums — so there is
//     no `wire → label` hop and no label map to keep in sync. Render verbatim.
//   * The column set is STABLE: always the full `ACCOUNT_TYPES` domain (or the
//     `type=` subset), emitted even when a vertical earned nothing all window.
//     Condition Mix's column count moves with the data because `no_condition`
//     appears and disappears.
//   * There is NO sentinel column. `accounts.account_type` is NOT NULL and
//     CHECK-constrained, so nothing can fall outside the three values — unlike
//     freeform SO lines, which have no condition and produce `no_condition`.
//
// The facet that narrows the columns here is `type=`, not `conditions=`.

export type VerticalMixByPeriodResponse =
  components["schemas"]["VerticalMixByPeriodResponse"];
export type VerticalMixByPeriodRow =
  components["schemas"]["VerticalMixByPeriodRow"];
export type VerticalMixByPeriodTotals =
  components["schemas"]["VerticalMixByPeriodTotals"];

/** Alias — same 1:1 contract reasoning as `ConditionMixByPeriodParams`. */
export type VerticalMixByPeriodParams = PeriodBreakdownParams;

export async function fetchVerticalMixByPeriod(
  params: VerticalMixByPeriodParams,
): Promise<VerticalMixByPeriodResponse> {
  return apiClient.get<VerticalMixByPeriodResponse>(
    endpoints.crm.dashboardVerticalMixByPeriod,
    {
      params: {
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        type: list(params.type),
        months: list(params.months),
        // Repeated query keys (?category_ids=a&category_ids=b) — axios indexes:null.
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: list(params.account_ids),
      },
    },
  );
}

// ─── Account 360° — Category × OEM mix ─────────────────────────────────────
// Backend: app/modules/crm/api/v1/endpoints.py
//          GET /crm/accounts/{account_id}/revenue/by-category-oem
//
// Single call feeds the "Category & Brand Mix" section:
//   * TOP CATEGORY / TOP OEM / TOTAL tiles      → derived + totals
//   * Category × Brand pivot table              → pivot
//
// Per-category and per-OEM totals live on `pivot.rows[i].total` /
// `pivot.columns[j].total`. The 360° tab already renders separate
// "Category — Value Closed" / "OEM — Value Closed" widgets from their own
// endpoints, so no duplicate flat list ships from this endpoint.
//
// Filter set = RevenueBySourceParams minus `report_type`. The account_id is a
// path segment (NOT a query param): the service hardcodes account_ids=[path]
// server-side, so any account_ids the FE puts in the query string are ignored
// on this route. Same freeform-line behaviour as the dashboard OEM widget:
// SO lines without an oem_id bucket into a synthetic "No OEM" column whose
// `oem_id` stays null.
//
// Zero cells arrive as { value_closed: 0, order_count: 0, share: 0 } — never
// null — so the pivot renderer does zero null-checks.

// NOTE: hand-written to match the backend Pydantic
// (schemas/dashboard/revenue_report/revenue_by_category_oem.py). Swap the
// interfaces below for `components["schemas"]["RevenueByCategoryOemResponse"]`
// after the next `pnpm api:gen` — the shape is identical by design.
export interface CategoryOemCell {
  value_closed: number;
  order_count: number;
  share: number;
}
export interface CategoryOemPivotRow {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  total: CategoryOemCell;
}
export interface CategoryOemPivotColumn {
  /** `null` identifies the synthetic "No OEM" bucket (freeform SO lines). */
  oem_id: string | null;
  oem_name: string;
  total: CategoryOemCell;
}
export interface CategoryOemPivot {
  rows: CategoryOemPivotRow[];
  columns: CategoryOemPivotColumn[];
  /** `cells[i][j]` maps positionally to `rows[i] × columns[j]`. */
  cells: CategoryOemCell[][];
  grand_total: CategoryOemCell;
}
export interface CategoryTopTile {
  category_id: string;
  name: string;
  value_closed: number;
  order_count: number;
  share: number;
}
export interface OEMTopTile {
  oem_id: string | null;
  name: string;
  value_closed: number;
  order_count: number;
  share: number;
}
export interface CategoryOemDerived {
  top_category: CategoryTopTile | null;
  top_oem: OEMTopTile | null;
}
export interface RevenueByCategoryOemTotals {
  value_closed: number;
  order_count: number;
  row_count: number;
  category_count: number;
  oem_count: number;
}
export interface RevenueByCategoryOemPagination {
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}
export interface RevenueByCategoryOemResponse {
  report_type: "category_oem";
  period: {
    start_at: string;
    end_at: string;
    label?: string;
  };
  totals: RevenueByCategoryOemTotals;
  derived: CategoryOemDerived;
  pivot: CategoryOemPivot;
  pagination: RevenueByCategoryOemPagination;
}

export interface RevenueByCategoryOemParams {
  /** Optional. Present → Account 360° scope; omitted → dashboard scope. */
  account_id?: string;
  period: DashboardPeriod;
  /** ISO dates. Required by the backend when `period === "custom"`. */
  start?: string;
  end?: string;
  user_ids?: string[];
  type?: DashboardAccountType[];
  months?: string[];
  conditions?: DashboardConditionFilter[];
  category_ids?: string[];
  oem_ids?: string[];
  /** Extra account-id filter (dashboard-side). Ignored when `account_id` is
   *  set — that path already gates on a single account. */
  account_ids?: string[];
  /** Omitted when blank — `min_length=1` on the backend. */
  search?: string;
  page?: number;
  page_size?: number;
  /** Skip every visibility lane so the response reflects the `account_id` /
   *  `account_ids` filter alone. Sent by the Account 360° tab; omitted
   *  everywhere else. */
  bypass_visibility?: boolean;
  /** Restrict the pivot to a cohort. `new_accounts` → accounts whose
   *  first-ever SO was raised inside the window (the New Accounts page's
   *  "What New Accounts Buy" card). Omitted → every visible account. */
  cohort?: "new_accounts" | "inactive_accounts";
}

export async function fetchRevenueByCategoryOem(
  params: RevenueByCategoryOemParams,
): Promise<RevenueByCategoryOemResponse> {
  return apiClient.get<RevenueByCategoryOemResponse>(
    endpoints.crm.revenueByCategoryOem,
    {
      params: {
        // Optional — omit rather than send `?account_id=undefined`.
        account_id: params.account_id || undefined,
        period: params.period,
        // Only meaningful for `custom`; the backend ignores them otherwise.
        start: params.start,
        end: params.end,
        // `""` would 422 — omit rather than send an empty search.
        search: params.search?.trim() || undefined,
        type: list(params.type),
        months: list(params.months),
        user_ids: list(params.user_ids),
        conditions: list(params.conditions),
        category_ids: list(params.category_ids),
        oem_ids: list(params.oem_ids),
        account_ids: params.account_id ? undefined : list(params.account_ids),
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        bypass_visibility: params.bypass_visibility,
        cohort: params.cohort,
      },
    },
  );
}
