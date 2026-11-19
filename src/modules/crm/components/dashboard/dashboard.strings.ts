// User-facing copy for the CRM › dashboard sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): page/card titles,
// KPI labels, chart series names, filter option labels, table column headers,
// and empty/loading text live here as one typed `as const` object instead of
// being hardcoded ("naked") in JSX/hooks. Components import this single source
// so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `tasks.dueLabel`).
export const DASHBOARD_STRINGS = {
  page: {
    title: "CRM Dashboard",
    subtitle: "Pipeline, leads, tasks, and revenue for the selected period.",
    breadcrumbCrm: "CRM",
    breadcrumbDashboard: "Dashboard",
  },
  filters: {
    presets: {
      today: "Today",
      monthly: "This Month",
      quarterly: "This Quarter",
      yearly: "This Year",
      custom: "Custom",
    },
    rangeSeparator: "to",
    allUsers: "All Users",
  },
  kpis: {
    openDeals: "My Open Deals",
    untouchedDeals: "Untouched Deals",
    myLeads: "My Leads",
    callsToday: "My Calls Today",
    openTasks: "Open Tasks",
    upcomingMeetings: "Upcoming Meetings",
    closingThisMonth: "Closing This Month",
    revenueWon: "Revenue (Won)",
    totalAccounts: "Total Accounts",
    conversionRate: "Conversion Rate",
    dealsClosingThisMonth: "Deals Closing This Month",
    pipelineValue: "Pipeline Value",
    overdueSuffix: (count: number) => ` (${count} overdue)`,
    percentValue: (rate: string) => `${rate}%`,
  },
  charts: {
    stageDistributionTitle: "Deal Stage Distribution",
    leadSourceTitle: "Lead Source Distribution",
    revenueTrendTitle: "Revenue Trend",
    pipelineKanbanTitle: "Pipeline Kanban",
    series: {
      deals: "Deals",
      revenue: "Revenue",
      pipelineValue: "Pipeline Value",
      tasks: "Tasks",
    },
    pieLabel: (name: unknown, value: unknown) => `${name}: ${value}`,
  },
  tasks: {
    overviewTitle: "Tasks Overview",
    openTasksHeading: "Open Tasks",
    dueLabel: (dueDate: string) => `Due ${dueDate}`,
  },
  accounts: {
    topAccountsTitle: "Top Accounts by Deal Value",
    empty: "No account data for selected filters.",
    dealCount: (count: number) => `${count} deal${count !== 1 ? "s" : ""}`,
  },
  activity: {
    recentWonTitle: "Recent Won Deals",
    recentWonEmpty: "No won deals in this period.",
    closedPrefix: (closeDate: string) => `Closed ${closeDate}`,
    upcomingMeetingsTitle: "Upcoming Meetings",
    upcomingMeetingsEmpty: "No upcoming meetings.",
  },
  closing: {
    title: (count: number) => `Deals Closing This Month (${count})`,
    empty: "No deals expected to close this month.",
    columns: {
      deal: "Deal",
      account: "Account",
      value: "Value",
      stage: "Stage",
      probability: "Probability",
      closeDate: "Close Date",
      owner: "Owner",
    },
    probabilityValue: (probability: number) => `${probability}%`,
  },
} as const
