/** Agreements sub-feature copy (§16.12): the rental sales-order list, the
 *  Billings card, Configure / Amend, the order actions and the detail page. */
export const AGREEMENTS_STRINGS = {
  /** A rental window, "1 Apr 26 – 31 Mar 27". Dates arrive pre-formatted. */
  period: (from: string, to: string) => `${from} – ${to}`,
  /** Units on rent of those provisioned. */
  unitsOut: (out: number, total: number) => `${out} / ${total}`,
  /** The Billings card's unit stat, "3 on rent / 5". */
  unitsOnRentOf: (out: number, onRentLabel: string, total: number) => `${out} ${onRentLabel} / ${total}`,
  /** Two facts on one line, "Monthly, billed in arrears · day 1". */
  joined: (...parts: string[]) => parts.join(" · "),
  so: {
    cardTitle: "Billings",
    // Shown under the order's Cadence stat when at least one line states
    // its own. Without it the stat reads as the whole truth, which is how
    // a quarterly line on a monthly order stayed invisible.
    lineOverrides: (n: number) =>
      n === 1
        ? "1 line bills on its own cycle"
        : `${n} lines bill on their own cycle`,
    configure: "Configure",
    reconfigure: "Amend billing",
    notConfigured: "Rental billing has not been configured for this order yet.",
    needsApproval: "Configure unlocks once the sales order is Approved.",
    // Shown after an amendment. Billing keeps running on the current
    // terms until the order is configured again.
    reconfigureRequired:
      "This order was amended — configure its billing again. Billing continues on the current terms until you do.",
    reconfigureAfterApproval:
      "This order was amended — configure its billing again once the revision is Approved.",
    configureAgain: "Configure again",
    loadError: "Could not load this order's rental billing.",
    versionLabel: (n: number) => `Version ${n}`,
    supersededLabel: "Superseded",
    currentLabel: "Current",
  },
  fields: {
    orderDate: "Order Date",
    amendReason: "Reason for amendment",
    amendReasonPlaceholder: "Why is the billing cadence changing?",
  },
  summary: {
    // Both transit legs. The customer pays for neither, and showing one
    // without the other invites the question of whether the return trip
    // is billed.
    transit: "Transit not charged",
    outboundDays: (days: number) => `${days}d out`,
    inboundDays: (days: number) => `${days}d back`,
    approved: "Approved",
    notApproved: "Not yet approved",
    status: "Status",
    period: "Rental period",
    cadence: "Cycle",
    // Fixed cycles only — a custom cycle has neither (its interval is in Cycle).
    billingDay: "Billing day",
    billIssueDay: "Bill issue day",
    onBillingDay: "On the billing day",
    // Named on the account's Billings tab; every agreement of it shows them.
    billingClerks: "Billing clerks",
    billedThrough: "Billed through",
    nextInvoice: "Next invoice",
    // Monthly rent × the whole start..end period — replaced "Invoiced to date".
    tenureTotal: "Total for the tenure",
    units: "Units",
    unitsOnRent: "On rent",
    notBilledYet: "Not billed yet",
  },
  list: {
    // QA RM16 — orders NOT on a PO whose contract is running out.
    // Named apart from "PO renewals due" so the two tabs don't read alike.
    expiringTab: "Contracts ending",
    expiringEmpty: "No contract without a PO is ending.",
    expiringEmptyHint:
      "Orders not on a PO show here from 30 days before their contract ends, up to the end date. After that they move to Expired. Orders on a PO are on the PO renewals due tab.",
    // Past the end date with units still out — what the order page calls Overdue.
    expiredTab: "Expired",
    expiredEmpty: "No contract has expired with units still out.",
    expiredEmptyHint:
      "Orders show here the day after their end date while units are still with the customer, on a PO or not. Extend the contract or raise a return.",
    needsConfiguration:
      "Units are out but nobody has set this order's billing terms, so it is not being billed. Configure it, or set the account's rental defaults.",
    // Matches the sidebar ("Agreements") — one name for one screen.
    title: "Rental agreements",
    description:
      "Every sales order raised as a rental, and where its agreement stands: to configure, awaiting approval, on rent.",
    // An order with no agreement yet — the accounts team's to-do.
    toConfigure: "To configure",
    empty: "No rental sales orders yet.",
    emptyHint:
      "A sales order appears here once it is raised with a sellable type of “Rental”.",
    filters: {
      // Filter names, shown as placeholders while nothing is picked.
      orderStatus: "Order status",
      rentalStatus: "Rental status",
      created: "Created date",
    },
    columns: {
      order: "Order",
      account: "Account",
      soStatus: "Order status",
      rentalStatus: "Rental",
      monthlyRate: "Monthly rent",
      lines: "Lines",
      // Units still with the customer (incl. hold, alert, overdue, PO
      // overdue) — not returned or settled. Not the ordered qty.
      units: "On rent",
      period: "Period",
      billedThrough: "Billed through",
      actions: "",
    },
  },
  // The sales order's Configure / Amend PAGE.
  //
  // This was a modal until the form outgrew one. The terms set here govern
  // every invoice the order will ever raise, and that decision is only
  // answerable next to the order's own figures — its period, its rate, how
  // far it is already billed. A dialog covered exactly those.
  configure: {
    /** PO Required on an order with no PO, for a user who cannot record one. */
    poDeferred:
      "This order needs a customer PO. Someone who manages POs records it from the agreement page; until then the order waits as Awaiting PO.",
    configureTitle: "Configure rental billing",
    amendTitle: "Amend rental billing",
    configureDescription:
      "Set how this order bills. Nothing is charged until the order is dispatched.",
    amendDescription:
      "New terms govern from the next billing onward. The current terms are kept as a superseded version.",
    submit: "Save configuration",
    saveAmend: "Save amendment",
    loadError: "Could not load this order's rental billing.",
    // Sections.
    orderTitle: "Order",
    orderSubtitle:
      "Set on the sales order itself. The account and the rental dates are not editable from this form.",
    scheduleTitle: "Billing Type",
    scheduleSubtitle: "When each period runs, and the day it turns over.",
    invoicingTitle: "Invoicing and credit",
    invoicingSubtitle:
      "How a closed period reaches the customer, and how long they have to pay it.",
    poTitle: "Customer PO",
    poSubtitle:
      "PO Required is ticked: enter the customer's PO and the period on it. Its end becomes the order's end date.",
    amendSectionTitle: "Amendment",
    amendSectionSubtitle:
      "Recorded against the new version, so the change has a reason attached.",
    historyTitle: "Amendment history",
    historySubtitle: "Every version of these terms, newest first.",
    // Order facts.
    orderNumber: "Sales order",
    account: "Account",
    unitsOf: (onRent: number, total: number) => `${onRent} on rent / ${total}`,
    // Shown in place of the form when the order has not been approved. The
    // reason is the API's own — the same sentence the call would refuse
    // with — so the page never invites an edit the save would reject.
    blockedTitle: "Not ready to configure",
    // Plain-language cadence, for the footer summary and the history rows.
    everyDays: (n: number) => `Every ${n} days`,
    onDay: (n: number) => `day ${n}`,
    creditDays: (n: number) => `${n}-day credit`,
  },
  actions: {
    trigger: "Actions",
    // The primary header button while an agreement awaits approval.
    approveNow: "Approve agreement",
    // A menu that has not loaded yet says so rather than rendering empty —
    // an empty dropdown reads as "nothing is possible".
    loading: "Loading actions…",
    failed: "Could not load actions.",
    // The approve dialog. Deliberately explicit that a SHIPMENT becomes
    // possible: an operator who reads "Approve" alone has no way to know
    // that is what it unblocks.
    approve: {
      title: "Approve rental agreement",
      description:
        "This puts the agreement in force and is what allows its goods to be dispatched.",
      submitting: "Approving…",
    },
    // Approve's other outcome: the terms go back to Draft with a reason the
    // configurer acts on, so the reason is required rather than optional.
    reject: {
      title: "Reject rental agreement",
      description:
        "Send these billing terms back. The agreement returns to Draft and has to be configured again before it can be approved.",
      reasonLabel: "Reason",
      reasonPlaceholder: "What needs to change before this can be approved",
      submit: "Reject",
    },
    // rental-billing's copy, word for word (legacy-parity spec §1.2).
    firstInvoice: {
      title: "Generate this order's first invoice?",
      description:
        "Bills the period from the billing start date up to the day before the first billing day. It can only be done once.",
      submit: "Generate invoice",
    },
    extend: {
      title: "Extend rental period",
      description:
        "Move the end date. It may move either way, but never below the order's original end — shortening a live contract is a termination.",
      newEndDate: "New end date",
      reason: "Reason (optional)",
      submit: "Extend",
      ratesHeading: "Line rates",
      ratesHelp:
        "Leave a line blank to keep its current rate. A new rate applies from the date below, so earlier periods bill unchanged.",
      unchanged: "Unchanged",
      // What sits under a line's box is what its UNITS charge today, not
      // the line's own figure: the rate lives on the unit, and the line's
      // re-bases to whichever unit was repriced last — nobody's real
      // rate. `rates` arrives pre-formatted; currency formatting belongs
      // to `formatINR`, not to a string table.
      unitsOnRent: (units: number, rates: string) =>
        `${units === 1 ? "1 unit" : `${units} units`} on rent · ${rates}`,
      /** A rate here would land on nothing, so the contracted figure is
       *  all there is to show. */
      noUnitsOnRent: (contracted: string) =>
        `Contracted ${contracted} · no unit on rent yet`,
      // Said rather than left blank: an empty answer and an unread one
      // look identical, and "no unit on rent" is a claim this screen has
      // no right to make until the units are actually read.
      unitsLoading: "Reading what this line's units charge…",
      unitsUnavailable: "Could not read this line's units.",
      unitsRequired:
        "Wait for this order's units to load before changing a rate — a rate can replace several without them.",
      // The whole point of the block: one rate replaces every unit rate
      // under the lines it lands on, and until now nothing said so. The
      // count is of the SELECTED units, not the line's — once units can be
      // ticked off, warning about units nobody is repricing is noise.
      flattenWarning: (units: number, rates: string) =>
        `The ${units} selected units are on different rates (${rates}). One rate replaces all of them.`,
      flattenConfirm: (rate: string) => `Put the selected units on ${rate}`,
      flattenRequired:
        "Confirm the lines whose selected units are on different rates, or clear those rates.",
      // ── Per-unit selection ──────────────────────────────────────────
      // A rate lives on the UNIT, so a line's machines can legitimately sit
      // at different figures. Every unit starts ticked, which is the
      // whole-line reprice this dialog has always done; untick to leave a
      // machine where it is.
      unitsPick: "Units this rate applies to",
      unitsPickHelp:
        "All ticked reprices the whole line, exactly as before. Untick a unit to leave it on its current rate — and the line's own contracted rate untouched, so units dispatched later still come in at it.",
      unitsAll: "All units",
      /** One checkbox row: the serial as it reads on the machine, and what
       *  that machine charges today. */
      unitRow: (serial: string, rate: string) => `${serial} · ${rate} today`,
      /** A unit provisioned without a serial — the common case on an
       *  imported order — has nothing to read off a label. */
      unitNoSerial: "No serial",
      unitsSelected: (picked: number, total: number) =>
        picked === total ? `All ${total} units` : `${picked} of ${total} units`,
      unitsNoneSelected:
        "Tick at least one unit on every line you priced, or clear that rate.",
      rateFrom: "New rates apply from",
      rateFromRequired: "Pick the date the new rates start.",
      // ── What the calendars are bounded by ───────────────────────────
      // Both bounds come from the server, computed by the same validators
      // the write path runs. The picker opens ON the earliest legal day
      // with everything before it disabled, so a refusal on submit is not
      // how the operator finds out where the boundary was — but a
      // disabled calendar with no explanation is its own puzzle, so each
      // one says why.
      endDateFloor: (date: string) =>
        `Cannot go below ${date}, this order's contracted end — ending it sooner is a termination, not an extension.`,
      rateFromFloor: (date: string) =>
        `Rates change only at a tenure boundary, never mid-tenure. The tenure in progress completes on ${date}, the earliest the new rates can start.`,
      // A rate cannot outlive the contract it prices.
      rateFromCeiling: "New rates must start before the new end date.",
    },
    terminate: {
      title: "Request termination",
      description:
        "Ask to end the rental early on an agreed date. Nothing changes until the rental manager approves it; then that day IS billed, unlike a return's set-off.",
      effectiveDate: "Effective date",
      reason: "Reason",
      submit: "Send for approval",
      waive: "Ask to waive the early-exit charge",
      waiveHelp:
        "Ending early raises an early-exit charge on the final invoice. The approver sees the amount and decides the waiver with the termination.",
    },
    hold: {
      title: "Hold order",
      description: "Pause billing on every holdable unit of this order.",
      fromDate: "Hold from",
      until: "Hold until (optional)",
      untilHelp: "Inclusive last held day. Leave blank for an open-ended hold.",
      // A hold starts after the rental's start date and after the last day
      // already billed (API: HOLD_NOT_AFTER_START / HOLD_IN_BILLED_PERIOD).
      fromHelp: (day: string) => `Must be after the start date and the billed-through date: ${day} or later.`,
      fromTooEarly: (day: string) => `A hold can start on ${day} at the earliest.`,
      reason: "Reason (optional)",
      submit: "Hold",
    },
    unhold: {
      title: "Unhold",
      description:
        "Resume billing. The held span is credited on the next invoice.",
      unholdDay: "Billing resumes",
      submit: "Unhold",
    },
  },
  // The compact agreement state CRM embeds on a deal / lead row. Lives
  // here rather than in CRM so the two surfaces cannot word a status
  // differently, and so adding a rental status needs one edit.
  inlineAgreement: {
    unconfigured: "No billing terms",
    unconfiguredHint: "Nothing bills until this order's rental terms are set.",
    loadFailed: "Could not load the agreement.",
    period: (from: string, to: string) => `${from} – ${to}`,
  },
  agreement: {
    loading: "Loading agreement…",
    notFound: "No rental agreement for that sales order",
    notFoundHint:
      "The order may not be a rental, or its billing terms were never configured.",
    unconfigured: "This order has no rental billing terms yet",
    unconfiguredHint:
      "Configure them before it can be approved, dispatched or billed.",
    configureCta: "Configure billing",
    tabs: {
      overview: "Overview",
      // Not "Line items": the agreement page shares the sales order's
      // layout, whose own Line Items tab sits beside this one.
      lines: "Billing cycles",
      devices: "Units",
      invoices: "Invoices",
      signatures: "Signatures",
    },
    // Shown above the tabs while a rejected agreement waits to be
    // reconfigured, so whoever opens it sees why it came back.
    rejected: {
      title: "These billing terms were rejected",
      on: "Rejected on",
      reconfigure: "Reconfigure",
    },
    facts: {
      soStatus: "Sales order",
      version: "Version",
      period: "Rental period",
      cadence: "Cadence",
      billedThrough: "Billed through",
      nextInvoice: "Next invoice",
      tenureTotal: "Total for the tenure",
      unitsOut: "Units on rent",
      approvedBy: "Approved by",
      approvedAt: "Approved on",
    },
    // Per-line billing cycle. An order states ONE cycle; a line may state
    // its own. Before this card existed the line's cycle was invisible —
    // the Overview said "Cadence: monthly" and there was nowhere to see
    // that one line on the order bills quarterly.
    lines: {
      title: "Line items and their billing cycles",
      help: "Each line bills on the order's cycle unless it states its own. Rental dates come from the sales order line; the cycle is set here.",
      empty: "This order has no rental lines",
      // Column headers.
      item: "Item",
      period: "Rental period",
      duration: "Duration",
      cycle: "Billing cycle",
      billedThrough: "Billed through",
      // Row values.
      inherited: "Order cycle",
      overridden: "Own cycle",
      // A line with no dates of its own bills on the ORDER's window —
      // `build_billing_settings` falls the window back independently of
      // the cadence (`terms.start_date or agreement.start_date`). So this
      // is "follows the order", not "broken".
      orderPeriod: "Order period",
      orderPeriodHint:
        "This line has no dates of its own, so it bills across the order's whole rental period. Give it its own dates on the sales order line.",
      dayOfMonth: (day: number) => `Day ${day} of the period`,
      months: (n: number) => (n === 1 ? "1 month" : `${n} months`),
      days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
      edit: "Change cycle",
      // The dialog.
      dialogTitle: "Billing cycle for this line",
      dialogDescription:
        "Leave it following the order's cycle, or give this line its own. A line's own cycle must be stated in full — a cycle without a billing mode is not a cycle.",
      modeFollow: "Follow the order's cycle",
      modeFollowHelp: "Changing the order's cycle later changes this line with it.",
      modeOwn: "Give this line its own cycle",
      modeOwnHelp: "This line keeps its cycle when the order's changes.",
      orderCycleIs: "The order bills ",
      submit: "Save cycle",
      failed: "Could not save the billing cycle",
      // Shown instead of the edit button once the line has been billed on
      // its current cycle. The row is not frozen — the backend allows the
      // change — but the operator should know the periods already invoiced
      // keep the cycle they were raised under.
      billedWarning:
        "This line has already been invoiced. A new cycle applies to future periods only; invoices already raised are unchanged.",
    },
    devices: {
      title: "Units on this agreement",
      empty: "No unit has been dispatched against this agreement yet",
      viewAll: "Open in device tracking",
    },
    invoices: {
      title: "Invoices raised",
      empty: "No invoice has been raised for this agreement yet",
      viewAll: "Open in the invoice register",
    },
    signatures: {
      title: "Signatures",
      empty: "Nobody has signed this version yet",
      // A signature recorded with the date left blank — it still counts as
      // signed; only the day is unknown.
      undated: "Date not given",
      document: "Signed document",
      documentHint:
        "The countersigned agreement — a PDF or a scan. One document covers every party on this version.",
      documentEmpty: "No signed document uploaded",
      uploadLabel: "Upload signed agreement",
      remove: "Remove",
      // Recording a signature. Until this existed the signatures list was
      // permanently empty and the agreement could never reach Active with
      // the hard check on — the endpoint shipped with no caller.
      record: "Record signature",
      recordTitle: "Record a signature",
      recordDescription:
        "Who signed this version of the agreement. Comprint signs as the logged-in user; the customer and any guarantor sign as contacts of the account.",
      partyLabel: "Signing party",
      nameLabel: "Signatory name",
      nameHelp:
        "Captured verbatim — it survives the user leaving or the contact being deleted, and a later rename does not rewrite who signed.",
      contactLabel: "Contact",
      contactHelp: "Required for the customer and a guarantor.",
      contactPlaceholder: "Select a contact",
      signedOnLabel: "Signed on",
      signedOnHelp: "Leave blank to record the signature as not yet dated.",
      submit: "Record",
      replaceWarning:
        "This party already has a signature on this version. Recording again replaces it, and both entries stay visible.",
      // Editing re-records the party: the API replaces the prior row, and
      // the change is audited.
      edit: "Edit",
      editAria: (party: string) => `Edit ${party} signature`,
      editTitle: "Edit signature",
      editDescription: "Correct this party's signature on this version of the agreement.",
      save: "Save changes",
      editNote: "Saving replaces this signature. The change is recorded in the audit trail.",
      editComprintNote:
        "Saving replaces this signature, and Comprint's signatory becomes you — Comprint always signs as the logged-in user.",
    },
  },
  // The rent the sales order was sold at (Σ qty × rate). The live monthly
  // rate is the units' sum and reads 0 until one ships (QA RM06/RM09).
  // Labelled plain "Monthly rent" since 2026-10-29 — no "expected" wording.
  expectedRate: {
    approveLabel: "Monthly rent",
    approveZero:
      "This sales order's rental lines carry no monthly rent, so the agreement would bill nothing. Amend the sales order to set a rate before approving.",
  },
} as const;
