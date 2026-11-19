/** Screen copy for the Sales Return Request pages (Coding-guideline §16.12). */
export const SALES_RETURN_REQUESTS_STRINGS = {
  list: {
    title: "Sales returns",
    subtitle:
      "Customer returns authorised against a sales order. The warehouse receives against the request, not the order.",
    newRequest: "Raise return",
    searchPlaceholder: "Search by request number",
    tabs: {
      all: "All",
      pending_approval: "Pending",
      partially_approved: "Partially approved",
      approved: "Approved",
      completed: "Completed",
      rejected: "Rejected",
      cancelled: "Cancelled",
    },
    stats: {
      pending: "Awaiting approval",
      approved: "Approved",
      completed: "Completed",
      rejected: "Rejected",
    },
    filters: {
      reason: "Reason",
      allReasons: "All reasons",
      customer: "Customer",
      allCustomers: "All customers",
      customerSearch: "Search customers",
      salesOrder: "Sales order",
      allSalesOrders: "All sales orders",
      salesOrderSearch: "Search sales orders",
      anyDate: "Any raised date",
    },
    columns: {
      requestNumber: "Request",
      salesOrder: "Sales order",
      customer: "Customer",
      reason: "Reason",
      unitsToReturn: "Units to be returned",
      unitsToReturnHelp: "Units the customer is authorised to send back",
      returned: "Returned",
      returnedHelp: "Units physically received so far",
      status: "Status",
      raised: "Raised",
    },
    empty: {
      title: "No sales returns yet",
      description:
        "Raise a return when a customer sends dispatched units back. A product manager approves it before the warehouse can receive.",
      action: "Raise return",
      // Shown when a SEARCH returns nothing (vs the true-empty state above),
      // with a one-click way back to the full list (CP-325 #7).
      noMatchTitle: "No matching sales returns",
      noMatchDescription: "No sales returns match your search.",
      clearSearch: "Clear search",
    },
    error: {
      title: "Could not load sales returns",
      description: "Something went wrong fetching the list. Try again.",
      retry: "Try again",
    },
  },

  form: {
    title: "Raise sales return",
    subtitle: "Authorise a customer to send dispatched units back.",
    steps: {
      order: "Sales order",
      units: "Units",
      details: "Reason & logistics",
    },
    // Numbered SectionCard steps — a title and one calm description line each,
    // matching the Inward form's grammar.
    sections: {
      order: {
        title: "Sales order",
        description: "Choose the order the customer is returning against.",
      },
      units: {
        title: "Units",
        description: "Select the units the customer is authorised to send back.",
      },
      reason: {
        title: "Reason & notes",
        description:
          "Record why the units are coming back, with any context for the warehouse and product manager.",
      },
      logistics: {
        title: "Logistics",
        description:
          "Details so the warehouse can expect the shipment. None of it changes the request's state.",
      },
    },
    orderStep: {
      label: "Sales order",
      placeholder: "Search for Dispatched Sales Order",
      searchPlaceholder: "Search by order number",
      unitsAvailable: (n: number) => `${n} returnable`,
      // Always-visible helper describing what the picker lists. The "nothing
      // returnable" case is the picker's own empty-list state, not a scary line
      // shown even when orders exist.
      helper: "Only orders with at least one returnable unit appear here.",
      empty:
        "No orders have units free to return. Every dispatched unit is either already back or claimed by another request.",
    },
    unitsStep: {
      heading: "Which units are coming back?",
      // Shown under the heading until an order is picked (§0.6 empty state).
      pickOrderFirst: "Pick a sales order above to see its returnable units.",
      // No return window exists — the age is shown because the approving PM
      // judges on it, not because anything is blocked.
      daysSinceDispatch: (n: number) =>
        `${n} ${n === 1 ? "day" : "days"} since dispatch`,
      dispatchDateUnknown: "Dispatch date unknown",
      selectedCount: (n: number) => `${n} selected`,
      empty: "This order has no units free to return.",
      error: "Could not load this order's returnable units.",
      pinNote:
        "The serial is recorded as the unit sales expects. The warehouse may return a different unit of the same model — that is not an error.",
      // Units table — search, select-all and per-unit reason / notes.
      table: {
        searchPlaceholder: "Search serial, part or variant",
        clearSearch: "Clear search",
        // Unticks every picked unit (not just the ones the search shows).
        clearAll: "Clear all",
        unitCount: (shown: number, total: number) =>
          shown === total
            ? `${total} ${total === 1 ? "unit" : "units"}`
            : `${shown} of ${total} units`,
        noMatch: "No units match your search.",
        selectAllAria: "Select all units shown",
        selectUnitAria: (serial: string) => `Select unit ${serial}`,
        // A unit the customer holds as a replacement for the order line.
        replacementUnit: "Replacement unit",
        reasonPlaceholder: "Select a Reason",
        reasonAria: (serial: string) => `Reason for unit ${serial}`,
        notesPlaceholder: "e.g. Screen cracked on arrival",
        notesAria: (serial: string) => `Notes for unit ${serial}`,
        columns: {
          serial: "Serial",
          mfrSerial: "Mfr serial",
          partVariant: "Part / variant",
          age: "Dispatched Date",
          reason: "Reason",
          notes: "Notes",
        },
      },
    },
    detailsStep: {
      reasonLabel: "Reason",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What happened?",
      notesLabel: "Notes",
      notesPlaceholder: "Anything the warehouse or PM should know…",
      logisticsHeading: "Logistics",
      logisticsHint:
        "Recorded for the warehouse to expect the shipment. None of it changes the request's state.",
      // Under the overall reason: it seeds each newly picked unit's reason.
      reasonHelper:
        "Applies to every unit picked above. Change a single unit's reason in its row.",
      pickupByLabel: "Who moves it",
      courierLabel: "Courier",
      courierPlaceholder: "e.g. Blue Dart",
      awbLabel: "AWB / docket",
      awbPlaceholder: "e.g. 1Z999AA10123456784",
      expectedArrivalLabel: "Expected arrival",
      returnWarehouseLabel: "Return to warehouse",
      documentsLabel: "Shipping documents",
      documentsHint: "Optional. The customer's challan or courier receipt, uploaded once the return is raised.",
    },
    docsUploadPartial:
      "Return raised, but some documents didn’t upload. Add them from the return's page.",
    submit: "Raise return",
    // Counted label on the footer's raise button, like the Purchase Return form.
    raiseButton: (n: number) => `Raise return (${n})`,
    // Bulk bar — a global reason + note that appears once units are ticked and
    // stamps every selected unit at once, mirroring the Purchase Return form.
    bulk: {
      reasonPlaceholder: "Select a Reason",
      notesPlaceholder: "Note for the whole return (optional)",
      apply: (n: number) => `Apply to all ${n}`,
      // §0.9 — disabled-apply why-tooltip naming the one unmet gate.
      needsReason: "Pick a reason to apply to the selected units.",
    },
    cancel: "Cancel",
    validation: {
      orderRequired: "Pick a sales order",
      unitsRequired: "Select at least one unit",
      reasonRequired: "Pick a reason",
    },
  },

  detail: {
    backToList: "Sales returns",
    documents: {
      title: "Shipping documents",
      uploaded: (n: number) => (n === 1 ? "Document uploaded" : `${n} documents uploaded`),
    },
    // Titled overview card — the header-facts block had no title before.
    overviewHeading: "Return overview",
    raisedBy: "Raised by",
    raisedOn: "Raised",
    order: "Sales order",
    customer: "Customer",
    reason: "Reason",
    description: "Description",
    notes: "Notes",
    completedOn: "Completed",
    cancelledOn: "Cancelled",
    cancelReason: "Cancellation reason",
    logistics: {
      heading: "Logistics",
      pickupBy: "Who moves it",
      courier: "Courier",
      courierPlaceholder: "e.g. Blue Dart",
      awb: "AWB / docket",
      awbPlaceholder: "e.g. 1Z999AA10123456784",
      expectedArrival: "Expected arrival",
      returnWarehouse: "Return to warehouse",
      none: "No logistics recorded",
      edit: "Edit logistics",
      dialogDescription: "Recorded so the warehouse can expect the shipment.",
      save: "Save",
      cancel: "Cancel",
    },
    lines: {
      heading: "Units",
      part: "Part",
      variant: "Variant",
      serial: "Expected serial",
      productManager: "Product manager",
      approval: "Approval",
      receipt: "Receipt",
      age: "Dispatched Date",
      unassigned: "Unassigned",
      noSerial: "Any unit of this model",
      specificUnit: "Specific unit",
      days: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
      // Count badge beside the Units heading.
      count: (n: number) => `${n} ${n === 1 ? "unit" : "units"}`,
      unknown: "—",
      // A cancelled request's still-pending lines are moot — they no longer
      // read "Pending" / "Awaiting unit".
      cancelledLine: "Cancelled",
      // A named checkbox, never a bare "checkbox" for a screen reader (§14/§0.15).
      selectAria: (part: string) => `Select ${part}`,
      // Column headers for the units Table.
      columns: {
        srNo: "Sr No",
        partVariant: "Part / variant",
        unit: "Unit",
        reason: "Reason",
        productManager: "Product manager",
        age: "Dispatched Date",
        approval: "Approval",
        receipt: "Unit Status",
        actions: "Actions",
      },
      // Named triggers for the per-row kebab and the header select-all.
      rowActionsAria: "Line actions",
      selectAllAria: "Select all decidable lines",
      // A rejected line expands to show the approver's reason (CP-446).
      expandRow: "Show rejection reason",
      collapseRow: "Hide rejection reason",
      rejectionReason: "Rejection reason",
    },
    approval: {
      selected: (n: number) => `${n} line${n === 1 ? "" : "s"} selected`,
      approve: "Approve",
      reject: "Reject",
      // Confirm before running the batch approve (§0 bulk actions).
      approveDialogTitle: "Approve these lines?",
      approveDialogBody: (n: number) =>
        `${n} line${n === 1 ? "" : "s"} will be approved. The warehouse can then receive the ${n === 1 ? "unit" : "units"}.`,
      approveConfirm: (n: number) => `Approve ${n} line${n === 1 ? "" : "s"}`,
      rejectDialogTitle: "Reject these lines?",
      rejectReasonLabel: "Reason",
      rejectReasonPlaceholder: "Why is this return refused?",
      rejectConfirm: "Reject lines",
      // §0.9 — disabled-confirm tooltip naming the empty required reason.
      blockedReason: "Enter a reason to continue.",
      // Named button on the non-destructive way out of the reject dialog (§3.1).
      dismiss: "Keep it",
      // The server enforces this and answers 403; the UI disables rather
      // than letting the user discover it on submit.
      notYours: "Assigned to another product manager",
      reassign: "Reassign",
    },
    cancel: {
      action: "Cancel request",
      dialogTitle: "Cancel this return request?",
      dialogBody:
        "The units it claimed become available again. This cannot be undone.",
      reasonLabel: "Reason",
      reasonPlaceholder: "Why is this being withdrawn?",
      confirm: "Cancel request",
      dismiss: "Keep it",
      // §0.9 — disabled-confirm tooltip naming the empty required reason.
      blockedReason: "Enter a reason to continue.",
    },
    notFound: {
      title: "Return request not found",
      description: "It may have been deleted, or the link is wrong.",
    },
    // A genuine fetch failure is distinct from a missing record (§12): Retry, not
    // the "does not exist" copy.
    error: {
      title: "Could not load this return request",
      description: "Something went wrong. Try again.",
      retry: "Try again",
    },
  },

  soTab: {
    heading: "Returns",
    empty: "No returns raised against this order.",
    columns: {
      requestNumber: "Request",
      reason: "Reason",
      units: "Units",
      status: "Status",
      raised: "Raised",
    },
  },
} as const
