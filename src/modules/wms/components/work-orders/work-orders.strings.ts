// User-facing copy for the WMS › work-orders sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, column headers, section
// headings, and badge labels live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX. Components import via a relative path.
//
// Dynamic copy is expressed as a function member.

export const WORK_ORDERS_STRINGS = {
  // ──────────────────────────────────────────────────────────────────────────
  // WorkOrderListBody — list page chrome + cell formatters
  // ──────────────────────────────────────────────────────────────────────────
  list: {
    title: "Work Orders",
    subtitle: "SO / Rental → Engineering → Assembly → QC → Dispatch.",
    breadcrumbs: {
      wms: "WMS",
      workOrders: "Work Orders",
    },
    createButton: "Create Work Order",
    viewLink: "View",
    stats: {
      total: "Total Work Orders",
      inProgress: "In Progress",
      sales: "Sales",
      rental: "Rental",
    },
    tabs: {
      all: (n: number) => `All (${n})`,
      inProgress: (n: number) => `In Progress (${n})`,
      sales: (n: number) => `Sales (${n})`,
      rental: (n: number) => `Rental (${n})`,
      urgentHigh: (n: number) => `Urgent/High (${n})`,
    },
    columns: {
      workOrderNumber: "WO #",
      type: "Type",
      priority: "Priority",
      outputProduct: "Product",
      qty: "Qty",
      customer: "Customer",
      bomNumber: "BOM",
      dueDate: "Due Date",
      status: "Status",
    },
    emptyTitle: "No Work Orders Yet",
    emptyDescription:
      "Work orders track engineering and assembly progress for sales and rental orders.",
    emptyAction: "Create Work Order",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WorkOrderDetailBody — detail page sections + fields
  // ──────────────────────────────────────────────────────────────────────────
  detail: {
    breadcrumbs: {
      wms: "WMS",
      workOrders: "Work Orders",
    },
    backHref: "/wms/work-orders",
    notFound: "Work Order Not Found",
    backToList: "Back to Work Orders",
    workflowProgress: "Workflow Progress",
    // Key info cards
    outputLabel: "Output",
    outputUnits: (qty: number) => `× ${qty} units`,
    componentsLabel: "Components",
    componentsPicked: (picked: number, required: number) =>
      `${picked}/${required} picked`,
    destinationLabel: "Destination",
    destinationRentalWarehouse: "Rental Warehouse",
    destinationDirectDispatch: "Direct Dispatch",
    destinationStock: "Stock",
    dueDateLabel: "Due Date",
    completedOn: (date: string) => `Completed ${date}`,
    overdue: "Overdue",
    daysLeft: (n: number) => `${n} days left`,
    // Source & BOM section
    sourceBomTitle: "Source & BOM",
    sourceLabel: "Source",
    billOfMaterialsLabel: "Bill of Materials",
    customerLabel: "Customer",
    invoicePrefix: "Invoice:",
    // Component Picking section
    componentPickingTitle: "Component Picking",
    hasSubstitutions: "Has Substitutions",
    substitute: "Substitute",
    pickedOf: (picked: number, required: number, pct: number) =>
      `${picked}/${required} picked (${pct}%)`,
    percentPicked: (pct: number) => `${pct}% picked`,
    partNoPrefix: "Part no:",
    originalPartPrefix: "(original:",
    unitsPickedFrom: (count: number, location: string) =>
      `${count} units picked from ${location}`,
    // Assembly section
    assemblyTitle: "Assembly",
    teamLabel: "Team",
    startedLabel: "Started",
    completedLabel: "Completed",
    // QC section
    qualityControlTitle: "Quality Control",
    qcPassed: "QC Passed",
    qcFailed: "QC Failed",
    qcPerformedBy: (name: string, date: string) => `By ${name} · ${date}`,
    failureReasonsTitle: "Failure Reasons",
    // Dispatch / Routing section
    rentalWarehouseRoutingTitle: "Rental Warehouse Routing",
    dispatchBillingTitle: "Dispatch & Billing",
    destinationFieldLabel: "Destination",
    destinationDirectToCustomer: "Direct to Customer",
    customerFieldLabel: "Customer",
    invoiceFieldLabel: "Invoice",
    notYetInvoiced: "Not yet invoiced",
    rentalOrderNote:
      "This is a rental order. After QC, units are sent to the rental warehouse instead of direct dispatch. Billing happens through the rental contract cycle.",
    rentalOrderNoteStrong: "rental order",
    // People / Dates meta cards
    peopleTitle: "People",
    createdBy: "Created By",
    approvedBy: "Approved By",
    assignedTo: "Assigned To",
    datesTitle: "Dates",
    createdDate: "Created",
    requestedDate: "Requested",
    dueDate: "Due",
    completedDate: "Completed",
    // Notes section
    notesTitle: "Notes",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ComponentMovementHistoryBody — component movement history page
  // ──────────────────────────────────────────────────────────────────────────
  movements: {
    title: "Component Movement History",
    subtitle: "Track every install, removal, swap, and transfer",
    stats: {
      total: "Total Movements",
      installed: "Installed",
      removed: "Removed",
      transfers: "Transfers",
    },
    filters: {
      searchPlaceholder: "Search by component name or serial...",
      movementTypePlaceholder: "Movement Type",
      allTypes: "All Types",
      fromDatePlaceholder: "From",
      toDatePlaceholder: "To",
      toLabel: "to",
    },
    columns: {
      dateTime: "Date / Time",
      component: "Component",
      movementType: "Movement Type",
      parentPart: "Parent Part",
      workOrder: "Work Order",
      fromTo: "From → To",
      performedBy: "Performed By",
      verifiedBy: "Verified By",
      notes: "Notes",
    },
    empty: "No movements found.",
  },
} as const
