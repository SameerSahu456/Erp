/** Device tracking and device detail copy (§16.12). */
export const DEVICE_STRINGS = {
  detail: {
    title: "Rented unit",
    forbiddenTitle: "No access to this unit",
    forbidden: "You don't have permission to view this rented unit.",
    loadError: "Could not load this unit.",
    gst: (pct: number) => `${pct}%`,
  },
  dialogs: {
    extending: "Extending…",
    extendFailed: "Could not extend this unit.",
  },
  delivered: {
    action: "Record delivery",
    title: "Record delivery",
    field: "Delivered on",
    help:
      "The day this unit reached the customer. Billing moves to this date " +
      "from the dispatch estimate.",
    failed: "Could not record the delivery.",
  },
  deviceDetail: {
    detailsCard: "Device Details",
    descriptionCard: "Description",
    noDescription: "No description.",
    notFound: "This unit does not exist, or has been removed.",
    fields: {
      partNumber: "Part number",
      category: "Category",
      serialNumber: "Serial number",
      manufacturerSerial: "Manufacturer serial",
      account: "Account",
      salesOrder: "Sales order",
      rate: "Rate / month",
      gst: "GST",
      dispatched: "Dispatched",
      delivered: "Delivered",
      billingStart: "Billing starts",
      contractEnd: "Contract end",
      returnDate: "Return date",
      previouslyBilled: "Previously billed",
      daysRemaining: "Days remaining",
      lastHeldDate: "Last held date",
      totalHeldDays: "Total held days",
      replacedBy: "Replaced by",
    },
    // The estimate is not a promise — say which it is, so nobody reads a
    // grace-window date as a confirmed delivery.
    billingStartEstimated: "Estimated from dispatch",
    billingStartDelivered: "From recorded delivery",
    days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
  },
  activity: {
    title: "Activity",
    subtitle: (name: string) => `Everything recorded against ${name}.`,
    empty: "Nothing recorded against this unit yet.",
    loading: "Loading activity…",
    failed: "Could not load activity.",
    // The audit trail is gated on `audit:read`, which is granted to no
    // role today — only superusers pass. Say so plainly rather than
    // rendering an empty panel that reads as "nothing ever happened".
    forbidden: "You do not have permission to view this unit's history.",
    system: "System",
    meta: (actor: string, date: string, time: string) => `${actor} · ${date}, ${time}`,
    // The period the action covered, under its message.
    span: (from: string, to: string, days: string) => `${from} → ${to} · ${days}`,
    spanOngoing: (from: string) => `From ${from} · ongoing`,
    on: (day: string) => `On ${day}`,
  },
  history: {
    action: "History",
    title: "Unit history",
    // Says what the dialog covers, because it is wider than the page
    // behind it: the page is one rental, this is the physical unit.
    subtitle: (serial: string, rentals: number) =>
      rentals > 1
        ? `${serial} — across ${rentals} rentals, newest first.`
        : `${serial} — newest first.`,
    empty: "Nothing recorded for this unit yet.",
    loading: "Loading history…",
    failed: "Could not load this unit's history.",
    unserialised:
      "This unit has no serial number recorded, so it cannot be matched to earlier rentals.",
    kinds: {
      rental: "Rented",
      rate_change: "Rate changed",
      replacement: "Replaced",
    },
    rateFrom: (rate: string) => `${rate} / month`,
    period: (from: string, to: string) => `${from} → ${to}`,
    ongoing: "ongoing",
    parties: (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · "),
  },
  // Where the fleet's identity links disagree with reality. `unlinked` is
  // the cutover progress metric and is rendered apart from the four
  // defects — a card showing 13,637 beside four zeroes under one
  // "problems" heading would read as a catastrophe on day one.
  reconcile: {
    title: "Device identity",
    loading: "Checking the fleet…",
    failed: "Could not check the fleet.",
    clean: "No defects",
    hasDefects: "Needs attention",
    unlinked: "Not yet linked to a warehouse unit",
    unlinkedHint:
      "Migrated units that were never in IMS. Each one links itself when it physically comes back and is received. Reaching zero means the legacy book has fully converged.",
    noSerialNoLink: "Cannot be returned",
    noSerialNoLinkHint:
      "No link and no serial, so a receipt cannot place the unit at all — it will sit as Overdue and never settle.",
    orphanStockItem: "Warehouse unit missing",
    orphanStockItemHint:
      "Linked to a unit IMS has deleted or scrapped while it is still with a customer.",
    statusDisagreement: "IMS says available",
    statusDisagreementHint:
      "IMS believes a rented machine is available stock.",
    doubleLet: "On rent twice",
    doubleLetHint: "One physical unit is on rent to two customers.",
    progress: (unlinked: number, live: number) =>
      `${unlinked.toLocaleString()} / ${live.toLocaleString()}`,
  },
  devices: {
    tabs: {
      all: "All",
    },
    // Filter names, shown as placeholders while nothing is picked.
    statusFilter: {
      label: "Status",
      many: (count: number) => `${count} statuses`,
    },
    accountFilter: {
      label: "Account",
    },
    returnRangePlaceholder: "Contract end",
    title: "Device tracking",
    description: "Every rented unit, and how long it has left.",
    empty: "No units are being tracked yet.",
    emptyHint: "Units are provisioned when a rental sales order is dispatched.",
    loadError: "Could not load tracked units.",
    kpis: {
      out: "Units on rent",
      outSub: (total: number) => `of ${total} tracked`,
      dueSoon: "Alert",
      dueSoonSub: "due back within 7 days",
      overdue: "Overdue",
      overdueSub: "past return date",
      onHold: "On hold",
      onHoldSub: "not billing",
      settled: "Settled",
      settledSub: "returned & billed",
    },
    hold: "Hold",
    unhold: "Unhold",
    /** Days remaining until a unit's contract end, spelled out.
     *
     *  `contracted_end_date` is the INCLUSIVE last rental day, so 0 means
     *  the contract ends today — "0 days left" would read as though the unit
     *  were already late. Singular is handled so a unit never reads
     *  "1 days left".
     */
    daysLeft: (n: number) => {
      if (n === 0) return "Due today";
      const magnitude = Math.abs(n);
      const unit = magnitude === 1 ? "day" : "days";
      return n < 0 ? `${magnitude} ${unit} over` : `${magnitude} ${unit} left`;
    },
    columns: {
      part: "Part",
      serial: "Serial",
      // The OEM label (Dell / HP …) on the linked stock unit.
      manufacturerSerial: "Mfr serial",
      account: "Account",
      salesOrder: "SO no",
      status: "Status",
      rate: "Monthly rent",
      daysRemaining: "Days remaining",
      dispatched: "Dispatch date",
      contractEnd: "Contract end",
      returnDate: "Return date",
      actions: "Action",
    },
    actionsLabel: "Actions",
    extend: "Extend",
    return: "Return",
    replace: "Replace",
    settledNoActions: "This unit is off rent — no actions available.",
    // `pendingFlow` is gone: the Return item it disabled is wired now.
    // The settlement hook it was waiting for (`on_units_returned`, fired
    // by the WMS GRN close) exists, so the action leads somewhere.
    //
    // Raising the return is WMS's job, not a rentals form — the register
    // picks the units, takes the condition and carries the GRN that
    // physically books the goods back in. Rentals only settles the money
    // when that GRN closes.
    // The defensive branch only: a caller that passes no `onReturn` has
    // no way to route, so the item disables with a reason rather than a
    // click that silently does nothing. Phrased as a refusal because
    // that is what a disabled tooltip is — `Item` has no affordance for
    // a hint on an ENABLED entry.
    returnUnavailable: "Not available here — open the unit's order to raise a return.",
    // Hold and Resume used to fire straight from the menu click, always
    // on TODAY. The API has always taken a from/until/reason and an
    // explicit resume day; nothing sent them, so a hold reported last
    // week could not be backdated and the dates were invisible at the
    // moment of acting.
    holdDialog: {
      title: "Put this unit on hold",
      description:
        "A held unit stops earning rent for the days it is held. The credit is settled when you resume it.",
      fromLabel: "Hold from",
      fromHelp: "First day the unit stops being charged for.",
      untilLabel: "Planned last held day (optional)",
      untilHelp:
        "Leave blank for an open-ended hold — the usual case, ended by resuming the unit.",
      reasonLabel: "Reason (optional)",
      reasonPlaceholder: "Why is this unit off rent?",
      inverted: "The last held day cannot be before the hold starts.",
      // After its start date and the days already billed (HOLD_NOT_AFTER_START /
      // HOLD_IN_BILLED_PERIOD), and not before dispatch (HOLD_BEFORE_DISPATCH).
      fromHelpEarliest: (day: string) =>
        `First day the unit stops being charged for — after its start date and the days already billed: ${day} or later.`,
      fromTooEarly: (day: string) => `This unit can be held from ${day} at the earliest.`,
      submit: "Put on hold",
      submitting: "Holding…",
      failed: "Could not put this unit on hold.",
    },
    resumeDialog: {
      title: "Resume billing on this unit",
      description:
        "Pick the day rent starts again. The day before it is the last day held.",
      heldSince: "Held since",
      plannedUntil: "Planned until",
      openEnded: "Open-ended",
      // Was "Credit days accrued" / "Credit accrued", read straight off
      // `device.hold_days` / `hold_credit`. Both are written ONLY inside
      // `release_hold`, so during an OPEN hold they hold the total from
      // PREVIOUS released holds — zero for a first hold. The dialog
      // showed "0 days / ₹0" next to "Held since 1 Sep", at the exact
      // moment the operator is choosing the resume date.
      //
      // Computed from the picker instead, which is both truthful and the
      // number they actually want: it moves as they change the date.
      daysBeingCredited: "Days being credited",
      daysBeingCreditedHelp: "Hold start up to, but not including, the resume day.",
      // Only shown when non-zero — a unit held before and resumed
      // carries a real running total that the next invoice still owes.
      previouslyCredited: "Previously credited",
      resumeLabel: "Resume billing on",
      resumeHelp:
        "The day rent starts again — this day IS charged, the day before it is the last held one. A past date is fine.",
      // Says which `release_hold` case applies, so the operator is not
      // guessing whether the next invoice will come out right.
      billingNote:
        "If no invoice was raised during the hold, the whole held span accrues as credit and the next invoice bills from the unchanged anchor and subtracts it. If an invoice already covered part of the hold, those paid days are not handed back — only the unbilled tail is affected.",
      cancelsHold:
        "Resuming on or before the day the hold began cancels it instead: no days are credited, because the unit was never actually off rent.",
      submit: "Resume billing",
      submitting: "Resuming…",
      failed: "Could not resume billing on this unit.",
    },
    replaceAlreadyPending:
      "This unit already has a replacement in progress — confirm or " +
      "cancel it first.",
    // Extend IS built, but at ORDER level (§10.2 moves the whole
    // contract's end date). Saying "not built" here would be wrong.
    extendDialog: {
      title: "Extend unit",
      help:
        "Moves this unit's return date, its own order line, and the " +
        "order's end date together. Forward only — ending sooner than " +
        "the order was originally contracted for is a termination.",
      endDate: "New end date",
      endDateHelp: "The unit's new inclusive last rental day.",
      rate: "New monthly rent (optional)",
      ratePlaceholder: "Leave blank to keep the current rate",
      rateFrom: "New rate applies from",
      rateFromHelp:
        "Rates never change mid-tenure, so this must fall on or after " +
        "the current tenure's completion, and before the new end date. A " +
        "new rate needs approval: nothing changes, including the end date, " +
        "until it is approved.",
      rateFromTooLate: "The new rate must start before the new end date.",
    },
    unholdBlocked:
      "Lifted by confirming or cancelling the replacement, not by a plain un-hold.",
  },
} as const;
