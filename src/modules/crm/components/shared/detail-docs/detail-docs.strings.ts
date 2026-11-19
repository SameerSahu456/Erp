// Generic copy for the shared detail-doc list/accordion components, reused by
// the Sales Order and Demo Request detail tabs. Tab-level empty text (e.g. "No
// dispatches for this order yet.") stays in each sub-feature's strings and is
// passed in as the `emptyText` prop.
export const DETAIL_DOCS_STRINGS = {
  loadError: "Couldn't load this list.",
  view: "View",
  linesLoading: "Loading items…",
  noLines: "No line items.",
  serialPrefix: "S/N",
  unknownPart: "Item",
  // Fitted BOM components on a document's units, shown as a pill beside the
  // unit count so they never inflate it (e.g. a 1-unit issue with 2 components
  // reads "1 + Components +2", not "3").
  componentsBadge: (n: number) => `Components +${n}`,
  columns: {
    srNo: "Sr No",
    document: "Document",
    units: "Units",
    date: "Date",
    status: "Status",
    actions: "",
  },
  expandRow: "Show line items",
  collapseRow: "Hide line items",
} as const
