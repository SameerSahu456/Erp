// User-facing copy for the CRM insight widgets + their detail pages.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text and tooltips live here as one
// typed `as const` object instead of being hardcoded ("naked") in JSX.
//
// Dynamic copy is expressed as a function member.

import type { DashboardPeriod } from "../../../api/dashboard"

/**
 * ONE empty-state line for every insight surface — widgets, detail cells and the
 * records page alike.
 *
 * Each surface used to author its own wording ("No revenue in this period.",
 * "No reps match these filters.", "No records for this slice."), which made an
 * empty board read as several different problems when it is always the same
 * one: the current slice has nothing in it. Keyed per surface still, so a single
 * widget can diverge later, but they all point here by default.
 */
const NO_RECORDS = "No records found."

/** `▲ +12.3%` / `▼ -5.0%` / `0.0%`, keyed off the SERVER's direction.
 *
 *  ONE definition, shared by every widget that renders a period-over-period
 *  change (the breakdown table's `change` column and the Growth tile's
 *  headline). They must not drift: the glyph comes from `direction`, never
 *  from the sign of `pct`, and those two disagree inside the backend's flat
 *  BAND (`|delta_pct| < 0.05`, not `=== 0`). Keying the arrow off `pct >= 0`
 *  rendered a 0 → 0 bucket as "▲ +0.0%" — an up-arrow claiming growth that did
 *  not happen. A flat value gets no arrow at all.
 *
 *  Callers drive tone from the same `direction` so glyph and colour can never
 *  contradict each other. */
function directionalPct(pct: number, direction: "up" | "down" | "flat"): string {
  return direction === "flat"
    ? `${pct.toFixed(1)}%`
    : `${direction === "up" ? "▲ +" : "▼ "}${pct.toFixed(1)}%`
}

