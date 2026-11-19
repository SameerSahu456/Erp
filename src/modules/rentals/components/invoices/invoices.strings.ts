/** Invoice screens' copy (§16.12): the register, invoice detail, New invoice,
 *  export, the PDF preview and the sales order's Invoices card. */
export const INVOICE_STRINGS = {
  newInvoice: {
    footerTotal: (amount: string) => `Total: ${amount}`,
    orderMeta: (rate: string, units: number, billedThrough: string) =>
      `${rate} / month · ${units} unit(s) · billed through ${billedThrough}`,
    gstPct: (pct: number) => `${pct}%`,
    action: "New invoice",
    title: "New Invoice",
    save: "Save Invoice",
    details: {
      title: "Invoice Details",
      subtitle: "Billing account and period",
      account: "Account",
      accountPlaceholder: "Search account…",
      accountSearchPlaceholder: "Search accounts…",
      billUpTo: "Bill Up To",
      billUpToHelp:
        "Last day this invoice bills. The period STARTS where each order was last billed through.",
      period: "Billing Period",
      periodPlaceholder: "Select sales order(s) below",
      periodHelp: "From each order's billing anchor to the date above.",
      issueDate: "Issue Date",
      issueDateHelp:
        "When the invoice is cut — independent of the period it covers.",
      creditTerms: "Credit Terms (days)",
      creditTermsPlaceholder: "Days (0–365)",
      creditTermsHelp:
        "Invoice due date = issue date + this. Blank leaves no due date.",
    },
    orders: {
      title: "Sales Orders",
      subtitle: "Select a customer to load their sales orders",
      chooseFirst: "Choose a customer above first.",
      none: "This account has no configured rental orders.",
      // A selected order the engine found nothing to bill for. Said
      // plainly, because the alternative is a line silently missing.
      skipped: "Nothing to bill up to that date",
    },
    lines: {
      title: "Line Items",
      subtitle: "Generated from the selected sales orders — read-only",
      help: "Line items are derived from the selected sales orders and cannot be edited here.",
      empty: "Select one or more sales orders to price this invoice.",
      failed: "Could not price this invoice.",
      columns: {
        description: "Description",
        hsn: "HSN/SAC",
        qty: "Qty",
        rate: "Rate",
        amount: "Amount",
        gst: "GST%",
      },
      subtotal: "Subtotal",
      gst: "GST",
      total: "Total",
    },
  },
  detail: {
    periodRange: (from: string, to: string) => `${from} to ${to}`,
    gstPct: (pct: number | string) => `${pct}%`,
    orderSeparator: ",",
  },
  creditNotes: {
    noteMeta: (date: string, reason: string) => `${date} · ${reason}`,
    lineLabel: (name: string, period: string | null | undefined) =>
      period ? `${name} · ${period}` : name,
  },
  export: {
    trigger: "Export",
    title: "Export invoices",
    description:
      "Invoices issued between these dates, both days included. Voided invoices are left out.",
    range: "Issue date range",
    format: "Format",
    formats: {
      json: "Tally (JSON)",
      jsonHint: "Voucher file for importing into Tally.",
      xlsx: "Spreadsheet (XLSX)",
      xlsxHint: "One row per invoice, with totals.",
      pdf: "Printed invoices (PDF)",
      pdfHint: "The invoices as they print, one per page.",
      lineItems: "Line-item Report (XLSX)",
      lineItemsHint:
        "rental-billing's Line Item wise Invoices Report — one row per invoice line, with PO, SO, GST split and credit notes.",
    },
    submit: "Export",
    exporting: "Exporting…",
    needRange: "Pick a start and end date.",
    inverted: "The start date must not be after the end date.",
    done: (name: string) => `Downloaded ${name}`,
  },
  // The invoice PDF viewer on the detail page and in the export dialog.
  preview: {
    title: "INVOICE",
    /** Dialog heading — the document is the invoice, so it is named. */
    titleFor: (number: string) => `Invoice ${number}`,
    /** Accessible name for the range export's viewer frame. */
    rangeFrameTitle: "Invoices in the selected window",
    action: "Preview",
    download: "Download JSON",
    loadError: "Could not build this invoice's preview.",
  },
  soInvoices: {
    cardTitle: "Invoices",
    subtitle: "Raised against this sales order.",
    loadError: "Could not load this order's invoices.",
    empty: "No invoices have been raised against this order yet.",
    voided: "Voided",
    viewAll: (n: number) => `View all ${n}`,
    columns: {
      invoice: "Invoice",
      period: "Period",
      issued: "Issued",
      due: "Due",
      total: "Total",
    },
  },
  invoices: {
    detail: {
      title: "Invoice Details",
      salesOrder: "Sales order",
      lineItems: "Line Items",
      loadError: "Could not load this invoice.",
      delete: "Request delete",
      // Deleting waits for the rental manager's approval (2026-11-14). The
      // dialog names the invoice and says what happens once approved (§5,
      // §9 named buttons — never a generic OK/Cancel).
      deleteTitle: "Request to void this invoice",
      deleteDescription: (number: string) =>
        `Once approved, ${number} is voided and its period becomes billable again. The invoice number stays consumed — the gap in the register is deliberate and permanent. Nothing changes until then.`,
      deleteReasonLabel: "Reason",
      deleteReasonPlaceholder: "Why should this invoice be voided?",
      deleteConfirm: "Send for approval",
      deleteCancel: "Keep it",
      // Shown under the invoice number when the API would refuse the
      // void. The reason itself comes from the server — the same function
      // the DELETE guard runs — so the screen can never disagree with the
      // API about WHY (§8.2). The prefix only names the consequence.
      deleteBlocked: (reason: string) => `Can't be voided — ${reason}.`,
      account: "Account",
      period: "Period",
      issueDate: "Issue date",
      dueDate: "Due date",
      total: "Total",
      showFewer: "Show fewer",
      showAll: (n: number) => `Show all ${n} serials`,
      columns: {
        part: "Part no",
        serial: "Serial no",
        description: "Description",
        hsn: "HSN",
        qty: "Qty",
        ratePerMonth: "Rate / month",
        value: "Value",
        gst: "GST %",
        amount: "Amount",
      },
    },
    title: "Rental invoices",
    description:
      "The invoice register. A voided invoice keeps its number — the gap is deliberate.",
    // Filter name, shown as the date filter's placeholder.
    issuedFilter: "Issue date",
    empty: "No invoices have been raised yet.",
    emptyHint:
      "Invoices are raised by the daily billing run, or by hand from a sales order.",
    loadError: "Could not load invoices.",
    // Live / Voided are TABS now (BMT renders each count as a pill), not a
    // checkbox — the count is the point: a voided invoice keeps its number
    // forever, so the size of the gap is worth stating.
    // "Valid", not "All": the tab never held voided invoices (they have
    // their own tab), so "All" misread as live + voided.
    tabs: {
      live: "Valid",
      voided: "Voided",
      auto: "Auto invoices",
      creditNotes: "Credit notes",
    },
    // The Credit notes tab: every note recorded, newest first. A row opens
    // the note's own page.
    creditNoteRegister: {
      columns: {
        salesOrder: "Sales order",
        invoice: "Invoice no.",
        cnNumber: "CN no.",
        cnDate: "CN date",
        account: "Account",
        amount: "Amount",
      },
      notIssued: "No CN issued",
      empty: "No credit notes recorded yet.",
      emptyHint: "Credit notes are recorded on an invoice, or issued for a serial swap's adjustment.",
      loadError: "Could not load credit notes.",
    },
    // Credit notes on one invoice (raised in Tally, recorded here by
    // accounts). The list of every note is on the Adjustments page.
    creditNotes: {
      // The section on one invoice.
      sectionTitle: "Credit notes",
      sectionDescription:
        "Credit notes raised in Tally against this invoice. The invoice itself stands unchanged.",
      sectionEmpty: "No credit note recorded against this invoice.",
      record: "Record credit note",
      recordTitle: "Record credit note",
      recordDescription:
        "Enter the credit note as raised in Tally. Amounts are before GST; the GST is worked out from each line's own rate.",
      cnNumberHelp: "Leave blank if the invoice was edited in Tally and no credit note was issued.",
      lineHeading: "Credit per line (before GST)",
      lineBilled: (amount: string) => `Billed ${amount}`,
      lineTooHigh: "More than this line billed.",
      submit: "Record credit note",
      total: (amount: string) => `Credit ${amount} + GST`,
      number: "CN No.",
      date: "CN Date",
      reason: "Reason",
      notIssued: "Not issued",
      loadError: "Could not load credit notes.",
    },
    // The Auto tab lists the billing engine's RUNS: one row per day, each
    // downloadable as a single PDF of that day's invoices.
    autoDays: {
      day: "Date",
      count: "Invoices",
      total: "Total",
      download: "JSON",
      downloadLabel: "Download this day's invoices as a Tally JSON voucher",
      downloading: "Preparing…",
      empty: "The billing run has not raised any invoices yet.",
      emptyHint:
        "Days appear here once the daily run issues its first invoice. Invoices raised by hand are not runs and are not listed.",
      loadError: "Could not load billing run days.",
      invoices: (n: number) => (n === 1 ? "1 invoice" : `${n} invoices`),
    },
    voided: "Voided",
    liveTotal: "Invoiced",
    liveTotalSub: "excludes voided",
    liveCount: "Invoices",
    liveCountSub: "live in the register",
    voidedCount: "Voided",
    voidedCountSub: "numbers still consumed",
    columns: {
      number: "Invoice",
      salesOrder: "SO",
      account: "Account",
      period: "Period",
      issued: "Issued",
      due: "Due",
      lines: "Lines",
      total: "Total",
    },
  },
} as const;
