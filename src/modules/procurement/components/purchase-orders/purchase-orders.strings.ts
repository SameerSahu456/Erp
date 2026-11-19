// User-facing copy for the procurement › purchase-orders sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, tab labels,
// column headers, and toast messages live here as one typed `as const` object
// instead of being hardcoded ("naked") in JSX/hooks. Components import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const PURCHASE_ORDERS_STRINGS = {
  // ── List page ──
  list: {
    title: "Purchase Orders",
    subtitle: "Track and manage vendor purchase orders through delivery.",
    breadcrumbs: {
      procurement: "Procurement",
      purchaseOrders: "Purchase Orders",
    },
    createButton: "Create PO",
    searchPlaceholder: "Search by PO number or notes...",
    stats: {
      totalPOs: "Total POs",
      open: "Open",
      partiallyReceived: "Partially Received",
      fullyReceived: "Fully Received",
      closed: "Closed",
      draft: "Draft",
      pendingApproval: "Pending Approval",
      rejected: "Rejected",
      cancelled: "Cancelled",
      totalOrderValue: "Total Order Value",
    },
    tabs: {
      all: "All",
      draft: "Draft",
      sent: "Sent",
      inProgress: "In Progress",
      received: "Received",
      closed: "Closed",
    },
    columns: {
      poNumber: "PO No",
      vendor: "Vendor",
      contactedTo: "Contacted To",
      warehouse: "Warehouse",
      items: "Items",
      ordered: "Ordered",
      received: "Received",
      pending: "Pending",
      returned: "Return",
      grandTotal: "Total",
      status: "Status",
      condition: "Condition",
      expectedDelivery: "Expected Delivery",
      createdBy: "Created By",
      createdAt: "Created At",
    },
    // Vendor + condition toolbar filters (status lives in the tab strip).
    filters: {
      vendor: "Vendor",
      allVendors: "All Vendor",
      condition: "Condition",
      allConditions: "All Conditions",
    },
    // Condition badge / filter-option labels (new vs refurbished goods).
    condition: {
      new: "New",
      refurbished: "Refurbished",
    },
    empty: {
      title: "No purchase orders yet",
      description:
        "Create a PO against a vendor to start tracking ordered, received, and pending quantities.",
      action: "Create PO",
    },
    error: {
      title: "Couldn't load purchase orders",
      description:
        "Something went wrong fetching the purchase order list. Please retry.",
    },
  },

  // ── PO Approvals queue ──
  approvals: {
    error: {
      title: "Couldn't load approvals",
      description:
        "Something went wrong fetching the approval queue. Please retry.",
    },
    loadFailed: "Failed to load purchase orders awaiting your approval.",

    // Approvals queue list page
    title: "PO Approvals",
    subtitle: "Purchase orders submitted for your category sign-off.",
    // Shared by the KPI stat tile and the single-tab label.
    awaitingLabel: "Awaiting my approval",
    columns: {
      poNumber: "PO#",
      supplier: "Supplier",
      myPendingLines: "My pending lines",
      total: "Total",
      submitted: "Submitted",
    },
    empty: {
      title: "Nothing awaiting your approval",
      description: "Purchase orders submitted to your categories will appear here.",
    },

    // PM-approvals inbox → real (backend-wired) Purchase Order tab
    // (RealPoApprovalsTab). Lists POs awaiting the current user's per-line
    // sign-off; distinct from the standalone approvals queue above.
    inboxTab: {
      empty: "No purchase orders awaiting your approval.",
      columns: {
        poNumber: "PO#",
        supplier: "Supplier",
        myPendingLines: "My pending lines",
        grandTotal: "Grand total",
        action: "Action",
      },
      review: "Review",
      prev: "Prev",
      next: "Next",
      // `Page 2 of 5`
      pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    },

    // Focused single-PO approval card (per-line approve / reject)
    card: {
      notFoundTitle: "Purchase order not found",
      backToApprovals: "Back to approvals",
      cardTitle: "Lines awaiting your approval",
      lineFallback: "Line",
      // `Approve all mine (3)`
      approveAllMine: (n: number) => `Approve all mine (${n})`,
      // `Your lines total ₹1,200 · PO total ₹3,400`
      totals: (yourTotal: string, poTotal: string) =>
        `Your lines total ${yourTotal} · PO total ${poTotal}`,
      // Summary-header labels (SO-approval-panel styling).
      yourLinesTotal: "Your lines total",
      poTotal: "PO total",
      columns: {
        item: "Item",
        qty: "Qty",
        unitPrice: "Unit Price",
        tax: "Tax",
        lineTotal: "Line Total",
        approval: "Approval",
      },
    },
  },

  // ── Detail page ──
  detail: {
    notFoundTitle: "Purchase Order not found",
    loadFailed: "Something went wrong loading this purchase order.",
    notFoundDescription: "The purchase order you are looking for does not exist.",
    backToPOs: "Back to Purchase Orders",

    // Shared reject-line note prompt (LineApprovalCell + PoPendingChanges)
    rejectionReasonPlaceholder: "Reason for rejection (required)…",

    // Quick-info strip labels
    infoStrip: {
      vendor: "Vendor",
      expectedDelivery: "Expected Delivery",
      payment: "Payment",
      createdBy: "Created By",
      fulfilment: "Fulfilment",
    },

    // PO detail tabs — the PO's line items plus everything received / returned
    // against it (GRNs, the devices those GRNs inwarded, purchase returns).
    tabs: {
      lineItems: "Line items",
      vendor: "Vendor",
      documents: "Documents",
      grns: "GRNs",
      devices: "Devices",
      returns: "Returns",
    },

    // Line-items tab column headers
    lineItemsTable: {
      hash: "#",
      partNo: "Part no",
      partName: "Part Name",
      ordered: "Ordered",
      received: "Received",
      unitPrice: "Unit Price",
      tax: "Tax",
      amount: "Amount",
    },

    // BOM inline expansion
    bom: {
      hideBom: "Hide BOM",
      viewBom: "View BOM",
      noComponents: "This BOM has no components configured.",
      componentCount: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
      // BOM component sub-table headers
      subTableLineItems: "Line items",
      subTablePartNo: "Part NO",
      subTableQty: "Qty",
      optional: "Optional",
    },

    // Vendor tab
    vendor: {
      phone: "Phone",
      address: "Address",
      gstNumber: "GST Number",
      paymentTerms: "Payment Terms",
      notAvailable: "Vendor details not available.",
      // `N% on-time` — delivery rate label
      onTimeDelivery: (rate: number) => `${rate}% on-time`,
    },

    // Documents tab
    documents: {
      cardTitle: "Documents",
      empty: "No documents attached",
      emptyHint: "Attach PO documents, invoices, and delivery receipts.",
      uploadHint: "Upload supplier invoice / documents · PDF, JPG, or PNG · you can select multiple",
      addMoreHint: "Add more documents · PDF, JPG, or PNG",
      uploading: "Uploading…",
      uploadButton: "Upload",
      // Shown under the drop-zone on the create form, where files attach after save.
      stagedNote: "Files upload to the purchase order after you save.",
      viewButton: "View",
      openFailed: "Could not open the document",
      removeTitle: "Remove document?",
      removeDescription: (name: string) => `“${name}” will be removed from this purchase order.`,
      removeConfirm: "Remove",
      removeAriaLabel: "Remove document",
    },

    // Order Details card (right rail)
    orderDetails: {
      cardTitle: "Order Details",
      prRef: "PR Ref",
      salesOrder: "Sales Order",
      deliveryTerms: "Delivery Terms",
      otherReferences: "Other References",
      sentDate: "Sent Date",
      approvedBy: "Approved By",
      // Popover columns when a PO has multiple approvers.
      approverSrNo: "Sr. No.",
      approverPm: "PM",
      created: "Created",
    },

    // Fulfilment Progress card
    fulfilmentProgress: {
      cardTitle: "Fulfilment Progress",
      // `N/M units` — received/ordered summary
      units: (received: number, ordered: number) => `${received}/${ordered} units`,
    },

    // Amendment History card
    amendmentHistory: {
      cardTitle: "Amendment History",
      currentRevision: "Current version",
      // `<by> on <date>` — used in version history rows
      amendedByOn: (by: string, date: string) => `${by} on ${date}`,
    },

    // Notes card
    notes: {
      cardTitle: "Notes",
    },

    // Action buttons
    actions: {
      sendToVendor: "Send to Vendor",
      markReceived: "Mark Received",
      createPO: "Create PO",
      updatePO: "Update PO",
      approveAllMine: "Approve all mine",
      edit: "Edit",
      clone: "Clone",
      downloadPO: "Download PO",
      closePO: "Close PO",
      cancelPO: "Cancel PO",
      amend: "Amend",
      print: "Print",
      preview: "Preview",
      closeBlockedByAmendment: "Resolve or withdraw the open amendment before closing",
    },

    // Returns tab (return-to-vendor audit trail) + per-line Returned column
    returns: {
      cardTitle: "Returns",
      columns: {
        pretNumber: "PRET Number",
        units: "Units",
        replaced: "Replaced",
        refunded: "Refunded",
        status: "Status",
        credit: "Credit",
        created: "Created",
      },
      empty: "No returns have been raised against this PO.",
      // `2 refund, 1 replace, 1 undecided` — built from the non-zero parts.
      dispositionSummary: (
        refund: number,
        replace: number,
        undecided: number,
      ) =>
        [
          refund > 0 ? `${refund} refund` : null,
          replace > 0 ? `${replace} replace` : null,
          undecided > 0 ? `${undecided} undecided` : null,
        ]
          .filter(Boolean)
          .join(", ") || "—",
      // Per-line `Refunded` tooltip — still shows the full split so the user
      // can see refunded vs replace vs undecided behind the headline count.
      lineTooltip: (refund: number, replace: number, undecided: number) =>
        [
          refund > 0 ? `${refund} refund` : null,
          replace > 0 ? `${replace} replace` : null,
          undecided > 0 ? `${undecided} undecided` : null,
        ]
          .filter(Boolean)
          .join(", ") || "No returns on this line",
      statusLabels: {
        raised: "Raised",
        partially_dispatched: "Partially dispatched",
        dispatched: "Dispatched",
        closed: "Closed",
        cancelled: "Cancelled",
      },
    },

    // Credit banner (tax-inclusive vendor credit owed, when credit_total > 0)
    creditBanner: {
      // `Credit due: ₹2,360`
      due: (total: string) => `Credit due: ${total}`,
      // `₹0 settled, ₹2,360 pending`
      breakdown: (settled: string, pending: string) =>
        `${settled} settled, ${pending} pending`,
      // `(₹2,000 base + ₹360 GST)`
      baseGst: (base: string, gst: string) => `(${base} base + ${gst} GST)`,
      settle: "Settle",
    },

    // Close dialog (terminal action; short close when pending qty remains)
    closeDialog: {
      title: (poNumber: string) => `Close ${poNumber}?`,
      fullyReceivedBody:
        "All ordered units have been received. Closing ends this PO's lifecycle — no further amendments or receipts.",
      shortCloseBody: (pending: number) =>
        `${pending} unit(s) are still pending. Closing now is a short close — the remaining quantity will never arrive against this PO. Amend the PO instead if more stock is expected.`,
      pendingLinesTitle: "Lines with pending quantity",
      notesLabel: "Reason (required for short close)",
      notesOptionalLabel: "Notes (optional)",
      notesPlaceholder: "Why is this PO being closed without amendment?",
      notesRequiredError: "A reason is required when pending quantity remains.",
      confirm: "Close PO",
      cancel: "Keep open",
      // Hard blocks — a PO cannot close while returns are unresolved. The
      // server enforces both; these mirror its messages so the dialog explains
      // exactly why Confirm is disabled.
      blockedUndecided: (units: number) =>
        `${units} returned unit${units === 1 ? " is" : "s are"} awaiting a disposition decision.`,
      blockedUnsettled: (units: number, credit: string) =>
        `${units} returned unit${units === 1 ? " has" : "s have"} unsettled credit totalling ${credit}.`,
      blockedLinkResolve: "Resolve the return",
      blockedLinkSettle: "Settle or waive the credit",
    },

    // Cancel dialog (PO created in error — zero receipts only)
    cancelDialog: {
      title: (poNumber: string) => `Cancel ${poNumber}?`,
      body: "Cancelling marks this PO as created in error. It is only possible while nothing has been received.",
      notesLabel: "Reason (required)",
      notesPlaceholder: "Why is this PO being cancelled?",
      notesRequiredError: "A reason is required to cancel a PO.",
      confirm: "Cancel PO",
      cancel: "Keep PO",
    },

    // Closure card (closed / cancelled POs)
    closure: {
      closedTitle: "Closed",
      shortClosedTitle: "Short Closed",
      cancelledTitle: "Cancelled",
      byOn: (by: string, date: string) => `${by} on ${date}`,
      noNotes: "No notes recorded.",
    },

    // Amendment-rejection callout (shown when the latest amendment was rejected)
    amendmentRejection: {
      title: "Amendment rejected",
      revision: (version: number) => `v${version}`,
      rejectedOn: (date: string) => `Rejected on ${date}`,
      reasonLabel: "Reason",
      noReason: "No reason was provided.",
      // Intro line above the reason(s) — plain, reassuring, actionable.
      lead: "Your proposed changes were not applied. The live order is unchanged. Review the reason below, then amend again.",
      // Shown before a per-line reason when different lines cite different reasons.
      forLine: (line: string) => `For ${line}`,
    },

    // Version badge
    rev: (version: number) => `v${version}`,
    revCreate: (version: number) => `Create v${version}`,
    // Status badge on each revision in the version trail. "Baseline" is the
    // original issued order (v1); an approved amendment reads "Approved" (it was
    // approved and applied); a discarded one reads "Rejected".
    versionStatus: {
      draft: "Draft",
      pending: "Pending",
      rejected: "Rejected",
      baseline: "Baseline",
      approved: "Approved",
    },
    // BOM component count suffix (pluralised)
    componentCount: (n: number) => `${n} component${n === 1 ? "" : "s"}`,

    // `Version 2` — version chip / version-trail row heading.
    versionLabel: (n: number) => `Version ${n}`,

    // Header quick-info grid (InfoCard) labels.
    infoCards: {
      vendor: "Vendor",
      contactedTo: "Contacted To",
      warehouse: "Warehouse",
      expectedDelivery: "Expected Delivery",
      payment: "Payment",
      createdBy: "Created By",
      fulfillment: "Fulfillment",
    },

    // Condition badge on the detail header.
    conditionBadge: {
      new: "New",
      refurbished: "Refurbished",
    },

    // Stacked card section titles.
    sectionTitles: {
      lineItems: "Line items",
      total: "Total",
      subtotal: "Subtotal",
      tax: "Tax",
      versionHistory: "Version history",
    },

    // GRNs tab — every inward batch received against this PO.
    grns: {
      columns: {
        grnNumber: "GRN Number",
        warehouse: "Warehouse",
        units: "Units",
        receivedBy: "Received By",
        status: "Status",
        created: "Created",
      },
      empty: "No GRNs have been received against this PO yet.",
      loadFailed: "Couldn't load GRNs for this PO.",
    },

    // Devices tab — every unit inwarded on any of this PO's GRNs.
    devices: {
      columns: {
        serial: "Serial",
        product: "Product",
        grn: "GRN",
        warehouse: "Warehouse",
        stage: "Stage",
        status: "Status",
      },
      empty: "No devices have been inwarded against this PO yet.",
      noMatches: "No devices match these filters.",
      loadFailed: "Couldn't load devices for this PO.",
      filters: {
        searchPlaceholder: "Search serial, part code or name",
        allGrns: "All GRNs",
        allLineItems: "All line items",
        allStatuses: "All statuses",
        receivedDate: "Received date",
        allEngineers: "All engineers",
        searchEngineer: "Search engineer",
        clear: "Clear filters",
        clearSearch: "Clear search",
      },
      // Stage quick tabs above the table (counts follow the other filters).
      stageTabs: {
        ariaLabel: "Filter devices by stage",
        all: "All",
      },
    },

    // Rejected-PO callout (shown above the line items when the PO was rejected).
    rejectedCallout: {
      title: "Purchase order rejected",
      body: "This purchase order was rejected. Review the reason below, then amend to resubmit.",
      reasonLabel: "Reason",
    },

    // Line-items table (detail view).
    lineTable: {
      columns: {
        srNo: "Sr. No.",
        item: "Item",
        category: "Category",
        description: "Description",
        ordered: "Ordered",
        received: "Received",
        pending: "Pending",
        returned: "Returned",
        unitPrice: "Unit price",
        tax: "Tax",
        amount: "Amount",
        status: "Status",
        action: "Action",
      },
      amendmentRejected: "Amendment rejected",
      proposed: (changes: string) => `Proposed: ${changes}`,
      reason: (reason: string) => `Reason: ${reason}`,
    },

    // Pending-amendment card (PoPendingChanges).
    pending: {
      lineItems: "Line items",
      notes: "Notes",
      badgeDraft: "Amended · Draft",
      badgePending: "Amended · Pending approval",
      helperActionable:
        "Awaiting your approval — approve or reject each amended line. Receiving continues on the live order until then.",
      helperSubmitted:
        "Submitted for approval. Receiving continues on the live order until the PM acts.",
      edit: "Edit",
      cancelAmendment: "Cancel amendment",
      submitForApproval: "Submit for approval",
      submitting: "Submitting…",
      columns: {
        srNo: "Sr. No.",
        item: "Item",
        category: "Category",
        description: "Description",
        qty: "Qty",
        unitPrice: "Unit price",
        tax: "Tax",
        amount: "Amount",
        approval: "Approval",
      },
      removed: "Removed",
      added: "Added",
      rejectDialog: {
        title: "Reject line",
        body: "Rejecting any amended line rejects the whole amendment — the live order is left unchanged. Add a reason so the maker can revise it.",
        cancel: "Keep it",
        confirm: "Reject line",
      },
    },

    // Version trail (PoVersionTrail).
    versionTrail: {
      lineCount: (n: number) => `${n} line${n === 1 ? "" : "s"}`,
      download: "Download",
      downloadVersion: (n: number) => `Download Version ${n} of this PO`,
      paymentTerms: "Payment Terms",
      deliveryTerms: "Delivery Terms",
      otherReferences: "Other References",
      notes: "Notes",
      noLines: "No lines recorded for this revision.",
      // Per-revision line table (VersionLineTable) column headers.
      columns: {
        item: "Item",
        category: "Category",
        description: "Description",
        qty: "Qty",
        unitPrice: "Unit Price",
        tax: "Tax",
        lineTotal: "Line Total",
      },
    },

    // Per-line approval control (LineApprovalCell + LineApproval buttons).
    lineApproval: {
      status: {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
      },
      approve: "Approve",
      reject: "Reject",
      rejectDialog: {
        title: "Reject line",
        body: "Rejecting any line rejects the whole purchase order. Add a reason so the procurement team can fix it.",
        cancel: "Cancel",
        confirm: "Reject line",
      },
    },
  },

  // ── PO Preview dialog ──
  preview: {
    dialogTitle: "PO Preview",
    date: (d: string) => `Date: ${d}`,
    sent: (d: string) => `Sent: ${d}`,
    companyName: "Comprint Technologies",
    companyLocation: "Bengaluru, India",
    vendorLabel: "Vendor",
    // Table column headers
    hash: "#",
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit Price",
    amount: "Amount",
    // Totals
    subtotal: "Subtotal",
    tax: "Tax",
    discount: "Discount",
    grandTotal: "Grand Total",
  },

  // ── Amend dialog ──
  amend: {
    // `Amend PO-2026-001?`
    title: (poNumber: string) => `Amend ${poNumber}?`,
    // `The current state will be snapshotted as vN, and you will edit a new vN+1. The PO number stays the same.`
    description: (currentVersion: number) =>
      `The current state will be snapshotted as v${currentVersion}, and you will edit a new v${currentVersion + 1}. The PO number stays the same.`,
    reasonLabel: "Reason",
    reasonOptional: "(optional)",
    reasonPlaceholder:
      "e.g., Vendor extended volume discount after full upfront payment",
    cancel: "Cancel",
    confirm: (nextVersion: number) => `Create v${nextVersion}`,
  },

  // ── Create / edit PO form ──
  form: {
    titleCreate: "Create Purchase Order",
    titleEdit: "Edit Draft Purchase Order",
    subtitle: "Pick a warehouse and vendor, add line items, and create the PO.",

    // Card section headers
    sections: {
      warehouseVendor: "Warehouse & Vendor",
      lineItems: "Line Items",
      termsNotes: "Terms & Notes",
      orderSummary: "Order Summary",
    },

    // Line-items table column headers
    columns: {
      srNo: "Sr. No.",
      partNo: "Part no",
      partName: "Part Name",
      category: "Category",
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      tax: "Tax %",
      amount: "Amount",
    },

    // Bill-of-Materials sub-editor (BomPanel) under a BOM-eligible line.
    bom: {
      title: "Bill of Materials",
      componentCount: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
      addComponent: "Add Component",
      removeComponent: "Remove component",
    },

    // Warehouse & Vendor card
    warehouse: {
      label: "Warehouse",
      placeholder: "Select a warehouse",
      searchPlaceholder: "Search warehouses…",
    },
    vendor: {
      label: "Vendor",
      placeholder: "Select a vendor",
      searchPlaceholder: "Search vendors…",
    },
    contact: {
      label: "Contacted To",
      placeholder: "Select the contact person",
      placeholderNoVendor: "Select a vendor first",
      searchPlaceholder: "Search contacts…",
    },
    condition: {
      label: "Condition",
      new: "New",
      refurbished: "Refurbished",
      helper: "Goods received against this PO must match its condition.",
      switchTitle: "Are you sure?",
      // `Switching this PO from New to Refurbished will clear the line items…`
      switchDescription: (from: string, to: string) =>
        `Switching this PO from ${from} to ${to} will clear the line items you've added below, since they were entered for a ${from} PO. The list resets to the default. Continue?`,
      switchConfirm: "Yes, clear line items",
      switchCancel: "Keep current",
    },

    // Line Items card
    lineItems: {
      hsnTaxTitle: "Set by the HSN code on this part",
      emptyTitle: "No line items yet",
      emptyDescription: "Add at least one item to create this purchase order.",
      addLineItem: "Add Line Item",
      categoryPlaceholder: "Select category",
      descriptionPlaceholder: "Add description...",
      removeLine: "Remove line",
      // Fallback name for an offending line in the mismatch hint below.
      lineFallback: "line",
      // `New PO — some lines don't match`
      mismatchTitle: (condition: string) => `${condition} PO — some lines don't match`,
      mismatchHint: "Remove or replace these before saving: ",
    },

    // Terms & Notes card
    termsNotes: {
      paymentTermsLabel: "Payment Terms",
      paymentTermsPlaceholder: "e.g. Net 30, Advance, COD",
      deliveryTermsLabel: "Delivery Terms",
      deliveryTermsPlaceholder: "e.g. FOB, CIF, Ex-Works",
      otherReferencesLabel: "Other References",
      otherReferencesPlaceholder: "e.g. Quote no., contact person",
      expectedDeliveryLabel: "Expected Delivery Date",
      notesLabel: "Notes",
      notesPlaceholder: "Additional notes for the vendor…",
      // `12/50` — live character counter under a max-length text field (§9).
      charCounter: (used: number, max: number) => `${used}/${max}`,
    },

    // Order Summary card
    orderSummary: {
      lineItems: "Line items",
      totalUnits: "Total units",
      expectedDelivery: "Expected delivery",
      subtotal: "Subtotal",
      tax: "Tax",
      total: "Total",
    },

    // Footer action buttons
    actions: {
      cancel: "Cancel",
      saveDraft: "Save Draft",
      saving: "Saving…",
      saveChanges: "Save changes",
      creating: "Creating…",
      createPO: "Create PO",
    },
  },

  // ── Amend PO form (Flow B — stage an amendment of an issued PO) ──
  amendForm: {
    titleCreate: "Amend Purchase Order",
    titleEdit: "Edit Staged Amendment",
    // `PO-2026-001 · adjust quantities, add lines, or remove lines with no receipts.`
    subtitle: (poNumber: string) =>
      `${poNumber} · adjust quantities, add lines, or remove lines with no receipts.`,

    // Card section headers
    sections: {
      warehouseVendor: "Warehouse & Vendor",
      lineItems: "Line Items",
      termsNotes: "Terms & Notes",
      orderSummary: "Order Summary",
    },

    // Locked read-only context fields (an amendment changes only lines)
    readOnly: {
      warehouse: "Warehouse",
      vendor: "Vendor",
      contactedTo: "Contacted To",
      condition: "Condition",
    },
    condition: {
      new: "New",
      refurbished: "Refurbished",
    },

    // Line-items table column headers
    columns: {
      srNo: "Sr. No.",
      partNo: "Part no",
      partName: "Part Name",
      category: "Category",
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      tax: "Tax %",
      amount: "Amount",
    },

    // Line Items card
    lineItems: {
      // Contextual note above the table — differs when re-editing a staged draft.
      noteEditing:
        "Saving updates the staged draft — it still needs to be submitted for approval.",
      noteFresh:
        "This stages an editable draft you review, then submit for approval — receiving continues on the live order meanwhile.",
      emptyTitle: "No line items yet",
      emptyDescription: "Add at least one item to amend this purchase order.",
      addLineItem: "Add Line Item",
      categoryPlaceholder: "Select category",
      descriptionPlaceholder: "Add description...",
      removeLine: "Remove line",
      // `Can't remove — 3 already received`
      removeLockedTitle: (received: number) => `Can't remove — ${received} already received`,
      // `Already received 3. Quantity can't be lower.`
      qtyLockedTitle: (received: number) =>
        `Already received ${received}. Quantity can't be lower.`,
      // `3 received`
      receivedCount: (received: number) => `${received} received`,
      bomHide: "Hide BOM",
      bomAdd: "Add BOM",
      bomToggleTitle: "BOM is captured in the UI; not yet saved by the API",
    },

    // Terms & Notes card
    termsNotes: {
      paymentTermsLabel: "Payment Terms",
      paymentTermsPlaceholder: "e.g. Net 30, Advance, COD",
      deliveryTermsLabel: "Delivery Terms",
      deliveryTermsPlaceholder: "e.g. FOB, CIF, Ex-Works",
      otherReferencesLabel: "Other References",
      otherReferencesPlaceholder: "e.g. Quote no., contact person",
      notesLabel: "Notes",
      notesPlaceholder: "Additional notes for the vendor…",
    },

    // Order Summary card
    orderSummary: {
      lineItems: "Line items",
      totalUnits: "Total units",
      expectedDelivery: "Expected delivery",
      subtotal: "Subtotal",
      tax: "Tax",
      total: "Total",
    },

    // Footer action buttons
    actions: {
      cancel: "Cancel",
      saving: "Saving…",
      saveDraft: "Save draft",
      stageAmendment: "Stage amendment",
    },
  },

  // ── Toast messages ──
  toast: {
    created: "Purchase order created",
    submittedForApproval: "Submitted for approval",
    approved: "Approved",
    rejected: "Rejected",
    cloned: "Purchase order cloned",
    reopenedForAmendment: "Reopened for amendment",
    closed: "Purchase order closed",
    cancelled: "Purchase order cancelled",
    amendmentDrafted: "Amendment drafted — review, then submit for approval",
    draftUpdated: "Draft updated",
    amendmentUpdated: "Amendment updated",
    amendmentSubmitted: "Amendment submitted for approval",
    amendmentCancelled: "Amendment cancelled",
    amendCreated: (poNumber: string, version: number) =>
      `${poNumber} — v${version} created`,
  },
} as const