export const INSIGHTS_STRINGS = {
  page: {
    /** Heading over the by-source breakdown band on the dashboard. */
    revenueInsights: "Revenue Insights",
    /** Heading over the performance / pipeline band (AOV, funnels, …). */
    performancePipeline: "Performance & Pipeline",
    title: "CRM Dashboard",
    subtitle: "Revenue and team performance across the accounts you can see.",
    breadcrumbCrm: "CRM",
    breadcrumbDashboard: "Dashboard",
  },

  // ── Repaired-URL notice ─────────────────────────────────────────────────
  //
  // Shown when `parseInsightParams` had to change something to make the URL
  // sendable. USER vocabulary, never the backend's: the whole point of the
  // repair layer is that nobody sees "end must be greater than or equal to
  // start" again. Each line says what changed AND what the board is showing
  // instead, because a notice that only says "that was invalid" leaves the user
  // unable to tell whether the numbers on screen are the ones they asked for.
  viewRepair: {
    title: "We adjusted this link",
    dismiss: "Dismiss",
    rangeInverted: "The date range started after it ended, so the dates were swapped.",
    rangeMalformed:
      "The custom date range in this link wasn't valid, so the board is showing the monthly view.",
    rangeFuture: "The end date was in the future, so the range now ends today.",
    /** The whole-board 422 banner (see `InsightSummaryCard`). Reached only when
     *  a slice the parser could not have caught is rejected server-side — every
     *  URL-borne case is repaired before it reaches the wire. Deliberately says
     *  nothing about WHICH param: the backend's field name is its own
     *  vocabulary, not the user's, and this is exactly the text the repair layer
     *  exists to keep off the screen. */
    sliceRejected:
      "The board couldn't be loaded with these filters. Try clearing them or picking a different period.",
    periodUnknown: "That time period isn't one we support, so the board is showing the monthly view.",
    viewUnknown: "That view isn't one we support, so the board is showing the team view.",
    roleUnknown: "The role in that link was empty, so the Sales Team is showing every role.",
    roleMultiple: "That link named several roles. The Sales Team shows one at a time, so it is showing the first.",
    /** One line per facet that lost values. Names the facet so the user can
     *  tell WHICH filter came back empty — "1 filter value was ignored" on a
     *  link with five facets is not actionable. */
    badIds: (field: string, count: number) =>
      count === 1
        ? `One ${field} filter in this link wasn't recognised and was ignored.`
        : `${count} ${field} filters in this link weren't recognised and were ignored.`,
  },

  // ── Shared widget shell ─────────────────────────────────────────────────
  widget: {
    details: "Details",
    whyLabel: "About this widget",
    loading: "Loading…",
    loadError: "Failed to load.",
  },

  // ── Toolbar (period + view + export) ────────────────────────────────────
  toolbar: {
    chart: "Chart",
    list: "List",
    chartDisabled: "Chart view coming soon — showing the table for now.",
    export: "Export",
    exportDisabled: "Export coming soon — it will be generated on the server.",
    period: "Period",
    from: "From",
    to: "To",
    customRange: "Pick a date range",
    /** Accordion header inside the period dropdown; expands into the last
     *  five financial years. */
    financialYear: "Financial year",
    /** My / Team segmented control. Hidden for the roles in
     *  `DASHBOARD_SCOPE_TOGGLE_HIDDEN_ROLES`, who have no team of their own. */
    scopeLabel: "Scope",
    myView: "My View",
    teamView: "Team View",
    /** Names the Chart/List segmented group for screen readers. */
    viewLabel: "View",
  },

  periods: {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  },

  // ── The closed/total ratio (`<Ratio>`) ──────────────────────────────────
  // Shared, not owned by one widget: the Sales Team card (tiles + table + the
  // detail leaderboard) and the Summary strip all render the same pair, and a
  // second copy of these words is how two cards start saying it differently.
  ratio: {
    /** `21/34` — closed over total, as one string. Used by the CSV export; the
     *  on-screen pair is two-tone, so `<Ratio>` renders the halves separately
     *  and takes the denominator from `ratioTotal`. */
    ratio: (count: number, total: number) => `${count}/${total}`,
    /** `/34` — the muted half of the on-screen pair. Takes the ALREADY
     *  formatted total, so a grouped caller can pass `1,500`. */
    ratioTotal: (total: string) => `/${total}`,
    /** `21 of 34 leads` — what a screen reader announces for the pair. "21/34"
     *  alone reads as a date or a fraction depending on the reader. */
    ratioAria: (count: number, total: number, unit: string) => `${count} of ${total} ${unit}`,
    /** `21 leads` — the spoken form when the response carried no denominator,
     *  so there is no "of N" to announce. */
    countOnlyAria: (count: number, unit: string) => `${count} ${unit}`,
    /** Units for the spoken labels, lower-case mid-sentence. */
    unitLeads: "leads",
    unitDeals: "deals",
    unitSos: "sales orders",
  },

  // ── Sales Team widget ───────────────────────────────────────────────────
  salesTeam: {
    title: "Sales Team",
    why: "Team attainment and deals closed. Click a rep for the filterable, full detail view.",
    searchPlaceholder: "Search users…",
    rolesLabel: "Role",
    rolesAll: "All",
    /** `All (15)` — the unfiltered trigger. `n` is how many roles the REPORT
     *  contains (from its `roles` facet), not how many exist system-wide. */
    rolesAllCount: (n: number) => `All (${n})`,
    /** The reference's strip: "Team Revenue    ₹4.2Cr", on its own line. The
     *  old "· 188 deals" suffix is gone — the Deals tile below carries that
     *  figure now, and with a denominator. */
    teamRevenue: "Team Revenue",
    /** The two roll-up tiles under Team Revenue: closed / total across the
     *  whole filtered team, from `team_totals`. */
    teamLeads: "Leads",
    teamDeals: "Deals",
    teamSos: "SO",
    /** Third roll-up, admin/superadmin only — `unassigned_lead_count`.
     *  Leads with no `assigned_to`, so they land in NO per-user row and are
     *  invisible in `team_totals.lead_total`. Shown as a bare count, not a
     *  ratio: there is no "closed / total" pair for work nobody owns. */
    teamUnassigned: "Unassigned Leads",
    /** Hover copy — explains why this number is missing from the Leads ratio
     *  beside it, which is the whole reason the tile exists. */
    teamUnassignedHint:
      "Leads with no assigned owner. Not counted in the Leads total, which only counts leads assigned to a user.",
    /** Fourth roll-up, admin/superadmin only — `unassigned_deal_count`.
     *  Deals with no `owner_id`, so they land in NO per-user row and are
     *  invisible in `team_totals.deal_total`. Bare count, same rule as
     *  `teamUnassigned`: no closed / total pair for work nobody owns. */
    teamUnassignedDeals: "Unassigned Deals",
    teamUnassignedDealsHint:
      "Deals with no owner. Not counted in the Deals total, which only counts deals owned by a user.",
    loading: "Loading team…",
    loadError: "Failed to load the sales team.",
    columnName: "Name",
    columnLead: "Lead",
    columnDeal: "Deal",
    columnSo: "SO",
    columnRevenue: "Revenue",
    fullDetail: "Filters & full detail",
    /** `Show all 90 →` — links to the full, paginated inner view. */
    showAll: (count: number) => `Show all ${count} →`,
    empty: NO_RECORDS,
  },

  // ── Revenue by Month widget ─────────────────────────────────────────────
  revenueByMonth: {
    /** Keyed by the RESPONSE's `period.type`, not the toolbar's period — same
     *  rule as `conditionMix.title` / `verticalMix.title`: keying off the
     *  toolbar makes the header describe the next fetch while the list still
     *  shows the previous one.
     *
     *  `custom` buckets MONTHLY server-side (`TRUNC_FOR_PERIOD[CUSTOM] =
     *  "month"`), so it reads "by Month" — the title names the bucket size on
     *  screen, not the preset that produced it. */
    title: {
      weekly: "Revenue by Week",
      monthly: "Revenue by Month",
      quarterly: "Revenue by Quarter",
      yearly: "Revenue by Year",
      custom: "Revenue by Month",
    } satisfies Record<DashboardPeriod, string>,
    why: "Closed revenue per period — the up/down trend. Drill in to filter by vertical, condition, category or OEM.",
    empty: NO_RECORDS,
    /** `Show all 28 →` — the tile caps at the first 10 buckets; the rest live
     *  behind the inner view's server pagination. Mirrors the Sales Team tile. */
    showAll: (count: number) => `Show all ${count} →`,
    seriesLabel: "Revenue",
    loading: "Loading revenue…",
    loadError: "Failed to load revenue.",
    /** Breakdown-table column headers on the enriched revenue widget
     *  (`RevenueTrendWidget breakdown`). Live on the same series as the
     *  trend view; each row is a bucket carrying the four attribution
     *  slices from the backend fan-out. */
    breakdown: {
      period: "Period",
      /** Rendered as `won / total` per row (matches the Summary card pattern). */
      leads: "Leads",
      leadRevenue: "Lead Rev",
      deals: "Deals",
      dealRevenue: "Deal Rev",
      soCount: "SO",
      total: "Total",
    },
    // `window: (start, end) => ...` — REMOVED with the date-range line under
    // each trend card's header (see `InsightTrendList`).
  },

  // ── Avg Order Value tile (Performance & Pipeline band) ──────────────────
  // Same live series / component as `revenueByMonth`, `metric: 'avg_order_value'`.
  avgOrderValue: {
    title: "Avg Order Value",
    why: "Average value per Approved order over time. Drill in to filter by vertical, condition, category or OEM.",
  },

  // ── Top Orders tile + detail hero (Performance & Pipeline band) ─────────
  // Ranked approved SO line items — `GET /crm/dashboard/revenue/top-orders`.
  // The tile previews the top 10; the card drills into the full paginated view.
  topOrders: {
    title: "Top Orders",
    why: "Highest-value approved sales-order line items. Drill in for the full, filterable, paginated list.",
    /** `Show all 92 →` — the tile caps at the top 10; the rest live behind the
     *  inner view's server pagination. Mirrors the Sales Team tile. */
    showAll: (count: number) => `Show all ${count} →`,
    /** Overrides the shared `ranking.name` header. Every row's headline here is
     *  an account, so the generic "Name" undersells what the column holds. */
    columnName: "Account Name",
    columnRep: "Sales Person",
    columnCondition: "Condition",
    columnProduct: "Product",
    columnValue: "Value",
    /** NAME sub-line and PRODUCT cell join their parts with this. */
    separator: " · ",
    /** Shown in the PRODUCT cell when a line carries neither category nor OEM. */
    noProduct: "—",
    /** Shown in the CONDITION cell for freeform SO lines that carry no
     *  condition. Kept short — the column is narrow. Distinct wording from the
     *  Condition-Mix `no_condition` label, which is a full-word bucket. */
    noCondition: "—",
  },

  /** Wire condition enum → display label. SHARED: the Top Orders name sub-line
   *  and the Condition Mix column headers both read it, so the two surfaces
   *  cannot disagree about what `new_pull` is called. */
  conditionLabels: {
    new: "New",
    refurbished: "Refurbished",
    new_pull: "New Pull",
    // Freeform SO lines carry no condition; the condition-mix endpoint returns
    // them under this wire key as a real column. The label is the API's own
    // word, de-snake-cased — exactly the transform the three above get
    // (`new_pull` → "New Pull"). It is deliberately NOT a synonym like
    // "Unspecified": inventing a word makes the column impossible to match back
    // to the `no_condition` key in the payload.
    no_condition: "No Condition",
  },

  // ── Sales Funnel tile + detail hero (Performance & Pipeline band) ───────
  // Conversion by population — `GET /crm/dashboard/sales-funnel`. Four rows,
  // fixed order [leads, deals, quotes, demo_requests], each `total` /
  // `converted` / `conv_rate`.
  salesFunnel: {
    title: "Sales Funnel",
    why: "Leads, account-direct deals, quotes and demo requests created in the window, and how many of each converted into a sales order.",
    /** Row labels, keyed by the wire `stage` enum — a label map, so a new stage
     *  on the backend renders without a component edit (§16.12). */
    stageLabels: {
      leads: "Leads",
      deals: "Deals",
      quotes: "Quotes",
      demo_requests: "Demo Requests",
    },
    columnTotal: "Total",
    columnConverted: "Converted",
    columnRate: "Conv %",
    /** Shown when `conv_rate` is null — i.e. `total === 0`, so there is no
     *  denominator. Deliberately NOT "0%", which would read as a bad result
     *  rather than absent data. */
    noValue: "—",
    /** Footnote, shown ONLY while Condition is active (CP-756 / DF-03).
     *  What each facet does to this card, checked against live data:
     *  - Category and OEM narrow EVERY row, totals and converted — nothing to warn about.
     *  - Condition narrows Quotes and Demo Requests fully (their lines record it) but
     *    only the CONVERTED side of Leads and Deals: a lead or deal has no condition
     *    of its own, only the orders behind a won one do. So the one caveat left is
     *    that those two rates compare filtered won with unfiltered totals. */
    productFacetNotes: {
      condition:
        "Leads and Deals have no condition of their own, so Condition narrows only their won counts — their rates compare filtered won with unfiltered totals.",
    },
    empty: NO_RECORDS,
    loadError: "Failed to load the sales funnel.",
  },

  // ── Detail page ─────────────────────────────────────────────────────────
  detail: {
    notFoundTitle: "Insight not found",
    /** `No insight named “foo”.` */
    notFoundSubtitle: (metric: string) => `No insight named “${metric}”.`,
    back: "Back",
    clear: "Clear",
    /** `Clear (3)` — when more than one facet value is active. */
    clearCount: (n: number) => `Clear (${n})`,
    filteredBy: "Filtered by:",
    /** `Remove Category Servers filter` — chip close button aria-label. */
    removeFilter: (field: string, value: string) => `Remove ${field} ${value} filter`,
    /** `+79 more` — expands a field whose chips are collapsed to a few rows. */
    moreValues: (n: number) => `+${n} more`,
    /** Compact overflow counter on the single-line "Filtered by" chip rows. */
    moreCount: (n: number) => `+${n}`,
    /** Collapses an expanded field back to its first rows. */
    showLess: "Show less",
    noResults: NO_RECORDS,
  },

  // ── Filter facets ───────────────────────────────────────────────────────
  facets: {
    vertical: "Channel Type",
    condition: "Condition",
    category: "Category",
    oem: "OEM",
    owner: "Owner",
    account: "Account",
    month: "Month",
    /** `All types` / `All conditions` — the "nothing selected" trigger label. */
    all: (label: string) => `All ${label.toLowerCase()}`,
    /** `2 selected` */
    selected: (count: number) => `${count} selected`,
    allMonths: "All Months",
    searchPlaceholder: "Search…",
    clearSearch: "Clear search",
    loading: "Loading…",
    loadingMore: "Loading more…",
    loadError: "Failed to load options",
    noMatches: "No matches",
  },

  // ── Sales Team detail body ──────────────────────────────────────────────
  // Copy is verbatim from the reference so the ported page reads identically.
  salesTeamDetail: {
    searchPlaceholder: "Search reps…",
    leaderboardTitle: "Sales Team — Leaderboard",
    leaderboardWhy:
      "Each rep by closed revenue against their target, deals closed & leads closed. Click a rep to filter every widget to their records.",
    columnClosed: "Closed",
    /** Holds `yearly_target` — the raw figure from `users.current_target`, NOT
     *  the period-prorated `target` the same row carries. The header is the bare
     *  word by request; note that it therefore does NOT move with the toolbar's
     *  period, while the Closed column beside it does. */
    columnTarget: "Target",
    /** A rep with no yearly target set is a real state (`yearly_target: null`),
     *  not a load failure — an em-dash, never "₹0", which would read as a
     *  target of zero that they have already beaten. */
    noTarget: "—",
    columnDeals: "Deals",
    /** Replaced the seeded "Pipeline" — `lead_count` is real; openPipeline was
     *  invented and has no API field. */
    columnLeads: "Leads",
    /** Roles sub-line under a rep's name: the first role, then `+2` for the
     *  rest. Hovering the count opens the app's standard multi-value table —
     *  same two columns the pill lists use elsewhere. */
    moreRoles: (n: number) => `+${n}`,
    rolesSrNo: "SR No",
    rolesColumn: "Role",
    loading: "Loading team…",
    loadError: "Failed to load the sales team.",
  },

  // ── Summary card (7-tile strip above every insight body) ────────────────
  summary: {
    title: "Summary",
    // hint: "Click any figure to see the underlying records",
    filteredView: "Filtered view",
    leads: "Leads",
    /** LEADS and DEALS both read `closed / total`, so they share one sub-line. */
    wonOfTotalSub: "won / total",
    /** Sub-lines for the DEGRADED tiles — used when the running backend does
     *  not send the denominators (`total_leads` / `total_deals`) and the tile
     *  falls back to the bare count it showed before the ratio landed. Saying
     *  "won / total" under a lone number would be a lie. */
    leadsSub: "top of funnel",
    dealsClosedSub: "orders won",
    /** Was "Deals Closed" — the tile now shows closed AND total, so the label
     *  can no longer claim to be only the closed figure. */
    deals: "Deals",
    quotesDone: "Quotes Done",
    /** `12 won` — the endpoint returns won quotes, not accepted ones. */
    quotesWonSub: (won: number) => `${won} won`,
    /** `42 quotes · 12 won` — count + won under the quotes-value headline. */
    quotesCountWonSub: (total: number, won: number) =>
      `${total.toLocaleString('en-IN')} ${total === 1 ? 'quote' : 'quotes'} · ${won} won`,
    soClosedValue: "SO Closed Value",
    /** Fallback caption when the endpoint omits the order counts. */
    soClosedValueSub: "total won",
    winRate: "Quote → SO Win Rate",
    /** `deals_closed / total_deals` — the tile the endpoint has always returned
     *  (`deal_to_order_rate`) and nothing rendered. */
    dealOrderRate: "Deal → Order Rate",
    leadOrderRate: "Lead → Order Rate",
    leadOrderTime: "Lead → Order Time",
    /** `4.5 days` — the API rounds to 1 dp. */
    days: (n: number) => `${n} days`,
    /** `avg across 40 orders` */
    avgAcross: (n: number) => `avg across ${n} orders`,
    /** `18 of 40 quotes` */
    ofQuotes: (n: number, total: number) => `${n} of ${total} quotes`,
    /** `40 of 250 leads` */
    ofLeads: (n: number, total: number) => `${n} of ${total} leads`,
    /** `240 of 436 deals` */
    ofDeals: (n: number, total: number) => `${n} of ${total} deals`,
    /** Shown when a rate has a zero denominator, or a duration an empty sample. */
    noValue: "—",
    loadError: "Failed to load the summary.",
  },

  // ── Summary drill-down records page (`/crm/insights/records/:tile`) ─────
  records: {
    /** `47 records` — fallback; the server's `header.subtitle` is preferred. */
    count: (n: number) => `${n.toLocaleString("en-IN")} record${n === 1 ? "" : "s"}`,
    /** `Total: ₹1.2 Cr` — shown when the header carries a value total. */
    total: (v: string) => `Total: ${v}`,
    loading: "Loading records…",
    loadError: "Failed to load the records.",
    empty: NO_RECORDS,
    back: "Back",
    notFoundTitle: "Records not found",
    /** `No drill-down for the “foo” tile.` */
    notFoundSubtitle: (tile: string) => `No drill-down for the “${tile}” tile.`,
    /** Header title before the response lands, so first paint names the tile
     *  the user clicked instead of reading "Loading records…". Keyed by
     *  `SummaryTileKey`; the server's `header.title` replaces it on arrival. */
    tileTitle: {
      leads: "Leads",
      "deals-closed": "Deals Closed",
      "quotes-done": "Quotes Done",
      "so-closed-value": "SO Closed Value",
      "win-rate": "Converted Quotes",
      "lead-order-rate": "Orders from Leads",
      "lead-order-time": "Lead → Order Time",
    } as Record<string, string>,
    /** Column headers, keyed by the API FIELD NAME the records endpoint returns.
     *  The drill-down derives its columns from the response, so this is a lookup
     *  for authored labels — a field with no entry here falls back to a humanised
     *  key (`submitted_at` → "Submitted"), which keeps a newly-added backend
     *  field readable without blocking on a strings edit. */
    columns: {
      // Order rows — one per sales order (SO Closed Value / Deals Closed / Leads)
      deal_number: "Deal Number",
      sales_order_number: "SO Number",
      account_name: "Account",
      status: "Status",
      value: "Value",
      submitted_at: "Date",
      /** Deal panel — the deal's owner. */
      owner_name: "Owner",
      /** SO panel — who raised the order (`created_by`, not the submitter). */
      created_by_name: "Created By",
      /** SO panel — the credited submitter (`submitted_by_id`), the person the
       *  tile's number is attributed to. */
      submitted_by_name: "Submitted By",
      // Quote rows
      quote_number: "Quote Number",
      /** Quote rows: the account type (or the lead's channel type) — the same
       *  End Customer / Channel Partner / … values the Channel Type filter uses. */
      vertical: "Channel Type",
      converted: "Converted",
      converted_so_number: "SO Number",
      created_at: "Date",
      // Lead rows
      /** The lead panel's ONE polymorphic reference (`record_id` +
       *  `record_number` + `record_type`): the Deal a lead became once it
       *  converted, the Lead itself until then. Named for both because the
       *  column genuinely holds either, row by row. */
      record_number: "Lead / Deal",
      /** Still authored because `ENTITY_LINKS` keeps a `lead_id` + `lead_code`
       *  pair for any panel that ships one; no current panel does. */
      lead_code: "Lead Number",
      company_name: "Company",
      stage: "Stage",
      /** Lead's `assigned_to` — on BOTH lead panels (`lead:total` rows and
       *  `lead:won` order rows), so the same person reads the same on each. */
      rep_name: "Owner",
      /** Boolean-true cell (false renders as the shared em-dash). */
      yes: "Yes",
    },
  },

  // ── Ranking table chrome ────────────────────────────────────────────────
  ranking: {
    rank: "#",
    name: "Name",
  },

  // ── Trend cells (shared by both detail bodies) ──────────────────────────
  trends: {
    revenueTrend: "Revenue Trend",
    revenueTrendWhy: "Closed revenue by period — the up/down trend.",
    leads: "Leads",
    leadsWhy: "Estimated leads generated each period — top of the funnel.",
    dealsClosed: "Deals Closed",
    dealsClosedWhy: "Number of orders (deals) closed each period.",
    soClosedValue: "SO Closed Value",
    soClosedValueWhy: "Sales-order value closed each period.",
    /** AOV detail-page cell — the same live series the dashboard tile plots,
     *  drilled into. `metric: 'avg_order_value'` on `/crm/dashboard/revenue`. */
    aovByPeriod: "AOV by Period",
    aovByPeriodWhy: "Average order value per period over Approved sales orders.",
  },

  // ── Revenue by Month detail body ────────────────────────────────────────
  revenueDetail: {
    /** Period-keyed like the tile it drills in from — the hero plots the same
     *  series, so a "Revenue by Month" header over weekly buckets would be the
     *  same bug one screen deeper. */
    heroTitle: {
      weekly: "Revenue by Week",
      monthly: "Revenue by Month",
      quarterly: "Revenue by Quarter",
      yearly: "Revenue by Year",
      custom: "Revenue by Month",
    } satisfies Record<DashboardPeriod, string>,
    heroWhy: "Closed revenue per period — the up/down trend.",
    breakdownTitle: "Monthly Breakdown",
    breakdownWhy: "Revenue, month-on-month change and share of total for each month.",
    columnMonth: "Month",
    columnRevenue: "Revenue",
    columnMom: "MoM",
    columnShare: "Share",
    /** `▲ +12.3%` / `▼ -5.0%` — the reference's MoM arrows. */
    mom: (pct: number) => `${pct >= 0 ? "▲ +" : "▼ "}${pct.toFixed(1)}%`,
    momNone: "—",
  },

  // ── Period-wise breakdown cell (`/crm/dashboard/insights/period-wise-breakdown`)
  //
  // ONE table, four bucket units. Every unit-dependent label is keyed by the
  // response's `bucket_unit` rather than the toolbar's period, so the header
  // can never disagree with the rows it sits over.
  periodBreakdown: {
    title: {
      week: "Weekly Breakdown",
      month: "Monthly Breakdown",
      quarter: "Quarterly Breakdown",
      year: "Yearly Breakdown",
    },
    /** Header over the bucket-label column. */
    nameHeader: {
      week: "Week",
      month: "Month",
      quarter: "Quarter",
      year: "Year",
    },
    /** Header over the change column — WoW / MoM / QoQ / YoY. */
    changeHeader: {
      week: "WoW",
      month: "MoM",
      quarter: "QoQ",
      year: "YoY",
    },
    why: "Revenue, change vs the previous period and share of total for each period.",
    /** Heading for the Growth page's percentage-only list (`GrowthDeltaList`).
     *  Keyed by the response's `bucket_unit` like `title` above — the cell
     *  adapts to the toolbar's period, so a hardcoded "Month-on-Month" would
     *  sit over quarter rows on a quarterly board. The "%" belongs in the title
     *  because the list renders bare numbers with no unit of their own. */
    changeTitle: {
      week: "Week-on-Week Growth %",
      month: "Month-on-Month Growth %",
      quarter: "Quarter-on-Quarter Growth %",
      year: "Year-on-Year Growth %",
    },
    /** That list shows the period-over-period move ONLY — no revenue, orders or
     *  share — so it needs its own sub-copy rather than `why` above, which
     *  promises columns it does not render. */
    whyChange: "Period-over-period change for each period.",
    /** The `ledger` variant — the Growth page's row: Month / Revenue / Δ Value /
     *  MoM %. Deliberately NOT the `full` variant's Orders and Share: this table
     *  answers "how did revenue MOVE", and a count and a share of total are a
     *  different question that belongs on the Monthly Breakdown. */
    ledgerTitle: "Growth Ledger",
    ledgerWhy:
      "Revenue per period with the change in rupees and percent against the period before it.",
    columnRevenue: "Revenue",
    columnOrders: "Orders",
    columnShare: "Share",
    /** Header over the absolute change column — the rupee delta behind the
     *  percentage. `Δ` because the ledger's two change columns sit side by side
     *  and "Change / Change %" reads as one column split in two. */
    columnDelta: "Δ Value",
    /** The ledger's header over the percent column. Its own map rather than
     *  `changeHeader` above: the ledger carries a rupee change RIGHT BESIDE it,
     *  so the bare "MoM" would not say which of the two it labels. The `full`
     *  variant has no such neighbour and keeps the short form. */
    changePctHeader: {
      week: "WoW %",
      month: "MoM %",
      quarter: "QoQ %",
      year: "YoY %",
    },
    /** See `directionalPct` at the top of this file — the Growth tile renders
     *  its headline through the very same function. */
    change: directionalPct,
    /** `+₹79.3L` / `-₹75.8L` — the rupee twin of `change`. The caller passes the
     *  ALREADY-FORMATTED absolute amount and the server's `direction`, so the
     *  sign here can never contradict the arrow in the percent column beside it
     *  (same rule as `directionalPct`: read `direction`, never the raw sign).
     *
     *  A signed number rather than an arrow: the arrow is already carried by the
     *  MoM % column next to it, and two glyphs on one row of the same movement
     *  is noise. */
    delta: (amount: string, direction: "up" | "down" | "flat") =>
      direction === "flat" ? amount : `${direction === "up" ? "+" : "-"}${amount}`,
    /** Row 0 has no previous bucket — the server flags it as
     *  `direction: "none"`. */
    changeNone: "—",
    // No `totals` member: this table's footer is the pager only, same as the
    // two mix tables. The Revenue column carries each bucket's figure, and a
    // window-totals line restated numbers already on screen.
    loading: "Loading breakdown…",
    loadError: "Failed to load the breakdown.",
  },

  // ── Condition Mix by Period (`/crm/dashboard/insights/condition-mix-by-period`)
  conditionMix: {
    /** Keyed by the RESPONSE's `bucket_unit`, not the toolbar's period — keying
     *  off the toolbar makes the header describe the next fetch while the bars
     *  still show the previous one. Same rule as `periodBreakdown.title`. */
    title: {
      week: "Condition Mix by Week",
      month: "Condition Mix by Month",
      quarter: "Condition Mix by Quarter",
      year: "Condition Mix by Year",
    },
    why: "How the new / refurbished / new-pull split moves over time.",
    /** Header over the bucket-label column, keyed by the response's
     *  `bucket_unit` like the title. Mirrors `periodBreakdown.nameHeader`. */
    nameHeader: {
      week: "Week",
      month: "Month",
      quarter: "Quarter",
      year: "Year",
    },
    /** Header over the row-total column, after the dynamic condition columns. */
    columnTotal: "Total",
    // No `totals` member: this table's footer is the pager only, same as
    // Vertical Mix. The Total column carries each row's sum, and a
    // window-totals line restated figures already on screen.
    loading: "Loading condition mix…",
    loadError: "Failed to load the condition mix.",
  },

  // ── Vertical Mix by Period (`/crm/dashboard/insights/vertical-mix-by-period`)
  // The condition-mix cross-tab over the account-type dimension. No label map:
  // this endpoint's column keys are display labels already.
  verticalMix: {
    /** Keyed by the RESPONSE's `bucket_unit` — same rule as `conditionMix`. */
    title: {
      week: "Vertical Mix by Week",
      month: "Vertical Mix by Month",
      quarter: "Vertical Mix by Quarter",
      year: "Vertical Mix by Year",
    },
    why: "Revenue split by account type over time.",
    /** Header over the bucket-label column, mirroring `periodBreakdown`. */
    nameHeader: {
      week: "Week",
      month: "Month",
      quarter: "Quarter",
      year: "Year",
    },
    /** Header over the row-total column, after the dynamic vertical columns. */
    columnTotal: "Total",
    // No `totals` / `byColumn` members: this table's footer is the pager only.
    // The Total column carries each row's sum, and a window-totals line
    // restated figures already on screen.
    loading: "Loading vertical mix…",
    loadError: "Failed to load the vertical mix.",
  },

  // ── Growth tile (`/crm/dashboard/growth`) ──────────────────────────────
  growth: {
    /** Keyed by period unit, like `periodBreakdown.title` — the card must not
     *  say "This Month" while comparing quarters. */
    title: {
      week: "Growth This Week",
      month: "Growth This Month",
      quarter: "Growth This Quarter",
      year: "Growth This Year",
    },
    why: "Revenue for the current period vs the previous full period.",
    /** The headline percentage. Same function the breakdown table's change
     *  column uses — see `directionalPct`. */
    delta: directionalPct,
    /** `Jun 2026 → Jul 2026`. Both labels are PRE-FORMATTED by the server;
     *  never re-derive them from `start`/`end` client-side. */
    window: (prev: string, cur: string) => `${prev} → ${cur}`,
    /** `+₹4.6L vs Jun 2026` — the absolute change beside the percentage. */
    deltaVs: (amount: string, prev: string) => `${amount} vs ${prev}`,
    orders: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
    /** Shown INSTEAD of `deltaVs` when the previous window had no revenue.
     *  The backend encodes that case as `delta_pct: +100`, which would
     *  otherwise read as "we doubled" when the truth is "we started from
     *  nothing". */
    fromZero: "No revenue in the previous period",
    /** The board offers a `custom` period; this endpoint does not accept one
     *  (no equal-length previous window exists for an arbitrary range), so the
     *  tile falls back to monthly. Said out loud rather than left implicit —
     *  see `toGrowthParams`. */
    customNote: "Custom range not supported here — showing monthly",
    loading: "Loading growth…",
    loadError: "Failed to load growth.",
  },

  // ── Account Movement (`/crm/dashboard/account-movement`) ─────────────────
  //
  // Two SEPARATE widgets on the dashboard — one for top growing, one for
  // top declining — each a half-row card. Both call the same endpoint in
  // widget mode and TanStack Query dedupes on identical params, so the
  // pair costs one network request and shares one cache entry.
  //
  // The whole card drills into `/crm/insights/account-movement` once
  // Phase 2 lands; until then the link 404s and each tile is a read-only
  // widget.
  accountMovement: {
    /** Dashboard tile headings — the two cards sit side by side, so each
     *  carries just its own direction. */
    growingTitle: "Top Growing Customers",
    decliningTitle: "Top Declining Customers",
    /** Drill-down page header — the insights page folds both bucket cards
     *  under one heading, so this one names both halves. */
    pageTitle: "Top Growing & Declining Customers",
    whyGrowing:
      "Accounts whose closed-SO revenue climbed most between the previous full period and the current one.",
    whyDeclining:
      "Accounts whose closed-SO revenue fell most between the previous full period and the current one.",
    /** Chips shown in place of a % on zero-previous (`new`) and zero-current
     *  (`lapsed`) rows. ±100% on its own reads as "doubled" / "dropped
     *  completely" and hides the edge case — the chip spells it out. */
    newLabel: "new",
    lapsedLabel: "lapsed",
    /** `Q2 FY 2026-27 vs Q1 FY 2026-27` — pre-formatted labels; never
     *  re-derive from `start` / `end`. */
    window: (prev: string, cur: string) => `${cur} vs ${prev}`,
    /** Empty-bucket copy — rare, but possible under a tight visibility
     *  scope where no account qualifies in that direction. */
    emptyGrowing: "No growing accounts in this period.",
    emptyDeclining: "No declining accounts in this period.",
    loading: "Loading movement…",
    loadError: "Failed to load account movement.",
    /** Section titles used on the insights page where the two bucket cards
     *  sit at larger span and need their own standalone sub-heading. */
    sectionGrowingTitle: "Top Growing Customers",
    sectionDecliningTitle: "Top Declining Customers",
    /** Movement Mix donut (insights page) — the five status counts off
     *  `summary`, as a share of every classified account. */
    mixTitle: "Account Movement Mix",
    whyMix: "How the book splits between growing, declining, lapsed, flat and new accounts.",
    emptyMix: "No account moved in this period.",
    /** All Accounts table (insights page) — the paginated `movement=all`
     *  drill-down: every classified account, both windows, change, class. */
    allTitle: "All Accounts — Movement",
    whyAll: "Every account in scope with both windows, the change and its movement class.",
    columnAccount: "Account",
    columnType: "Type",
    columnRep: "Rep",
    columnChange: "Change",
    columnPct: "%",
    columnMovement: "Movement",
    /** Fallback headers for the two window columns until the first response
     *  brings the server's window labels. */
    columnPrevious: "Previous",
    columnCurrent: "Current",
    /** Rows whose account carries no type / no primary owner. */
    noType: "—",
    noRep: "—",
    /** Status → display label, shared by the donut legend and the table badge. */
    statusLabel: {
      growing: "Growing",
      declining: "Declining",
      new: "New",
      lapsed: "Lapsed",
      flat: "Flat",
    },
  },

  // ── New Accounts (`/crm/dashboard/new-accounts`) ────────────────────────
  //
  // Dashboard tile — count of newly-acquired accounts in the current period
  // window, "+/- vs previous" delta badge, revenue these new accounts
  // contributed, and a top-N ranked list. Rule A per
  // NEW_ACCOUNTS_WIDGET_PLAN: "new" = account's first-ever sales order
  // landed in the window.
  newAccounts: {
    title: "New Accounts",
    why: "Approved accounts that placed their first-ever order, or were created, in the current period.",
    /** Caption under the big count. `window` is the current window label. */
    captionNewIn: (window: string) => `New in ${window}`,
    /** Signed delta badge, e.g. `+3 vs Q1 FY 2026-27`. */
    deltaBadge: (sign: string, count: number, prevWindow: string) =>
      `${sign}${count} vs ${prevWindow}`,
    /** Revenue sub-line, e.g. `₹2.0Cr revenue to date`. */
    revenueLine: (amount: string) => `${amount} revenue to date`,
    /** Row sub-line, e.g. `May 2026 · ₹11.2L first · 6 ord`. Order count
     *  pluralises so 1 order reads `1 ord` not `1 ords`. */
    rowSubline: (month: string, firstValue: string, orders: number) =>
      `${month} · ${firstValue} first · ${orders} ord`,
    /** Row sub-line / `Since` cell for an approved account that has not
     *  raised any order yet (its `first_order_*` fields are null). */
    noOrderYet: "No order yet",
    /** `First Order` cell for the same rows — no value to print. */
    noFirstOrder: "—",
    emptyState: "No new accounts in this period.",
    loading: "Loading new accounts…",
    loadError: "Failed to load new accounts.",
    /** Drill-down page header (`/crm/insights/new-accounts`). */
    pageWhy:
      "Approved accounts that placed their first order, or were created, in the current window — how many, what they bought first and what they have grown into.",
    // ── insight-page cells ──────────────────────────────────────────────
    byPeriodTitle: "New Accounts by Period",
    whyByPeriod: "Accounts whose first order landed in each period.",
    byVerticalTitle: "New Accounts by Vertical",
    whyByVertical: "Channel vs end-customer share of new logos.",
    /** `New Accounts — Q3 FY 2026-27` — the server's window label, verbatim. */
    listTitle: (window: string) => `New Accounts — ${window}`,
    whyList:
      "First order, when they started and what they have grown into. Accounts approved but not yet ordering read as no order yet.",
    columnAccount: "Account",
    columnFirstOrder: "First Order",
    columnSince: "Since",
    columnTotal: "Total",
    columnOrders: "Orders",
    newVsRepeatTitle: "New vs Repeat Revenue",
    whyNewVsRepeat: "Revenue from first-time buyers vs returning accounts per period.",
    columnPeriod: "Period",
    columnNew: "New",
    columnRepeat: "Repeat",
    categoryOemTitle: "What New Accounts Buy — Category & OEM",
    whyCategoryOem: "Closed value by category and by OEM across the new cohort.",
  },

  // ── Inactive Accounts (board tile) ──────────────────────────────────────
  //
  // Buyers with no approved SO inside the window: a preset is a rolling day
  // window ending today (monthly=30d, quarterly=90d, yearly=365d, weekly=7d);
  // a custom range or month selection is the selected window itself. Big
  // count + "of N buyers · X%" caption. Row list reads "last May · 4 mo" style.
  inactiveAccounts: {
    title: "Inactive Accounts",
    why: "Buyers in scope with no approved order inside the selected window. Product filters narrow which orders count.",
    /** Caption under the big count — e.g. `OF 24 BUYERS · 33%`. */
    captionOfBuyers: (totalBuyers: number, pct: number) =>
      `OF ${totalBuyers} BUYERS · ${pct}%`,
    /** Window sub-line — the server's label verbatim: `Last 90 days` or
     *  `1 Jun - 31 Aug 2026`. */
    windowLine: (label: string) => `No order in ${label.charAt(0).toLowerCase()}${label.slice(1)}`,
    /** Right-side revenue sub-line — e.g. `₹1.2Cr revenue at risk`. */
    revenueAtRiskLine: (amount: string) => `${amount} revenue at risk`,
    /** Row sub-line, e.g. `last May · 4 mo`. Months are the integer gap
     *  the backend already computed; FE renders verbatim. */
    rowSubline: (lastLabel: string, idle: string) => `${lastLabel} · ${idle}`,
    emptyState: "Every buyer has a recent order.",
    loading: "Loading inactive accounts…",
    loadError: "Failed to load inactive accounts.",
    /** The Category × Brand pivot over the inactive cohort's PAST orders. */
    categoryOemTitle: "What Inactive Accounts Used to Buy — Category & OEM",
    whyCategoryOem:
      "Closed value by category and by OEM across every order these dormant accounts placed before the window.",
    categoryOemEmpty: "No past orders for the inactive accounts in this window.",
    /** Drill-down page header (`/crm/insights/inactive-accounts`). */
    pageWhy:
      "Buyers with no order in the window — revenue at risk, how long they have been quiet and what they used to buy.",
    // ── insight-page cells ──────────────────────────────────────────────
    /** `Inactive Accounts — Last 30 days` — the server's window label, verbatim.
     *  Heads the win-back table, which IS the page's list of dormant accounts. */
    listTitle: (window: string) => `Inactive Accounts — ${window}`,
    columnAccount: "Account",
    columnLastOrder: "Last Order",
    columnIdle: "Idle",
    /** `4 mo` / `17 wk` — the backend's whole-unit gap, in the period's unit. */
    idleIn: (units: number, unit: "week" | "month") => `${units} ${unit === "week" ? "wk" : "mo"}`,
    whyWinBack:
      "The same dormant accounts with who owns them and what an order used to be worth, so the next call is sized before it is made.",
    columnRep: "Rep",
    columnAvgOrder: "Avg Order",
    /** A cell with nothing to show — no rep on the last order, no orders to
     *  average. Prints as absent, never ₹0. */
    pending: "—",
    // ── Active vs Inactive Buyers by Period ─────────────────────────────
    byPeriodTitle: {
      week: "Active vs Inactive Buyers by Week",
      month: "Active vs Inactive Buyers by Month",
      quarter: "Active vs Inactive Buyers by Quarter",
      year: "Active vs Inactive Buyers by Year",
    },
    whyByPeriod:
      "Buyers who ordered in each period, and how many earlier buyers had gone quiet by then.",
    columnActive: "Active buyers",
    columnInactive: "Inactive",
    columnInactivePct: "Inactive %",
    byPeriodLoading: "Loading buyers by period…",
    byPeriodLoadError: "Failed to load buyers by period.",
  },

  // ── Account Movement — 4-tile summary strip (insights page) ─────────────
  //
  // Reads the SAME widget-mode response as the two bucket cards (one network
  // request serves the whole page). Numbers:
  //
  //   growing_count + new_count     → Growing Accounts tile
  //   declining_count + lapsed_count → Declining Accounts tile
  //   net_delta                     → Net Movement tile
  //   biggest_mover                 → Biggest Mover tile (account name + delta)
  accountMovementTiles: {
    growingAccountsLabel: "Growing accounts",
    decliningAccountsLabel: "Declining accounts",
    netMovementLabel: "Net movement",
    biggestMoverLabel: "Biggest mover",
    biggestMoverNone: "—",
    biggestMoverSubline: (sign: string, amount: string, status: string) =>
      `${sign}${amount} · ${status}`,
    /** Signed rupee aggregate for the growing / declining tiles. Mirrors the
     *  mock: `+₹2.9Cr` under GROWING ACCOUNTS, `-₹1.4Cr` under DECLINING
     *  ACCOUNTS. Backend returns `growing_delta` positive, `declining_delta`
     *  negative; the caller passes the sign explicitly so a zero bucket
     *  reads "+₹0" rather than a bare "0". */
    bucketDeltaSubline: (sign: string, amount: string) => `${sign}${amount}`,
    loading: "Loading summary…",
    loadError: "Failed to load summary.",
  },

  // ── Insights KPI strip (`/crm/dashboard/insights/summary-tiles`) ────────
  //
  // Only the CHROME lives here. Every tile's label, value and sub-line is a
  // pre-formatted string the endpoint returns — four bundles' worth of copy
  // that would go stale the moment the backend changed a threshold. §16.12
  // bans naked strings in components, not server-owned data.
  insightTiles: {
    loadError: "Failed to load the KPI tiles.",
    /** Drill-down page (`/crm/insights/tile/:reportType/:slot`) — the account
     *  breakdown behind a KPI tile. Opens in a NEW TAB, same as the summary
     *  strip's records drill-through, so the board stays live behind it. */
    drilldown: {
      /** Header before the tiles response lands, so first paint is not blank. */
      loadingTitle: "Tile breakdown",
      /** Titles are keyed by TARGET KIND, not fixed.
       *
       *  A tile now opens one of four row sets — accounts, records, ranked
       *  line items, or the AOV-by-category split — and the page used to
       *  announce every one of them as "— by account". A Leads tile opening a
       *  page headed "Leads — by account" over a list of leads is a caption
       *  that contradicts what is under it.
       *
       *  The tile's own label still leads, because that is what the user
       *  clicked; only the suffix names what they are now looking at. */
      titleFor: {
        "by-source": (tileLabel: string) => `${tileLabel} — by account`,
        records: (tileLabel: string) => `${tileLabel} — records`,
        "top-orders": (tileLabel: string) => `${tileLabel} — top orders`,
        "aov-by-category": (tileLabel: string) => `${tileLabel} — by category`,
      },
      /** Per-tile override for a panel whose TILE LABEL would misdescribe the
       *  rows beneath it. Keyed `<report_type>:<tile key>`; anything absent
       *  falls through to `titleFor` above.
       *
       *  `avg_order_value:aov` is the one entry today. That tile opens the
       *  ACCOUNT breakdown — one row per account carrying revenue and an
       *  order count — so `titleFor['by-source']` rendered "Avg Order Value —
       *  by account", which reads as AOV *per account*. The panel never
       *  carries the tile's own measure per row, so the heading promised a
       *  figure that is not in the table. Naming the rows instead.
       *
       *  Deliberately NOT a change to `titleFor['by-source']`: that string
       *  serves every by-source tile, and "Total Revenue — revenue by
       *  account" would be redundant for most of them. */
      titleOverride: {
        "avg_order_value:aov": "Revenue by Account",
        // The panel lists the cohort's orders from BEFORE the window — the
        // generic "— records" suffix would read as if they were in it.
        "inactive_accounts:inactive": "Inactive accounts — Past orders",
      } as Record<string, string | undefined>,
      title: (tileLabel: string) => `${tileLabel} — by account`,
      /** The range the page covers. Load-bearing, not decoration: a Peak tile
       *  opens ONE bucket while Total Revenue opens the whole window, and the
       *  two pages are otherwise identical. */
      range: (from: string, to: string) => `${from} to ${to}`,
      loading: "Loading accounts…",
      loadError: "Failed to load the account breakdown.",
      empty: "No account revenue in this range.",
      /** Records panel — the rows themselves (leads / orders), not an
       *  aggregate, so both strings speak about records. */
      recordsLoadError: "Failed to load the records.",
      /** Sub-copy for the two bodies that reuse a PAGE cell. Those components
       *  take `title` / `why` because they normally sit in a grid of cards
       *  that each explain themselves; here the tile's own label is the title,
       *  so `why` says what the panel is rather than repeating it. */
      topOrdersWhy: "Every line item behind this tile, ranked by value.",
      aovByCategoryWhy: "Average order value per category, behind this tile.",
      recordsEmpty: "No records in this range.",
      notFoundTitle: "Drill-down not available",
      /** Two ways to land here, and they are NOT the same story: a tile that
       *  ships no `drilldown` (an average, a rate) versus a URL naming a slot
       *  or bundle that does not exist. The first is normal product behaviour
       *  reached by editing a URL; the second is a broken link. */
      notFoundSubtitle: "This tile has no breakdown behind it.",
      /** The tile exists on the board but the filters on THIS page hide it (e.g.
       *  Condition → New removes "Refurb + Pull"). The page keeps its filter bar so
       *  the reader can change or clear the filter — it is not a dead end. */
      filteredOutTitle: "Tile hidden by the current filters",
      filteredOut: "This tile has no data under the filters you applied. Change or clear a filter to bring it back.",
      /** Column head. "Closed by", NOT "Submitted by": the backend credits the
       *  SO's source owner (the rep who owned the lead / deal), not whoever
       *  clicked Submit. */
      columnClosedBy: "Closed By",
      columnAccount: "Account",
      columnRank: "#",
      noClosers: "—",
      /** Hover-card table shown when an account has more than one closer —
       *  the `+N` chip's expansion. Answers "who closed most of it?", which is
       *  the question a second name on the row immediately raises. */
      closerColumns: {
        name: "User",
        orders: "Orders",
        value: "Value Closed",
      },
    },
  },

  // ── Shared breakdown cells (both detail bodies) ─────────────────────────
  breakdowns: {
    /** The account split where it IS the subject — the dashboard tile and the
     *  `account-revenue` page it drills into. One name across both, so the
     *  drill-through never renames what the user clicked. */
    accounts: "Revenue by Account",
    /** The SAME breakdown as a SUPPORTING cell on every other metric's page,
     *  where it is one ranking beside several other splits. */
    accountsDetail: "Top Accounts",
    accountsWhy: "Accounts ranked by closed revenue. Click a row to filter.",
    category: "Category — Value Closed",
    categoryWhy: "Closed value by product category. Click a row to filter.",
    oem: "OEM — Value Closed",
    oemWhy: "Closed value by OEM / brand. Click a row to filter.",
    categoryOem: "Category & OEM — Value Closed",
    categoryOemWhy: "Closed value by product category and by OEM / brand, side by side.",
    // Category × OEM pivot widget — the "Category & Brand Mix" card that lands
    // between the by-category and by-oem breakdowns. Same slice, second view:
    // the pivot answers "which category × which brand" instead of the two
    // ranked lists' "which category" or "which brand" alone.
    categoryOemMix: "Category & Brand Mix",
    categoryOemMixWhy:
      "Approved-order value crossed by category and OEM. Rows sorted by category total, columns by OEM total; the No OEM column holds freeform (non-catalog) SO lines.",
    categoryOemMixTopCategory: "Top Category",
    categoryOemMixTopOem: "Top Brand",
    categoryOemMixTotalValue: "Total Value",
    // Breadth tile — how many categories × brands the window's orders span.
    categoryOemMixBreadth: "Breadth",
    categoryOemMixBreadthValue: (categories: number, brands: number) =>
      `${categories.toLocaleString("en-IN")} × ${brands.toLocaleString("en-IN")}`,
    categoryOemMixBreadthSub: "category × brand",
    categoryOemMixNoOrders: "No orders",
    categoryOemMixShareSuffix: "share",
    categoryOemMixPivotCorner: "Category ↓ · Brand →",
    categoryOemMixPivotRowTotal: "Total",
    categoryOemMixPivotColumnTotal: "Total",
    categoryOemMixPivotZeroCell: "—",
    categoryOemMixOrdersLabel: (n: number) =>
      `${n.toLocaleString("en-IN")} order${n === 1 ? "" : "s"}`,
    accountType: "Channel Partner vs End Customer vs Cloud D/C vs End User",
    accountTypeWhy: "Revenue split by account type. Click a slice to filter.",
    condition: "Revenue by Condition",
    conditionWhy: "New vs Refurbished vs New Pull. Click a slice to filter.",
    topProducts: "Top Products",
    topProductsWhy: "Best-selling products (category · OEM) by closed value.",
    // Avg Order Value per IMS category — its own endpoint, not a by-source
    // report type. Sits under the AOV trend on the avg-order-value view.
    aovByCategory: "Avg Order Value by Category",
    aovByCategoryWhy: "Which categories carry the biggest tickets.",
    columnValueClosed: "Value Closed",
    columnShare: "Share",
    columnOrders: "Orders",
    columnAvgOrder: "Avg Order",
    /** Extra column used by mounts that opt in via `showOem` on
     *  `<RevenueBySourceTable>` — the account 360° tab is the caller today. */
    columnOem: "OEM",
    /** Extra column used by mounts that opt in via `showQty`. Only meaningful
     *  for `report_type=top_products`; other report types return `qty_sold=0`. */
    columnQty: "Qty",
    /** Placeholder cell for rows that carry no value on an opt-in column —
     *  the "Other" freeform-product row has no OEM, non-top_products rows
     *  have no meaningful quantity. */
    emptyCell: "—",
    total: "Total",
  },
} as const
