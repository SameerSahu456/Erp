/** Screen copy for the Rental Return Request pages (Coding-guideline §16.12). */
export const RENTAL_RETURN_REQUESTS_STRINGS = {
  list: {
    title: "Rental returns",
    subtitle:
      "Rental units a customer is sending back, by model and count. The warehouse receives against the request, not the order.",
    /** An empty cell (no order / customer / units on record). */
    none: "—",
    unitsCell: (received: number, asked: number) => `${received}/${asked}`,
    newRequest: "Raise return",
    searchPlaceholder: "Search by request number",
    tabs: {
      all: "All",
      pending_approval: "Pending",
      partially_approved: "Partially approved",
      approved: "Approved",
      completed: "Completed",
      closed_short: "Closed short",
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
    },
    columns: {
      requestNumber: "Request",
      salesOrder: "Sales order",
      customer: "Customer",
      reason: "Reason",
      units: "Units",
      unitsHelp: "Units received / units authorised",
      status: "Status",
      raised: "Raised",
    },
    empty: {
      title: "No rental returns yet",
      description:
        // No approval step since 2026-11-16: a raised return is approved at once.
        "Raise a return when a customer sends dispatched units back. The warehouse can receive it as soon as it is raised.",
      action: "Raise return",
    },
    error: {
      title: "Could not load rental returns",
      description: "Something went wrong fetching the list. Try again.",
    },
  },

  form: {
    title: "Raise rental return",
    subtitle:
      "Tick the units the customer is sending back. The warehouse can receive only those units.",
    steps: {
      customer: "Customer",
      units: "Units",
      details: "Reason & logistics",
    },
    customerStep: {
      label: "Customer",
      placeholder: "Search a customer",
      searchPlaceholder: "Search by name",
      // Only customers with a rental order and a unit still free to return.
      noCustomers: "No customer has rented units left to return.",
      declaredOrderLabel: "Order",
      declaredOrderPlaceholder: "Pick the order",
      declaredOrderHelper: "The order's units on rent are listed below to tick.",
    },
    unitsStep: {
      pickCustomer: "Pick a customer to see their orders.",
      pickOrder: "Pick the order to list its units on rent.",
      empty: "This order has nothing on rent that is free to return.",
      error: "Could not load this order's units.",
      selectedCount: (n: number) => `${n} ${n === 1 ? "unit" : "units"} selected`,
      pinNote:
        "Only the ticked units can be received against this return. Any other unit that arrives is held at inward for review.",
      // Raised from one device: that unit is already chosen.
      lockedTitle: "Returning this unit",
      lockedNote: "Raised from the unit's page, so it is already chosen.",
      lockedModel: "Model",
      lockedInternal: "Internal serial",
      lockedManufacturer: "Manufacturer serial",
      chooseOther: "Choose other units",
      table: {
        searchPlaceholder: "Search serial or model",
        clearSearch: "Clear search",
        unitCount: (shown: number, total: number) =>
          shown === total ? `${total} units` : `${shown} of ${total} units`,
        selectAllAria: "Select all shown units",
        selectUnitAria: (serial: string) => `Select unit ${serial}`,
        noMatch: "No unit matches the search.",
        noDispatchRecord: "No dispatch record",
        replacementUnit: "Replacement unit",
        noSerial: "No serial",
        columns: {
          serial: "Serial",
          mfrSerial: "Mfr. serial",
          model: "Model",
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
        "The return method decides when billing stops: self pick at handover, customer delivery on arrival less the order's return grace days. The rest is recorded for the warehouse.",
      pickupByLabel: "Return method",
      courierLabel: "Courier",
      courierPlaceholder: "e.g. Blue Dart",
      awbLabel: "AWB / docket",
      awbPlaceholder: "e.g. 1Z999AA10123456784",
      expectedArrivalLabel: "Return date",
      returnDateFloorHint: (date: string) => `Terminated on ${date} — the return date can't be earlier.`,
      returnWarehouseLabel: "Return to warehouse",
    },
    submit: "Raise return",
    cancel: "Cancel",
  },

  detail: {
    backToList: "Rental returns",
    raisedBy: "Raised by",
    raisedOn: "Raised",
    order: "Sales order",
    customer: "Customer",
    reason: "Reason",
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
      expectedArrival: "Return date",
      returnWarehouse: "Return to warehouse",
      none: "No logistics recorded",
      edit: "Edit logistics",
      dialogDescription: "Recorded so the warehouse can expect the shipment.",
      save: "Save",
      cancel: "Cancel",
    },
    badges: {
      unannounced: "Arrived unannounced",
      overReceived: "More received than requested",
    },
    declaredOrder: "Order mentioned",
    declaredOrderNone: "Not specified",
    variance: {
      heading: "Requested vs received",
      model: "Model",
      requested: "Requested",
      received: "Received",
      substituted: "Other model",
      unrequested: "Extra",
      outstanding: "Still expected",
      helper:
        "Each unit settles on the order it actually belongs to, whatever was requested.",
    },
    closeShort: {
      requestAction: "Close short",
      lineAction: "Close short",
      dialogTitle: "Stop expecting the rest?",
      dialogBodyRequest: (n: number) =>
        `${n} ${n === 1 ? "unit is" : "units are"} still expected on this request. Units already received stay received; the rest are released.`,
      dialogBodyLine: (n: number, model: string) =>
        `${n} ${n === 1 ? "unit" : "units"} of ${model} still expected. Units already received stay received.`,
      reasonLabel: "Reason",
      reasonPlaceholder: "e.g. customer is keeping the rest",
      confirm: "Close short",
      dismiss: "Keep expecting",
      autoClosed: "Auto-closed — no receipt for too long",
    },
    lines: {
      heading: "Lines",
      quantity: (received: number, asked: number) => `${received} of ${asked} received`,
      outstanding: (n: number) => `${n} still expected`,
      closedReason: (reason: string) => `Closed short: ${reason}`,
      part: "Part",
      variant: "Variant",
      serial: "Expected serial",
      productManager: "Product manager",
      approval: "Approval",
      receipt: "Receipt",
      age: "Dispatch age",
      unassigned: "Unassigned",
      noSerial: "Any unit of this model",
      specificUnit: "Specific unit",
      days: (n: number) => `${n} days`,
      unknown: "—",
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
      // Named button on the non-destructive way out of the reject dialog (§3.1).
      dismiss: "Keep it",
      // The server enforces this and answers 403; the UI disables rather
      // than letting the user discover it on submit.
      notYours: "Waiting for the rental manager",
      // Approvals spec §2: an early line carries the lowest charge it could
      // incur; the charge itself is priced at receipt on the unit that came back.
      /** `amount` arrives formatted, ₹ included (formatINR). */
      earlyCharge: (amount: string) => `Early return · est. early-exit charge ${amount}`,
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
    },
    loadError: "Could not load this return request. Try again in a moment.",
    notFound: {
      title: "Return request not found",
      description: "It may have been deleted, or the link is wrong.",
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
