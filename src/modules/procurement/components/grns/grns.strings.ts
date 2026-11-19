// User-facing copy for the Procurement › GRNs sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, field labels, empty/error/loading text, and activity copy live here
// as one typed `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this via a relative path.
//
// Dynamic copy is expressed as function members where the string depends on
// runtime data.
export const GRN_STRINGS = {
  // List page (GRNMatchingPage) — ListPageShell chrome + table config.
  list: {
    title: "GRN Matching",
    subtitle:
      "Match goods received against purchase orders and flag discrepancies.",
    breadcrumbs: {
      procurement: "Procurement",
      grnMatching: "GRN Matching",
    },
    stats: {
      totalEntries: "Total Entries",
      matched: "Matched",
      pending: "Pending",
      discrepancies: "Discrepancies",
    },
    tabs: {
      all: "All",
      pending: "Pending",
      matched: "Matched",
      discrepancy: "Discrepancy",
    },
    columns: {
      poNumber: "PO#",
      partName: "Part",
      qtyOrdered: "Qty Ordered",
      qtyReceived: "Qty Received",
      qtyPending: "Qty Pending",
      batchNumber: "Batch#",
      status: "Status",
      discrepancyNotes: "Discrepancy Notes",
    },
    empty: {
      title: "No GRN entries to match",
      description:
        "Goods receipts from vendors will appear here for matching against POs.",
    },
  },

  // Detail page — not-found state.
  notFound: {
    heading: "GRN entry not found",
    description: "The GRN entry you are looking for does not exist.",
    backButton: "Back to GRN Matching",
  },

  // Quick-info strip labels (top of detail page).
  strip: {
    orderedReceived: "Ordered / Received",
    batch: "Batch",
    received: "Received",
    fulfilment: "Fulfilment",
  },

  // Receipt tab — section headers and field labels.
  receipt: {
    sectionHeader: "Receipt Details",
    part: "Part",
    batchNumber: "Batch Number",
    receivedDate: "Received Date",
    status: "Status",
    quantityMatchHeader: "Quantity Match",
    ordered: "Ordered",
    receivedQty: "Received",
    pendingQty: "Pending",
    fulfilment: "Fulfilment",
    discrepancyNotesLabel: "Discrepancy Notes",
  },

  // PO Reference tab — section headers and field labels.
  poRef: {
    sectionHeader: "Linked Purchase Order",
    viewPo: "View PO",
    poNumber: "PO Number",
    vendor: "Vendor",
    expectedDelivery: "Expected Delivery",
    poStatus: "PO Status",
    lineItemHeader: "Line Item",
    partSku: "Part SKU",
    unitPrice: "Unit Price",
    poQuantity: "PO Quantity",
    lineTotal: "Line Total",
    noPOAvailable: "Linked PO not available",
  },

  // Activity tab — event copy.
  activity: {
    goodsReceived: "Goods received",
    // `{received} of {ordered} units received`
    goodsReceivedDetail: (received: number, ordered: number) =>
      `${received} of ${ordered} units received`,
    // ` · Batch {batchNumber}`
    batchSuffix: (batchNumber: string) => ` · Batch ${batchNumber}`,
    discrepancyFlagged: "Discrepancy flagged",
    // `Status changed to {status}`
    statusChangedTo: (status: string) => `Status changed to ${status}`,
    pendingBalance: "Pending balance",
    // `{qty} units still expected from vendor`
    pendingBalanceDetail: (qty: number) =>
      `${qty} units still expected from vendor`,
    noReceiptsLogged: "No receipts logged yet",
  },

  // Right-rail discrepancy alert.
  discrepancyAlert: {
    actionRequired: "Action required",
    // `Reach out to vendor to resolve {status}.`
    resolveHint: (status: string) =>
      `Reach out to vendor to resolve ${status}.`,
  },

  // Summary card (right rail).
  summary: {
    cardTitle: "Summary",
    grnId: "GRN ID",
    poNumber: "PO Number",
    qtyOrdered: "Qty Ordered",
    qtyReceived: "Qty Received",
    qtyPending: "Qty Pending",
  },

  // Quick Actions card (right rail).
  quickActions: {
    cardTitle: "Quick Actions",
    recordReceipt: "Record Receipt",
    raiseVendorQuery: "Raise Vendor Query",
    viewPurchaseOrder: "View Purchase Order",
  },

  // Tab IDs used in DetailTabs.
  detailTabs: {
    receipt: { id: "receipt", label: "Receipt" },
    po: { id: "po", label: "PO Reference" },
    activity: { id: "activity", label: "Activity" },
  },
} as const
