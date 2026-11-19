const BASE = "/api/v1";

export const endpoints = {
  config: {
    features: `${BASE}/config/features`,
  },
  auth: {
    login: `${BASE}/auth/login`,
    google: `${BASE}/auth/google`,
    sso: (provider: string) => `${BASE}/auth/sso/${provider}`,
    me: `${BASE}/auth/me`,
    logout: `${BASE}/auth/logout`,
    users: `${BASE}/auth/users`,
    user: (id: string) => `${BASE}/auth/users/${id}`,
  },
  users: {
    list: `${BASE}/users`,
    detail: (id: string) => `${BASE}/users/${id}`,
  },
  ims: {
    categories: `${BASE}/ims/categories`,
    category: (id: string) => `${BASE}/ims/categories/${id}`,
    categoryAncestors: (id: string) => `${BASE}/ims/categories/${id}/ancestors`,
    categoryDescendants: (id: string) =>
      `${BASE}/ims/categories/${id}/descendants`,

    oems: `${BASE}/ims/oems`,
    oem: (id: string) => `${BASE}/ims/oems/${id}`,

    parts: `${BASE}/ims/parts`,
    part: (id: string) => `${BASE}/ims/parts/${id}`,
    partAutocomplete: `${BASE}/ims/parts/autocomplete`,
    partVariants: (partId: string) => `${BASE}/ims/parts/${partId}/variants`,
    // What goes in the box with a rented unit of this model (return-by-count §9.1).
    partKitItems: (partId: string) => `${BASE}/ims/parts/${partId}/kit-items`,

    variants: `${BASE}/ims/variants`,
    variant: (id: string) => `${BASE}/ims/variants/${id}`,
    variantAutocomplete: `${BASE}/ims/variants/autocomplete`,
    variantStock: (id: string) => `${BASE}/ims/variants/${id}/stock`,
    variantPriceHistory: (id: string) =>
      `${BASE}/ims/variants/${id}/price-history`,
    variantPrice: (id: string) => `${BASE}/ims/variants/${id}/price`,

    // Reference BOM lives on the part-variant, not the part. Two operations:
    // PUT replace (create-or-update, declarative diff) and DELETE soft-delete.
    // The variant GET embeds the current BOM under `bom`, so a read-only
    // surface can lean on that and skip a separate fetch.
    variantBom: (variantId: string) =>
      `${BASE}/ims/part-variants/${variantId}/bom`,

    pmAssignments: `${BASE}/ims/pm-assignments`,
    pmAssignment: (id: string) => `${BASE}/ims/pm-assignments/${id}`,
    pmLookupEligiblePMs: `${BASE}/ims/pm-lookup/eligible-pms`,

    stockItems: `${BASE}/ims/stock-items`,
    stockItem: (id: string) => `${BASE}/ims/stock-items/${id}`,
    stockMovements: `${BASE}/ims/stock-movements`,
    inventorySummary: `${BASE}/ims/inventory-summary`,

    hsnCodes: `${BASE}/ims/hsn-codes`,
    hsnCode: (id: string) => `${BASE}/ims/hsn-codes/${id}`,

    specificationAttributes: `${BASE}/ims/specification-attributes`,
    specificationAttribute: (id: string) =>
      `${BASE}/ims/specification-attributes/${id}`,

    imsChecklists: `${BASE}/ims/checklists`,
    imsChecklist: (id: string) => `${BASE}/ims/checklists/${id}`,
    imsChecklistResolve: `${BASE}/ims/checklists/resolve`,
    imsChecklistTypes: `${BASE}/ims/checklist-types`,

    statsOverview: `${BASE}/ims/stats/overview`,
    stockItemBySerial: (serial: string) =>
      `${BASE}/ims/stock-items/by-serial/${encodeURIComponent(serial)}`,
    stockItemMovements: (id: string) =>
      `${BASE}/ims/stock-items/${id}/movements`,
    stockItemDispose: (id: string) => `${BASE}/ims/stock-items/${id}/dispose`,
    // BOM Lite — what is physically inside this unit (component-tracking D1).
    stockItemComponents: (id: string) => `${BASE}/ims/stock-items/${id}/components`,
    stockItemMove: (id: string) => `${BASE}/ims/stock-items/${id}/move`,

    activity: `${BASE}/ims/activity`,

    // Stock adjustments — maker-checker stock corrections (ims/stock-adjustment spec §4).
    stockAdjustments: `${BASE}/ims/stock-adjustments`,
    stockAdjustment: (id: string) => `${BASE}/ims/stock-adjustments/${id}`,
    stockAdjustmentRemovableUnits: `${BASE}/ims/stock-adjustments/removable-units`,
    stockAdjustmentSubmit: (id: string) => `${BASE}/ims/stock-adjustments/${id}/submit`,
    stockAdjustmentCancel: (id: string) => `${BASE}/ims/stock-adjustments/${id}/cancel`,
    stockAdjustmentReturnToDraft: (id: string) =>
      `${BASE}/ims/stock-adjustments/${id}/return-to-draft`,
    stockAdjustmentApprove: (id: string) => `${BASE}/ims/stock-adjustments/${id}/approve`,
    stockAdjustmentReject: (id: string) => `${BASE}/ims/stock-adjustments/${id}/reject`,
    stockAdjustmentPreviewLine: `${BASE}/ims/stock-adjustments/preview-line`,
    stockAdjustmentImportTemplate: `${BASE}/ims/stock-adjustments/import-template.xlsx`,
    stockAdjustmentImportPreview: `${BASE}/ims/stock-adjustments/import/preview`,

    // Background exports (spec §5).
    exports: `${BASE}/ims/exports`,
    exportRerun: (id: string) => `${BASE}/ims/exports/${id}/rerun`,
    exportDownloadUrl: (id: string) => `${BASE}/ims/exports/${id}/download-url`,
  },
  audit: {
    trail: `${BASE}/audit-trail`,
  },
  nextNumber: `${BASE}/next-number`,
  verticals: {
    // Brand master ("Business Vertical" in the quote UI). Paginated list.
    brands: `${BASE}/verticals/brands`,
    brand: (id: string) => `${BASE}/verticals/brands/${id}`,
    // Sales-facing pre-fill: GET ?brand_code=&document_type=sales_quote →
    // the default T&C clause rows for that brand. Re-called by the quote
    // builder's "Reset to <brand> default" action.
    hydrate: `${BASE}/verticals/hydrate`,
  },
  crm: {
    leads: `${BASE}/crm/leads`,
    leadStats: `${BASE}/crm/leads/stats`,
    lead: (id: string) => `${BASE}/crm/leads/${id}`,
    leadEntityStats: (id: string) => `${BASE}/crm/leads/${id}/stats`,
    leadReject: (id: string) => `${BASE}/crm/leads/${id}/reject`,
    leadLostImpact: (id: string) => `${BASE}/crm/leads/${id}/lost-impact`,
    deals: `${BASE}/crm/deals`,
    dealStats: `${BASE}/crm/deals/stats`,
    deal: (id: string) => `${BASE}/crm/deals/${id}`,
    dealEntityStats: (id: string) => `${BASE}/crm/deals/${id}/stats`,
    dealLostImpact: (id: string) => `${BASE}/crm/deals/${id}/lost-impact`,
    activityLog: `${BASE}/crm/activity-log`,

    // User Sales Targets — FY-scoped revenue targets with hierarchical write
    // + approval routing. Backend: app/modules/crm/api/v1/user_sales_target_endpoints.py.
    // Approval routing is permission-driven (not role-named): a target whose
    // SUBJECT holds `crm:user_target_requires_approval` lands in PendingApproval;
    // others auto-approve. Admin / superadmin bypass approval entirely.
    userTargets: `${BASE}/crm/user-targets/`,
    userTarget: (id: string) => `${BASE}/crm/user-targets/${id}`,
    userTargetSubmit: (id: string) => `${BASE}/crm/user-targets/${id}/submit`,
    userTargetApprove: (id: string) => `${BASE}/crm/user-targets/${id}/approve`,
    userTargetReject: (id: string) => `${BASE}/crm/user-targets/${id}/reject`,
    userTargetRevise: (id: string) => `${BASE}/crm/user-targets/${id}/revise`,
    // Bifurcation lines — per-(category, OEM, condition) breakdown.
    // GET  paginated list for the Bifurcation dialog.
    // PUT  replace-all: send the full in-memory line set; server soft-deletes
    //      the previous set and inserts the new one atomically.
    userTargetLines: (id: string) => `${BASE}/crm/user-targets/${id}/lines`,

    // Category approvers (approval.md T3). Mounted under /crm because the
    // approver concept is scoped to CRM/procurement flows (quote / SO /
    // PR / DR). The category entity itself lives in IMS, but FE pages
    // in IMS consume these endpoints via the CRM module barrel.
    categoryApprovers: (categoryId: string) =>
      `${BASE}/crm/categories/${categoryId}/approvers`,
    eligibleApprovers: `${BASE}/crm/users/eligible-approvers`,

    // Quote approval endpoints (approval.md T6/T8).
    quoteItemApprove: (quoteId: string, itemId: string) =>
      `${BASE}/crm/quotes/${quoteId}/items/${itemId}/approve`,
    quoteItemReject: (quoteId: string, itemId: string) =>
      `${BASE}/crm/quotes/${quoteId}/items/${itemId}/reject`,
    quoteApprovalsPending: `${BASE}/crm/quotes/approvals/pending`,
    dashboardSalesTeam: `${BASE}/crm/dashboard/hierarchy_wise_report`,
    dashboardRevenue: `${BASE}/crm/dashboard/revenue`,
    dashboardRevenueBySource: `${BASE}/crm/dashboard/revenue/by-source`,
    // Per-IMS-category Average Order Value. Mounted under /dashboard/insights
    // — NOT under /dashboard/revenue like by-source, despite sharing its
    // filter set (verified live: /revenue/avg-order-value/by-category 404s).
    dashboardAvgOrderValueByCategory: `${BASE}/crm/dashboard/insights/avg-order-value/by-category`,
    // The dashboard's OWN user picker. Returns exactly the users the caller
    // may pass as `user_ids` to any dashboard widget, resolved by the same
    // scope rules — so the picker can never offer an id the widgets would
    // reject with DASHBOARD_SCOPE_DENIED. Paginates by offset/limit, NOT
    // page/page_size like the rest of the dashboard endpoints.
    dashboardAllowedUsers: `${BASE}/crm/dashboard/allowed-users`,
    dashboardSummary: `${BASE}/crm/dashboard/summary`,
    dashboardRecords: `${BASE}/crm/dashboard/records`,
    dashboardTopOrders: `${BASE}/crm/dashboard/revenue/top-orders`,
    // Mounted directly under /dashboard — NOT under /dashboard/revenue like
    // by-source and top-orders.
    dashboardSalesFunnel: `${BASE}/crm/dashboard/sales-funnel`,
    // Current period vs the previous FULL period, as one scalar tile. Also
    // mounted directly under /dashboard, alongside sales-funnel.
    dashboardGrowth: `${BASE}/crm/dashboard/growth`,
    // Period-over-period account movement — two ranked lists (growing +
    // declining) in widget mode, paginated single-bucket in drill-down.
    // Shares the Growth tile's window math (`resolve_growth_windows`).
    dashboardAccountMovement: `${BASE}/crm/dashboard/account-movement`,
    // Top-N newly-acquired accounts whose first-ever SO landed in the
    // current period window. Shares the Growth / Account Movement window
    // pair; filters apply identically to both windows for the delta count.
    dashboardNewAccounts: `${BASE}/crm/dashboard/new-accounts`,
    // The New Accounts insight page's per-bucket series (accounts won per
    // bucket + new-vs-repeat revenue). Same `insights/` segment and the exact
    // query contract of period-wise-breakdown, so one params object serves it.
    dashboardNewAccountsByPeriod: `${BASE}/crm/dashboard/insights/new-accounts-by-period`,
    // Previously-buying accounts (``last_order_at IS NOT NULL``) whose most
    // recent approved SO is older than the ``period``-mapped rolling day
    // threshold (monthly=30d, quarterly=90d, yearly=365d, weekly=7d).
    // Anchored to today — "last May / 2 mo ago"-style labels.
    dashboardInactiveAccounts: `${BASE}/crm/dashboard/inactive-accounts`,
    // The Inactive Accounts insight page's per-bucket series (active vs
    // inactive buyers). Exact query contract of period-wise-breakdown.
    dashboardInactiveAccountsByPeriod: `${BASE}/crm/dashboard/insights/inactive-accounts-by-period`,
    // The 4-tile KPI strip on each Insights page. Also mounted directly under
    // /dashboard, under an `insights/` segment of its own.
    dashboardInsightSummaryTiles: `${BASE}/crm/dashboard/insights/summary-tiles`,
    // Row-per-bucket revenue table, same `insights/` segment. The bucket UNIT
    // follows `period` server-side (week / month / quarter / year), so this one
    // endpoint backs the breakdown table on every period the toolbar offers.
    dashboardPeriodBreakdown: `${BASE}/crm/dashboard/insights/period-wise-breakdown`,
    // Cross-tab of the SAME slice: one row per bucket, one column per
    // condition. Shares the `insights/` segment AND the exact query contract of
    // period-wise-breakdown above, which is why both read one params object.
    dashboardConditionMixByPeriod: `${BASE}/crm/dashboard/insights/condition-mix-by-period`,
    dashboardCategoryPeriodComparison: `${BASE}/crm/dashboard/insights/category-period-comparison`,
    // The same cross-tab over the ACCOUNT-TYPE dimension (Channel Partner /
    // End Customer / Cloud · Data Center). Same `insights/` segment, same query
    // contract as the two above.
    dashboardVerticalMixByPeriod: `${BASE}/crm/dashboard/insights/vertical-mix-by-period`,
    accounts: `${BASE}/crm/accounts`,
    accountOwnerOptions: `${BASE}/crm/accounts/owner-options`,
    accountParentChild: `${BASE}/crm/accounts/parent-child-relationships`,
    accountReparentWithChildren: (id: string) =>
      `${BASE}/crm/accounts/${id}/reparent-with-children`,
    accountsPendingApprovals: `${BASE}/crm/accounts/pending-approvals`,
    account: (id: string) => `${BASE}/crm/accounts/${id}`,
    accountStats: (id: string) => `${BASE}/crm/accounts/${id}/stats`,
    accountKpis: (id: string) => `${BASE}/crm/accounts/${id}/kpis`,
    // One endpoint feeds both the Account 360° widget and the CRM dashboard
    // widget. Pass `account_id` as a query param to scope to one account;
    // omit for the dashboard's caller-scoped view.
    revenueByCategoryOem: `${BASE}/crm/revenue/by-category-oem`,
    accountApprove: (id: string) => `${BASE}/crm/accounts/${id}/approve`,
    accountReject: (id: string) => `${BASE}/crm/accounts/${id}/reject`,
    // Account access requests — a non-owner asks to view an account; an
    // approver (crm:account_approve) works the pending queue.
    accountAccessRequests: (id: string) =>
      `${BASE}/crm/accounts/${id}/access-requests`,
    accountAccessRequestsList: `${BASE}/crm/accounts/access-requests`,
    accountAccessRequestApprove: (rid: string) =>
      `${BASE}/crm/accounts/access-requests/${rid}/approve`,
    accountAccessRequestReject: (rid: string) =>
      `${BASE}/crm/accounts/access-requests/${rid}/reject`,
    accountOwners: (id: string) => `${BASE}/crm/accounts/${id}/owners`,
    accountOwner: (id: string, userId: string) =>
      `${BASE}/crm/accounts/${id}/owners/${userId}`,
    accountOwnerPrimary: (id: string, userId: string) =>
      `${BASE}/crm/accounts/${id}/owners/${userId}/primary`,
    accountAddresses: (id: string) => `${BASE}/crm/accounts/${id}/addresses`,
    accountAddress: (id: string, addressId: string) =>
      `${BASE}/crm/accounts/${id}/addresses/${addressId}`,
    accountAddressDefault: (id: string, addressId: string) =>
      `${BASE}/crm/accounts/${id}/addresses/${addressId}/default`,
    contacts: `${BASE}/crm/contacts`,
    contact: (id: string) => `${BASE}/crm/contacts/${id}`,
    contactAccounts: (id: string) => `${BASE}/crm/contacts/${id}/accounts`,
    contactAccount: (id: string, accountId: string) =>
      `${BASE}/crm/contacts/${id}/accounts/${accountId}`,
    contactAccountPrimary: (id: string, accountId: string) =>
      `${BASE}/crm/contacts/${id}/accounts/${accountId}/primary`,
    quotes: `${BASE}/crm/quotes`,
    quoteCalculate: `${BASE}/crm/quotes/calculate`,
    quote: (id: string) => `${BASE}/crm/quotes/${id}`,
    quoteItems: (id: string) => `${BASE}/crm/quotes/${id}/items`,
    quoteItem: (id: string, itemId: string) =>
      `${BASE}/crm/quotes/${id}/items/${itemId}`,
    // QUOTE-4 BOM: add a single component under an existing headline.
    quoteItemChildren: (id: string, parentItemId: string) =>
      `${BASE}/crm/quotes/${id}/items/${parentItemId}/children`,
    quoteVersion: (id: string) => `${BASE}/crm/quotes/${id}/version`,
    quoteVersions: (id: string) => `${BASE}/crm/quotes/${id}/versions`,
    quoteStatus: (id: string) => `${BASE}/crm/quotes/${id}/status`,
    // Polymorphic notes — entity_type is one of "lead" | "deal" | "account" | "contact".
    entityNotes: (entityType: string, entityId: string) =>
      `${BASE}/crm/${entityType}/${entityId}/notes`,
    note: (id: string) => `${BASE}/crm/notes/${id}`,
    // Polymorphic comments — entity_type is one of "lead" | "deal" | "account" | "contact"
    // (the backend's create/list routes don't validate, but the docstring pins the set).
    // Comments are immutable — no PATCH endpoint, no edit operation.
    entityComments: (entityType: string, entityId: string) =>
      `${BASE}/crm/${entityType}/${entityId}/comments`,
    comment: (id: string) => `${BASE}/crm/comments/${id}`,
    // Tasks — entity_type is "lead" | "deal" only (backend rejects others).
    // Note: POST /tasks (create) carries entity_type+entity_id in the BODY, not URL.
    tasks: `${BASE}/crm/tasks`,
    tasksSummary: `${BASE}/crm/tasks/summary`,
    task: (id: string) => `${BASE}/crm/tasks/${id}`,
    taskComplete: (id: string) => `${BASE}/crm/tasks/${id}/complete`,
    taskCancel: (id: string) => `${BASE}/crm/tasks/${id}/cancel`,
    entityTasks: (entityType: string, entityId: string) =>
      `${BASE}/crm/${entityType}/${entityId}/tasks`,
    // Polymorphic activities — entity_type is one of "lead" | "deal" | "account" | "contact".
    // Cursor-paginated via `before_id` + `limit` (1..200, default 50). Returns
    // {items, has_more, next_cursor}. Backend currently allow-lists lead/deal
    // only — account/contact return 400 until the allow-list opens.
    activities: (entityType: string, entityId: string) =>
      `${BASE}/crm/${entityType}/${entityId}/activities`,
    salesOrders: `${BASE}/crm/sales-orders`,
    salesOrderCalculate: `${BASE}/crm/sales-orders/calculate`,
    salesOrder: (id: string) => `${BASE}/crm/sales-orders/${id}`,
    salesOrderFulfillment: (id: string) =>
      `${BASE}/crm/sales-orders/${id}/fulfillment`,
    salesOrderStatus: (id: string) => `${BASE}/crm/sales-orders/${id}/status`,
    salesOrderRevise: (id: string) => `${BASE}/crm/sales-orders/${id}/revise`,
    salesOrderLineApprove: (id: string, lineId: string) =>
      `${BASE}/crm/sales-orders/${id}/lines/${lineId}/approve`,
    salesOrderLineReject: (id: string, lineId: string) =>
      `${BASE}/crm/sales-orders/${id}/lines/${lineId}/reject`,
    salesOrderLineReassign: (id: string, lineId: string) =>
      `${BASE}/crm/sales-orders/${id}/lines/${lineId}/reassign`,
    salesOrdersMyPending: `${BASE}/crm/sales-orders/me/pending`,
    invoices: `${BASE}/crm/invoices`,
    invoice: (id: string) => `${BASE}/crm/invoices/${id}`,
    purchaseRequests: `${BASE}/crm/purchase-requests`,
    purchaseRequest: (id: string) => `${BASE}/crm/purchase-requests/${id}`,
    materialInquiries: `${BASE}/crm/material-inquiries`,
    materialInquiry: (id: string) => `${BASE}/crm/material-inquiries/${id}`,
    materialInquirySubmit: (id: string) =>
      `${BASE}/crm/material-inquiries/${id}/submit`,
    materialInquiryClose: (id: string) =>
      `${BASE}/crm/material-inquiries/${id}/close`,
    materialInquiryItems: (id: string) =>
      `${BASE}/crm/material-inquiries/${id}/items`,
    materialInquiryItem: (id: string, itemId: string) =>
      `${BASE}/crm/material-inquiries/${id}/items/${itemId}`,
    replacementRequests: `${BASE}/crm/replacement-requests`,
    replacementRequest: (id: string) =>
      `${BASE}/crm/replacement-requests/${id}`,
    replacementRequestCancel: (id: string) =>
      `${BASE}/crm/replacement-requests/${id}/cancel`,
    // Decisions are per line — there is no whole-RR approve/reject.
    replacementRequestItemApprove: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/approve`,
    // Batch approve: one transaction, one header rollup, one notification.
    // Prefer this over N parallel single-item calls from a group action.
    replacementRequestItemsApprove: (id: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/approve`,
    replacementRequestItemReject: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/reject`,
    replacementRequestItemReassign: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/reassign`,
    replacementRequestItemApproverCandidates: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/approver-candidates`,
    replacementRequestItemWaiveReturn: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/waive-return`,
    replacementRequestItemNotNeeded: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/not-needed`,
    replacementRequestItemOutcome: (id: string, itemId: string) =>
      `${BASE}/crm/replacement-requests/${id}/items/${itemId}/outcome`,
    replacementRequestsPendingPM: `${BASE}/crm/replacement-requests/pending-pm-approval`,
    replacementRequestEligibleSources: `${BASE}/crm/replacement-requests/eligible-sources`,
    replacementRequestSourceOrders: `${BASE}/crm/replacement-requests/source-orders`,
    replacementRequestEligibleItems: `${BASE}/crm/replacement-requests/eligible-items`,
    replacementRequestEligibleUnits: `${BASE}/crm/replacement-requests/eligible-units`,
    replacementRequestEligibleUnitComponents: `${BASE}/crm/replacement-requests/eligible-unit-components`,
    replacementRequestSoRollup: `${BASE}/crm/replacement-requests/so-rollup`,
    // Sales Return Requests (SRET) — the customer-return authorization a
    // `sale_return` GRN is received against.
    salesReturnRequests: `${BASE}/crm/sales-return-requests`,
    salesReturnRequest: (id: string) =>
      `${BASE}/crm/sales-return-requests/${id}`,
    salesReturnRequestCancel: (id: string) =>
      `${BASE}/crm/sales-return-requests/${id}/cancel`,
    // Batch decide — one transaction, one header rollup, one audit row.
    // Never N single-item calls.
    salesReturnRequestItemsApprove: (id: string) =>
      `${BASE}/crm/sales-return-requests/${id}/items/approve`,
    salesReturnRequestItemReassign: (id: string, itemId: string) =>
      `${BASE}/crm/sales-return-requests/${id}/items/${itemId}/reassign-pm`,
    salesReturnRequestsPendingPM: `${BASE}/crm/sales-return-requests/pending-pm-approval`,
    salesReturnEligibleSources: `${BASE}/crm/sales-return-requests/eligible-sources`,
    salesReturnSourceOrders: `${BASE}/crm/sales-return-requests/source-orders`,
    salesReturnEligibleUnits: `${BASE}/crm/sales-return-requests/eligible-units`,
    // Rental Return Requests (RRET) — the rental sibling. Only a
    // `rental_sales` order may be returned here, and receipt settles the
    // rental DEVICE (status -> Returned, billing stops) as well as the
    // request's lines.
    rentalReturnRequests: `${BASE}/crm/rental-return-requests`,
    rentalReturnRequest: (id: string) =>
      `${BASE}/crm/rental-return-requests/${id}`,
    rentalReturnRequestCancel: (id: string) =>
      `${BASE}/crm/rental-return-requests/${id}/cancel`,
    rentalReturnRequestItemsApprove: (id: string) =>
      `${BASE}/crm/rental-return-requests/${id}/items/approve`,
    rentalReturnRequestItemReassign: (id: string, itemId: string) =>
      `${BASE}/crm/rental-return-requests/${id}/items/${itemId}/reassign-pm`,
    rentalReturnRequestsPendingPM: `${BASE}/crm/rental-return-requests/pending-pm-approval`,
    rentalReturnEligibleSources: `${BASE}/crm/rental-return-requests/eligible-sources`,
    // The form's customer picker: a rental order and a unit still free to return.
    rentalReturnEligibleAccounts: `${BASE}/crm/rental-return-requests/eligible-accounts`,
    rentalReturnEligibleUnits: `${BASE}/crm/rental-return-requests/eligible-units`,
    // Return by count: the customer names a model and a quantity; the scan
    // at inward decides the unit.
    rentalReturnEligibleVariants: `${BASE}/crm/rental-return-requests/eligible-variants`,
    rentalReturnRequestCloseShort: (id: string) =>
      `${BASE}/crm/rental-return-requests/${id}/close-short`,
    rentalReturnRequestItemCloseShort: (id: string, itemId: string) =>
      `${BASE}/crm/rental-return-requests/${id}/items/${itemId}/close-short`,
    // Customer deficiencies — the sales recovery queue (§9.4).
    deficiencies: `${BASE}/crm/deficiencies`,
    deficiency: (id: string) => `${BASE}/crm/deficiencies/${id}`,
    deficiencyChargeOrder: `${BASE}/crm/deficiencies/charge-order`,
    deficiencyWaiver: (id: string) => `${BASE}/crm/deficiencies/${id}/waiver`,
    deficiencyWaiverApprove: (id: string) =>
      `${BASE}/crm/deficiencies/${id}/waiver/approve`,
    deficiencyWaiverReject: (id: string) =>
      `${BASE}/crm/deficiencies/${id}/waiver/reject`,
    deficiencyRecovered: (id: string) => `${BASE}/crm/deficiencies/${id}/recovered`,
    demoRequests: `${BASE}/crm/demo-requests`,
    demoRequestsStats: `${BASE}/crm/demo-requests/stats`,
    demoRequest: (id: string) => `${BASE}/crm/demo-requests/${id}`,
    demoRequestFulfillment: (id: string) =>
      `${BASE}/crm/demo-requests/${id}/fulfillment`,
    demoRequestsPendingPM: `${BASE}/crm/demo-requests/pending-pm-approval`,
    demoRequestSubmit: (id: string) => `${BASE}/crm/demo-requests/${id}/submit`,
    demoRequestItems: (id: string) => `${BASE}/crm/demo-requests/${id}/items`,
    demoRequestItem: (id: string, itemId: string) =>
      `${BASE}/crm/demo-requests/${id}/items/${itemId}`,
    demoRequestItemApprove: (id: string, itemId: string) =>
      `${BASE}/crm/demo-requests/${id}/items/${itemId}/approve`,
    demoRequestItemReject: (id: string, itemId: string) =>
      `${BASE}/crm/demo-requests/${id}/items/${itemId}/reject`,
    demoRequestConvertToOrder: (id: string) =>
      `${BASE}/crm/demo-requests/${id}/convert-to-order`,
    demoRequestDispatchedUnits: (id: string) =>
      `${BASE}/crm/demo-requests/${id}/dispatched-units`,
    demoRequestSalesOrders: (id: string) =>
      `${BASE}/crm/demo-requests/${id}/sales-orders`,
    meetings: `${BASE}/crm/meetings`,
    meetingsSummary: `${BASE}/crm/meetings/summary`,
    meeting: (id: string) => `${BASE}/crm/meetings/${id}`,
    meetingComplete: (id: string) => `${BASE}/crm/meetings/${id}/complete`,
    meetingCancel: (id: string) => `${BASE}/crm/meetings/${id}/cancel`,
  },
  wms: {
    // Warehouses (B2.2)
    warehouses: `${BASE}/wms/warehouses`,

    // Stock relocation + warehouse transfer (stock-transfer spec).
    // Relocation is bulk and intra-warehouse: the DESTINATION LOCATION is the
    // path param, because RBAC resolves the acting warehouse from it (a bulk
    // move has no single device to resolve from).
    relocateStock: (locationId: string) =>
      `${BASE}/wms/locations/${locationId}/relocate`,
    stageChecklistReport: `${BASE}/wms/reports/stage-checklist`,
    stageChecklistReportExport: `${BASE}/wms/reports/stage-checklist/export`,
    warehouseTransfers: `${BASE}/wms/warehouse-transfers`,
    warehouseTransfer: (id: string) => `${BASE}/wms/warehouse-transfers/${id}`,
    warehouseTransferCandidates: (id: string) =>
      `${BASE}/wms/warehouse-transfers/${id}/candidates`,
    warehouseTransferUnits: (id: string) =>
      `${BASE}/wms/warehouse-transfers/${id}/units`,
    warehouseTransferSend: (id: string) =>
      `${BASE}/wms/warehouse-transfers/${id}/send`,
    warehouseTransferItem: (itemId: string) =>
      `${BASE}/wms/warehouse-transfer-items/${itemId}`,
    warehouseTransferItemPlace: (itemId: string) =>
      `${BASE}/wms/warehouse-transfer-items/${itemId}/place`,
    warehouseTransferItemFlag: (itemId: string) =>
      `${BASE}/wms/warehouse-transfer-items/${itemId}/flag-inspection`,
    warehouseTransferItemMarkLost: (itemId: string) =>
      `${BASE}/wms/warehouse-transfer-items/${itemId}/mark-lost`,
    warehouseTransferItemReturnToSource: (itemId: string) =>
      `${BASE}/wms/warehouse-transfer-items/${itemId}/return-to-source`,
    warehouse: (id: string) => `${BASE}/wms/warehouses/${id}`,
    warehouseActivate: (id: string) => `${BASE}/wms/warehouses/${id}/activate`,
    warehouseDeactivate: (id: string) =>
      `${BASE}/wms/warehouses/${id}/deactivate`,
    // Warehouse locations (B2.3)
    warehouseLocations: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/locations`,
    warehouseLocationsTree: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/locations/tree`,
    warehouseRacks: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/locations/racks`,
    warehouseStorageSummary: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/locations/summary`,
    warehouseRackChildren: (rackId: string) =>
      `${BASE}/wms/warehouse-locations/${rackId}/children`,
    // Searchable + paged rack / bin options for the assignment pickers.
    warehouseRackOptions: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/rack-options`,
    warehouseBinOptions: (rackId: string) =>
      `${BASE}/wms/warehouse-locations/${rackId}/bin-options`,
    warehouseAssignableLocations: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/assignable-locations`,
    warehouseLocation: (id: string) => `${BASE}/wms/warehouse-locations/${id}`,
    warehouseLocationContents: (id: string) =>
      `${BASE}/wms/warehouse-locations/${id}/contents`,

    // Warehouse team assignments (store_manager / mis / engineer)
    warehouseAssignments: (warehouseId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/assignments`,
    // Distinct engineers across warehouses (or all) — the warehouse-agnostic picker.
    warehouseEngineers: () => `${BASE}/wms/warehouse-engineers`,
    warehouseAssignment: (warehouseId: string, userId: string) =>
      `${BASE}/wms/warehouses/${warehouseId}/assignments/${userId}`,

    // Inward / GRN (atomic create → stage → finalize)
    grnBatches: `${BASE}/wms/grn-batches`,
    grnBatch: (id: string) => `${BASE}/wms/grn-batches/${id}`,
    grnBatchFinalizePreview: (id: string) =>
      `${BASE}/wms/grn-batches/${id}/finalize-preview`,
    grnBatchFinalize: (id: string) => `${BASE}/wms/grn-batches/${id}/finalize`,
    grnBatchCancel: (id: string) => `${BASE}/wms/grn-batches/${id}/cancel`,
    // Rental return by count (§5): unannounced boxes, and a read-only
    // preview of what each scanned box is before finalize.
    grnBatchUnannouncedRentalReturn: `${BASE}/wms/grn-batches/unannounced-rental-return`,
    grnBatchRentalScanPreview: (id: string) =>
      `${BASE}/wms/grn-batches/${id}/rental-scan-preview`,
    // Held rental-return boxes (§8).
    inwardExceptions: `${BASE}/wms/inward-exceptions`,
    inwardException: (id: string) => `${BASE}/wms/inward-exceptions/${id}`,
    inwardExceptionLink: (id: string) => `${BASE}/wms/inward-exceptions/${id}/link`,
    inwardExceptionVoid: (id: string) => `${BASE}/wms/inward-exceptions/${id}/void`,
    inwardExceptionReturn: (id: string) =>
      `${BASE}/wms/inward-exceptions/${id}/return-to-customer`,
    inwardExceptionDelivered: (id: string) =>
      `${BASE}/wms/inward-exceptions/${id}/delivered`,
    inwardExceptionStock: (id: string) =>
      `${BASE}/wms/inward-exceptions/${id}/bring-into-stock`,
    // Rental kit: ticked at dispatch, checked at return (§9.2-§9.3).
    dispatchKit: (driId: string) => `${BASE}/wms/dispatch-request-items/${driId}/kit`,
    returnKit: (grnLineItemId: string) =>
      `${BASE}/wms/grn-line-items/${grnLineItemId}/return-kit`,
    inwardSources: `${BASE}/wms/inward/sources`,
    outwardSources: `${BASE}/wms/outward/sources`,
    availableStock: `${BASE}/wms/available-stock`,
    availableStockCounts: `${BASE}/wms/available-stock/counts`,

    // Material Issue (outward pipeline slice A)
    materialIssues: `${BASE}/wms/material-issues`,
    materialIssue: (id: string) => `${BASE}/wms/material-issues/${id}`,
    materialIssueIssuedLines: `${BASE}/wms/material-issues/issued-lines`,
    materialIssueDemand: `${BASE}/wms/material-issues/demand`,
    materialIssueLineItems: (id: string) =>
      `${BASE}/wms/material-issues/${id}/line-items`,
    materialIssueLine: (id: string, lineId: string) =>
      `${BASE}/wms/material-issues/${id}/line-items/${lineId}`,
    materialIssueLinesBulkDelete: (id: string) =>
      `${BASE}/wms/material-issues/${id}/line-items/bulk-delete`,
    materialIssueLines: `${BASE}/wms/material-issue-lines`,
    materialIssueIssue: (id: string) =>
      `${BASE}/wms/material-issues/${id}/issue`,
    materialIssueCancel: (id: string) =>
      `${BASE}/wms/material-issues/${id}/cancel`,
    materialIssueReturns: (id: string) =>
      `${BASE}/wms/material-issues/${id}/returns`,
    materialIssueTopUp: (id: string) =>
      `${BASE}/wms/material-issues/${id}/top-up`,
    materialIssuePullOut: (id: string) =>
      `${BASE}/wms/material-issues/${id}/pull-out`,
    materialIssuePullOuts: (id: string) =>
      `${BASE}/wms/material-issues/${id}/pull-outs`,
    materialIssueMachineComponents: (id: string, machineLineId: string) =>
      `${BASE}/wms/material-issues/${id}/machines/${machineLineId}/components`,
    materialIssueLineOutwardQcStart: (id: string, lineId: string) =>
      `${BASE}/wms/material-issues/${id}/line-items/${lineId}/outward-qc/start`,
    materialIssueLineOutwardQcComplete: (id: string, lineId: string) =>
      `${BASE}/wms/material-issues/${id}/line-items/${lineId}/outward-qc/complete`,

    // Dispatch requests (SO dispatch-from-Material-Issue)
    dispatchReadyUnits: `${BASE}/wms/dispatch-ready-units`,
    dispatchRequests: `${BASE}/wms/dispatch-requests`,
    dispatchRequest: (id: string) => `${BASE}/wms/dispatch-requests/${id}`,
    dispatchRequestLineItems: (id: string) =>
      `${BASE}/wms/dispatch-requests/${id}/line-items`,
    dispatchRequestPickFromMi: (id: string) =>
      `${BASE}/wms/dispatch-requests/${id}/line-items/from-material-issue`,
    dispatchRequestPickFromPurchaseReturn: (id: string) =>
      `${BASE}/wms/dispatch-requests/${id}/line-items/from-purchase-return`,
    dispatchRequestFinalise: (id: string) =>
      `${BASE}/wms/dispatch-requests/${id}/dispatch`,
    dispatchRequestCancel: (id: string) =>
      `${BASE}/wms/dispatch-requests/${id}/cancel`,

    devices: `${BASE}/wms/devices`,
    deviceStats: `${BASE}/wms/devices/stats`,
    wmsStats: (scope: string) => `${BASE}/wms/stats/${scope}`,
    device: (id: string) => `${BASE}/wms/devices/${id}`,
    deviceWorkflowHistory: (id: string) =>
      `${BASE}/wms/devices/${id}/workflow-history`,
    deviceTimeLog: (id: string) => `${BASE}/wms/devices/${id}/time-log`,
    deviceChecklistRuns: (id: string) =>
      `${BASE}/wms/devices/${id}/checklist-runs`,
    deviceAssignableUsers: (id: string) =>
      `${BASE}/wms/devices/${id}/assignable-users`,
    deviceAssignment: (id: string) => `${BASE}/wms/devices/${id}/assignment`,
    deviceRackAssign: (id: string) => `${BASE}/wms/devices/${id}/rack-assign`,
    // Device identity corrections (spec modules/wms/device-identity).
    deviceManufacturerSerial: (id: string) =>
      `${BASE}/wms/devices/${id}/manufacturer-serial`,
    deviceReidentify: (id: string) => `${BASE}/wms/devices/${id}/reidentify`,
    deviceRelinkPoItem: (id: string) =>
      `${BASE}/wms/devices/${id}/relink-po-item`,
    deviceInspection: (id: string) => `${BASE}/wms/devices/${id}/inspection`,
    deviceInspectionStart: (id: string) =>
      `${BASE}/wms/devices/${id}/inspection/start`,
    deviceInspectionComplete: (id: string) =>
      `${BASE}/wms/devices/${id}/inspection/complete`,
    deviceInspectionCancel: (id: string) =>
      `${BASE}/wms/devices/${id}/inspection/cancel`,
    // Repair stage
    deviceRepair: (id: string) => `${BASE}/wms/devices/${id}/repair`,
    deviceRepairStart: (id: string) => `${BASE}/wms/devices/${id}/repair/start`,
    deviceRepairDone: (id: string) => `${BASE}/wms/devices/${id}/repair/done`,
    deviceRepairCancel: (id: string) =>
      `${BASE}/wms/devices/${id}/repair/cancel`,
    // QC stage
    // ── Vendor services (paint / display repair / battery boost / …) ──
    // ONE set of endpoints for EVERY section. A new section is a row in
    // service_sections, so nothing here grows when one is added.
    serviceSections: `${BASE}/wms/service-sections`,
    // Paginated/searchable/sortable admin TABLE. The plain `serviceSections`
    // array above stays the sidebar-nav + picker source (needs every section).
    serviceSectionsSearch: `${BASE}/wms/service-sections/search`,
    serviceSection: (id: string) => `${BASE}/wms/service-sections/${id}`,
    serviceVendors: `${BASE}/wms/service-vendors`,
    // Paginated admin TABLE; the array `serviceVendors` above stays the picker
    // source (a section picker needs every vendor, never a page).
    serviceVendorsSearch: `${BASE}/wms/service-vendors/search`,
    serviceVendor: (id: string) => `${BASE}/wms/service-vendors/${id}`,
    serviceJobs: `${BASE}/wms/service-jobs`,
    serviceJobStats: `${BASE}/wms/service-jobs/stats`,
    deviceServiceJobs: (id: string) => `${BASE}/wms/devices/${id}/service-jobs`,
    deviceServiceJobSend: (id: string, jobId: string) =>
      `${BASE}/wms/devices/${id}/service-jobs/${jobId}/send-to-vendor`,
    deviceServiceJobReceive: (id: string, jobId: string) =>
      `${BASE}/wms/devices/${id}/service-jobs/${jobId}/receive`,
    deviceServiceJobResend: (id: string, jobId: string) =>
      `${BASE}/wms/devices/${id}/service-jobs/${jobId}/send-again`,
    deviceServiceJobCancel: (id: string, jobId: string) =>
      `${BASE}/wms/devices/${id}/service-jobs/${jobId}/cancel`,
    deviceQc: (id: string) => `${BASE}/wms/devices/${id}/qc`,
    deviceQcStart: (id: string) => `${BASE}/wms/devices/${id}/qc/start`,
    deviceQcComplete: (id: string) => `${BASE}/wms/devices/${id}/qc/complete`,
    deviceQcCancel: (id: string) => `${BASE}/wms/devices/${id}/qc/cancel`,
    // Scrap — condemn (engineer), then place / reverse / dispose (manager).
    // See comprint-erp-docs/modules/wms/device-scrap/spec.md.
    // Composition of any stock_item, outside the GRN-line / repair-op
    // contexts: action-discriminated add / pull / disassemble.
    stockItemComponentsMutate: (id: string) =>
      `${BASE}/wms/stock-items/${id}/components`,
    // Undo a mistake on the device page: put a pulled part back inside, or
    // remove a part added by hand that was never there.
    stockItemComponentPutBack: (id: string, componentId: string) =>
      `${BASE}/wms/stock-items/${id}/components/${componentId}/put-back`,
    stockItemComponentUndoAdd: (id: string, componentId: string) =>
      `${BASE}/wms/stock-items/${id}/components/${componentId}/undo-add`,
    // A returned device's contents: check at inspection, record finds at any
    // working stage, identify a described part (store manager).
    deviceContents: (id: string) => `${BASE}/wms/devices/${id}/contents`,
    deviceContentsConfirmAll: (id: string) =>
      `${BASE}/wms/devices/${id}/contents/confirm-all`,
    deviceContentsConfirm: (id: string, componentId: string) =>
      `${BASE}/wms/devices/${id}/contents/${componentId}/confirm`,
    deviceContentsMarkMissing: (id: string, componentId: string) =>
      `${BASE}/wms/devices/${id}/contents/${componentId}/mark-missing`,
    deviceContentsFound: (id: string, componentId: string) =>
      `${BASE}/wms/devices/${id}/contents/${componentId}/found`,
    deviceContentsIdentify: (id: string, componentId: string) =>
      `${BASE}/wms/devices/${id}/contents/${componentId}/identify`,
    deviceScrap: (id: string) => `${BASE}/wms/devices/${id}/scrap`,
    deviceScrapPlace: (id: string) => `${BASE}/wms/devices/${id}/scrap/place`,
    deviceUnscrap: (id: string) => `${BASE}/wms/devices/${id}/unscrap`,
    scrapPendingPlacement: `${BASE}/wms/devices/scrap-pending-placement`,

    // Work assignments — inward workforce allocation.
    // (comprint-erp-docs/modules/wms/work-assignment/spec.md §7)
    workAssignments: `${BASE}/wms/work-assignments`,
    workAssignmentStages: `${BASE}/wms/work-assignments/stages`,
    workAssignment: (id: string) => `${BASE}/wms/work-assignments/${id}`,
    workAssignmentLines: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/lines`,
    workAssignmentEligibleSummary: `${BASE}/wms/work-assignments/eligible-summary`,
    workAssignmentEligibleDevices: `${BASE}/wms/work-assignments/eligible-devices`,
    workAssignmentEligibleEngineers: `${BASE}/wms/work-assignments/eligible-engineers`,
    workAssignmentClose: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/close`,
    workAssignmentCancel: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/cancel`,
    workAssignmentWithdraw: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/withdraw`,
    workAssignmentReassign: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/reassign`,
    // POST, not GET, although these return a PDF: printing MUTATES (it stamps
    // label_printed_at), and a GET that mutates is triggerable by any prefetch.
    workAssignmentLabels: (id: string) =>
      `${BASE}/wms/work-assignments/${id}/labels`,
    palletLabels: `${BASE}/wms/labels`,
    deviceLabel: (id: string) => `${BASE}/wms/devices/${id}/label`,
    deviceLabelSvg: (id: string) => `${BASE}/wms/devices/${id}/label.svg`,
    // PDF labels for an explicit list of stock_item_ids (≤ 500).
    deviceSetLabels: `${BASE}/wms/labels/devices`,
    // Spares
    deviceSpareRequests: (id: string) =>
      `${BASE}/wms/devices/${id}/spare-requests`,
    spareRequests: `${BASE}/wms/spare-requests`,
    spareRequestsStats: `${BASE}/wms/spare-requests/stats`,
    spareRequestFulfill: (reqId: string) =>
      `${BASE}/wms/spare-requests/${reqId}/fulfill`,
    spareRequestReturn: (reqId: string) =>
      `${BASE}/wms/spare-requests/${reqId}/return`,
    // A fulfilled spare recorded as a component inside its device.
    spareRequestFit: (reqId: string) =>
      `${BASE}/wms/spare-requests/${reqId}/fit`,
    // Named /fulfillments but carries picks, returns and fits.
    spareRequestFulfillments: (reqId: string) =>
      `${BASE}/wms/spare-requests/${reqId}/fulfillments`,
    spareRequestCancel: (reqId: string) =>
      `${BASE}/wms/spare-requests/${reqId}/cancel`,
    sparesInventory: `${BASE}/wms/spares/inventory`,
    myWarehouses: `${BASE}/wms/my-warehouses`,
  },
  procurement: {
    purchaseRequests: `${BASE}/procurement/purchase-requests`,
    purchaseRequest: (id: string) =>
      `${BASE}/procurement/purchase-requests/${id}`,
    purchaseOrders: `${BASE}/procurement/purchase-orders`,
    purchaseOrder: (id: string) => `${BASE}/procurement/purchase-orders/${id}`,
    purchaseOrderPdf: (id: string) => `${BASE}/procurement/purchase-orders/${id}/pdf`,
    purchaseOrderVersionPdf: (id: string, version: number) =>
      `${BASE}/procurement/purchase-orders/${id}/versions/${version}/pdf`,
    // PO lifecycle — submit / approve / reject / clone (Tier A draft approval).
    purchaseOrderSubmit: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/submit`,
    purchaseOrderApprove: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/approve`,
    purchaseOrderReject: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/reject`,
    purchaseOrderClone: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/clone`,
    purchaseOrderApprovals: `${BASE}/procurement/purchase-orders/approvals/me/pending`,
    purchaseOrderStats: `${BASE}/procurement/purchase-orders/stats`,
    // PO picker for the purchase-return form — gated on procurement:po_return_write
    // (not procurement:read), so warehouse roles that raise returns can list POs.
    purchaseOrdersReturnable: `${BASE}/procurement/purchase-orders/returnable`,
    // PO close / cancel (terminal actions).
    purchaseOrderClose: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/close`,
    purchaseOrderCancel: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/cancel`,
    // PO amend (issued) + per-PO version trail (Tier B).
    purchaseOrderAmend: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/amend`,
    purchaseOrderAmendIssued: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/amend-issued`,
    purchaseOrderVersions: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/versions`,
    purchaseOrderAmendmentEdit: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/amendment`,
    purchaseOrderAmendmentSubmit: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/amendment/submit`,
    purchaseOrderAmendmentCancel: (id: string) =>
      `${BASE}/procurement/purchase-orders/${id}/amendment`,
    vendors: `${BASE}/procurement/vendors`,
    vendor: (id: string) => `${BASE}/procurement/vendors/${id}`,
    vendorContacts: (id: string) =>
      `${BASE}/procurement/vendors/${id}/contacts`,
    // Procurement-side MI surface: full responses with vendor/cost/margin
    // (sales-side view is the slimmer `MIResponseSalesView` embedded under
    // each MI item on the CRM detail GET).
    inquiries: `${BASE}/procurement/inquiries`,
    inquiriesMyPending: `${BASE}/procurement/inquiries/me/pending`,
    inquiry: (miId: string) => `${BASE}/procurement/inquiries/${miId}`,
    inquiryItemResponses: (miId: string, itemId: string) =>
      `${BASE}/procurement/inquiries/${miId}/items/${itemId}/responses`,
    inquiryResponse: (miId: string, respId: string) =>
      `${BASE}/procurement/inquiries/${miId}/responses/${respId}`,
    inquiryResponseApprove: (miId: string, respId: string) =>
      `${BASE}/procurement/inquiries/${miId}/responses/${respId}/approve`,
    inquiryResponseReject: (miId: string, respId: string) =>
      `${BASE}/procurement/inquiries/${miId}/responses/${respId}/reject`,
    grn: `${BASE}/procurement/grn`,
    grnItem: (id: string) => `${BASE}/procurement/grn/${id}`,
    pmApprovals: `${BASE}/procurement/pm-approvals`,
    pmApproval: (type: string, id: string) =>
      `${BASE}/procurement/pm-approvals/${type}/${id}`,
    // Purchase returns (return-to-vendor) — raise / dispatch / per-item
    // disposition + settlement. The returnable-units + returns feeds hang off
    // the PO so the PO detail can list what can go back and what already has.
    purchaseReturns: `${BASE}/procurement/purchase-returns`,
    purchaseReturnStats: `${BASE}/procurement/purchase-returns/stats`,
    purchaseReturnFilterOptions: `${BASE}/procurement/purchase-returns/filter-options`,
    purchaseReturn: (id: string) =>
      `${BASE}/procurement/purchase-returns/${id}`,
    purchaseReturnDispatch: (id: string) =>
      `${BASE}/procurement/purchase-returns/${id}/dispatch`,
    purchaseReturnItemDisposition: (prId: string, itemId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/${itemId}/disposition`,
    purchaseReturnItemsDispositionBulk: (prId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/disposition`,
    purchaseReturnItemReject: (prId: string, itemId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/${itemId}/reject`,
    purchaseReturnItemsRejectBulk: (prId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/reject`,
    purchaseReturnItemCancel: (prId: string, itemId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/${itemId}/cancel`,
    purchaseReturnItemSettle: (prId: string, itemId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/${itemId}/settle`,
    purchaseReturnItemWaive: (prId: string, itemId: string) =>
      `${BASE}/procurement/purchase-returns/${prId}/items/${itemId}/waive`,
    returnableUnits: (poId: string) =>
      `${BASE}/procurement/purchase-orders/${poId}/returnable-units`,
    purchaseOrderReturns: (poId: string) =>
      `${BASE}/procurement/purchase-orders/${poId}/returns`,
  },
  invoices: {
    salesInvoices: `${BASE}/invoices/sales`,
    salesInvoice: (id: string) => `${BASE}/invoices/sales/${id}`,
    purchaseInvoices: `${BASE}/invoices/purchase`,
    creditNotes: `${BASE}/invoices/credit-notes`,
    creditNote: (id: string) => `${BASE}/invoices/credit-notes/${id}`,
  },
  accounting: {
    ledger: `${BASE}/accounting/ledger`,
    payments: `${BASE}/accounting/payments`,
    payment: (id: string) => `${BASE}/accounting/payments/${id}`,
    reports: `${BASE}/accounting/reports`,
  },
  // Reports module. See
  // `comprint-erp-docs/modules/crm/sales-activity-report/plan.md`.
  reports: {
    // Reports Center: rows for any catalog report, by its catalog id.
    catalogReport: (reportId: string) => `${BASE}/reports/catalog/${reportId}`,
    salesActivity: `${BASE}/reports/crm-sales-activity`,
    // Drill-down popup — records (Leads / Deals / Quotes / SOs) a user
    // created or updated in the report's window. See plan.md §12.
    salesActivityUserRecords: (userId: string) =>
      `${BASE}/reports/crm-sales-activity/users/${userId}/records`,
  },
  vendors: {
    vendors: `${BASE}/vendors`,
    vendor: (id: string) => `${BASE}/vendors/${id}`,
  },
  customers: {
    customers: `${BASE}/customers`,
    customer: (id: string) => `${BASE}/customers/${id}`,
  },
  rentals: {
    // ── Live backend (app/modules/rentals) ──────────────────────────
    // An account's billing defaults — the "Billings" tab on the account
    // detail page. GET returns system defaults for an account that has
    // never had them set, so there is no 404 branch to handle.
    accountSettings: (accountId: string) =>
      `${BASE}/rentals/accounts/${accountId}/settings`,
    // Who handles the account's rental billing. PUT replaces the whole set.
    // Separate from the defaults: saving those is what makes the account billable.
    accountBillingClerks: (accountId: string) =>
      `${BASE}/rentals/accounts/${accountId}/billing-clerks`,
    // ONE rental line's billing cadence. PUT with every field null
    // clears the override and returns the line to inheriting the order's;
    // anything else must be a whole cadence.
    agreementLineCadence: (agreementId: string, lineId: string) =>
      `${BASE}/rentals/agreements/${agreementId}/lines/${lineId}/cadence`,
    // The rentals SO list — only `sellable_type = 'rental_sales'` orders.
    salesOrders: `${BASE}/rentals/sales-orders`,
    salesOrderFacets: `${BASE}/rentals/sales-orders/facets`,
    // Return by count (§7, §10, §11): early exit, waivers, swaps,
    // billing adjustments, lost devices.
    salesOrderEarlyExitCharges: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/early-exit-charges`,
    earlyExitWaiver: (chargeId: string) =>
      `${BASE}/rentals/early-exit-charges/${chargeId}/waiver`,
    accountEarlyExitTerms: (accountId: string) =>
      `${BASE}/rentals/accounts/${accountId}/early-exit-terms`,
    // Terminations and early-exit waivers in one queue (2026-11-15).
    earlyExitQueue: `${BASE}/rentals/early-exit-queue`,
    waiverRequestApprove: (id: string) => `${BASE}/rentals/waiver-requests/${id}/approve`,
    waiverRequestReject: (id: string) => `${BASE}/rentals/waiver-requests/${id}/reject`,
    // Termination / invoice-deletion requests (2026-11-14). Each kind has
    // its own approve / reject route, gated on its own code.
    actionRequests: `${BASE}/rentals/action-requests`,
    actionRequestDecide: (
      kind: "terminations" | "invoice-deletions",
      id: string,
      decision: "approve" | "reject",
    ) => `${BASE}/rentals/action-requests/${kind}/${id}/${decision}`,
    actionRequestCancel: (id: string) => `${BASE}/rentals/action-requests/${id}/cancel`,
    invoiceDeleteRequest: (id: string) => `${BASE}/rentals/invoices/${id}/delete-request`,
    // Extends that change a rate wait here for `rentals:extend_approve`.
    extendRequestsPending: `${BASE}/rentals/extend-requests/pending-pm-approval`,
    extendRequestDecide: (id: string, decision: "approve" | "reject") =>
      `${BASE}/rentals/extend-requests/${id}/${decision}`,
    swaps: `${BASE}/rentals/swaps`,
    swap: (id: string) => `${BASE}/rentals/swaps/${id}`,
    swapApprove: (id: string) => `${BASE}/rentals/swaps/${id}/approve`,
    swapReject: (id: string) => `${BASE}/rentals/swaps/${id}/reject`,
    billingAdjustments: `${BASE}/rentals/billing-adjustments`,
    billingAdjustment: (id: string) => `${BASE}/rentals/billing-adjustments/${id}`,
    billingAdjustmentIssue: (id: string) =>
      `${BASE}/rentals/billing-adjustments/${id}/issue`,
    billingAdjustmentCancel: (id: string) =>
      `${BASE}/rentals/billing-adjustments/${id}/cancel`,
    deviceLost: (id: string) => `${BASE}/rentals/devices/${id}/lost`,
    deviceFoundInUse: (id: string) => `${BASE}/rentals/devices/${id}/found-in-use`,
    // The "Billings" card on the sales-order detail page.
    salesOrderBilling: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/billing`,
    // Order lifecycle actions (§10). Each is gated server-side by the same
    // blocked-reason function the action menu renders.
    salesOrderExtend: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/extend`,
    // What an extend's per-line rate would actually reprice: the units on
    // rent under each line and the rates they sit at today. Read before
    // offering a line rate — the rate lives on the UNIT, so one line rate
    // can flatten several different ones.
    salesOrderLineRateTargets: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/line-rate-targets`,
    // The earliest dates an ORDER-level extend may use — the contracted
    // floor, and the end of the tenure in progress. Same keys and same
    // arithmetic as the per-device `extendBounds` below; the two extend
    // dialogs bound their calendars identically because neither computes
    // the bounds itself.
    salesOrderExtendBounds: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/extend-bounds`,
    salesOrderTerminate: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/terminate`,
    salesOrderHold: (id: string) => `${BASE}/rentals/sales-orders/${id}/hold`,
    salesOrderUnhold: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/unhold`,
    salesOrderConfigure: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/configure`,
    salesOrderConfigVersions: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/config-versions`,
    // Put the agreement IN FORCE: PendingSignature -> Active. This is the
    // authority to SHIP — WMS refuses a dispatch request for an agreement
    // that is not Active. Addressed by SALES ORDER, like every other
    // action on this module.
    salesOrderApprove: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/approve`,
    // Approve's other outcome: PendingSignature -> Draft, with a reason.
    salesOrderReject: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/reject`,
    // Signatures hang off the AGREEMENT VERSION, not the sales order: an
    // amend spawns a new version that carries none of them.
    agreementSignatures: (agreementId: string) =>
      `${BASE}/rentals/agreements/${agreementId}/signatures`,
    // Money back on an invoice that STANDS (not a void).
    invoiceCreditNotes: (invoiceId: string) =>
      `${BASE}/rentals/invoices/${invoiceId}/credit-notes`,
    // Where the fleet's identity links disagree with reality. `unlinked`
    // is the cutover progress metric, not a defect.
    deviceIdentityReconcile: `${BASE}/rentals/devices/identity-reconcile`,
    salesOrderFirstInvoice: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/first-invoice`,
    // Customer purchase orders on a "PO needed?" order (legacy-parity §3).
    salesOrderPurchaseOrders: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/purchase-orders`,
    // Every PO row's paper, in one call — for the order's Attachments section.
    salesOrderPurchaseOrderDocuments: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/purchase-orders/documents`,
    salesOrderPurchaseOrderExtend: (id: string) =>
      `${BASE}/rentals/sales-orders/${id}/purchase-orders/extend`,
    purchaseOrdersPending: `${BASE}/rentals/purchase-orders/pending-approval`,
    purchaseOrderApprove: (id: string) => `${BASE}/rentals/purchase-orders/${id}/approve`,
    purchaseOrderReject: (id: string) => `${BASE}/rentals/purchase-orders/${id}/reject`,
    // An awaited PO's number and date — billing resumes and catches up.
    purchaseOrderDetails: (id: string) => `${BASE}/rentals/purchase-orders/${id}/details`,
    poRenewalSettings: `${BASE}/rentals/settings/po-renewal`,
    creditNotes: `${BASE}/rentals/credit-notes`,
    creditNote: (id: string) => `${BASE}/rentals/credit-notes/${id}`,
    devices: `${BASE}/rentals/devices`,
    extendBounds: (id: string) => `${BASE}/rentals/devices/${id}/extend-bounds`,
    deviceSummary: `${BASE}/rentals/devices/summary`,
    device: (id: string) => `${BASE}/rentals/devices/${id}`,
    deviceHold: (id: string) => `${BASE}/rentals/devices/${id}/hold`,
    deviceUnhold: (id: string) => `${BASE}/rentals/devices/${id}/unhold`,
    // Records the day a unit reached the customer. Moves that unit's
    // billing start off the dispatch-plus-grace estimate onto the real
    // date; refused server-side when it would rewind an invoiced period.
    deviceDelivered: (id: string) => `${BASE}/rentals/devices/${id}/delivered`,
    // Everything ONE PHYSICAL unit has done, newest first — spanning
    // successive rentals, not just the row in the URL.
    deviceHistory: (id: string) => `${BASE}/rentals/devices/${id}/history`,
    // Moves ONE unit's return date, its own order line, and the order's
    // end date together — forward only, never below the order's original
    // end (shortening is a termination, not an extension).
    deviceExtend: (id: string) => `${BASE}/rentals/devices/${id}/extend`,
    // Every swap, with its WMS trail resolved per read.
    invoices: `${BASE}/rentals/invoices`,
    // Prices an invoice without raising one — same engine, rolled back.
    invoicePreview: `${BASE}/rentals/invoices/preview`,
    invoiceSummary: `${BASE}/rentals/invoices/summary`,
    invoiceExport: `${BASE}/rentals/invoices/export`,
    invoiceDocuments: `${BASE}/rentals/invoices/documents`,
    // The billing engine's runs, one row per day.
    invoiceAutoDays: `${BASE}/rentals/invoices/auto-days`,
    invoiceDocument: (id: string) => `${BASE}/rentals/invoices/${id}/document`,
    invoicePdf: (id: string) => `${BASE}/rentals/invoices/${id}/pdf`,
    // One invoice as its Tally "Import-Sales" voucher.
    invoiceExportOne: (id: string) => `${BASE}/rentals/invoices/${id}/export`,
    invoice: (id: string) => `${BASE}/rentals/invoices/${id}`,
    billingRun: `${BASE}/rentals/billing/run`,
    // Billing scheduler configuration (§12).
    settings: `${BASE}/rentals/settings`,

    // ── Not yet backed by an API ────────────────────────────────────
    // These paths are consumed by the mock-data pages under
    // `modules/rentals/pages/*` and return 404 today. Kept so those
    // pages keep their intended shape until each ships.
    contracts: `${BASE}/rentals/contracts`,
    contract: (id: string) => `${BASE}/rentals/contracts/${id}`,
    orders: `${BASE}/rentals/orders`,
    assets: `${BASE}/rentals/assets`,
    support: `${BASE}/rentals/support`,
    billing: `${BASE}/rentals/billing`,
  },
  notifications: {
    list: `${BASE}/notifications`,
    unreadCount: `${BASE}/notifications/unread-count`,
    readAll: `${BASE}/notifications/read-all`,
    read: (id: string) => `${BASE}/notifications/${id}/read`,
  },
  attachments: {
    // Shared router — GET list (?entity_type=&entity_id=&offset=&limit=)
    // and POST upload (multipart `file` + query params for metadata).
    root: `${BASE}/attachments`,
    attachment: (id: string) => `${BASE}/attachments/${id}`,
    download: (id: string) => `${BASE}/attachments/${id}/download`,
    presignedUrl: (id: string) => `${BASE}/attachments/${id}/url`,
  },
  assistant: {
    ask: `${BASE}/assistant/ask`,
  },
} as const;
