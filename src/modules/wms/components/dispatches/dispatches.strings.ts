// User-facing copy for the WMS › dispatches sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (see `toast.saved`).
export const DISPATCH_STRINGS = {
  breadcrumbs: {
    wms: 'WMS',
    dispatches: 'Dispatches',
    new: 'New',
  },

  list: {
    title: 'Dispatch Requests',
    subtitle:
      'Outbound dispatches from Material Issue — track status, source document, and operator variance.',
    createButton: 'Create Dispatch Request',
    searchPlaceholder: 'Search by dispatch number…',
    columns: {
      dispatchNumber: 'Dispatch No',
      dispatchType: 'Type',
      source: 'Source',
      account: 'Account',
      status: 'Status',
      variance: 'Variance',
      warehouse: 'From Warehouse',
      dispatched: 'Dispatched At',
    },
    tabs: {
      all: 'All',
      draft: 'Draft',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    filters: {
      dispatchType: 'Type',
      allTypes: 'All types',
      warehouse: 'Warehouse',
      allWarehouses: 'All warehouses',
    },
    varianceNone: 'None',
    varianceChanges: (count: number) => `${count} change${count === 1 ? '' : 's'}`,
    needsItems: 'Needs items',
    empty: {
      title: 'No Dispatch Requests Yet',
      description:
        'Dispatches are created from ready Material Issue units. Start one to track assembly and delivery.',
      action: 'Create Dispatch Request',
    },
    error: {
      title: 'Could Not Load Dispatches',
      description: 'Something went wrong fetching the dispatch worklist. Please retry.',
    },
  },

  detail: {
    backToDispatches: 'Back to dispatches',
    notFoundText: (id: string) => `Dispatch ${id} not found.`,
    editButton: 'Edit',
    advanceStatus: 'Advance status',

    // Dispatch Details card section
    detailsHeading: 'Dispatch Details',
    fields: {
      salesOrder: 'Sales Order',
      dispatchType: 'Dispatch Type',
      account: 'Account',
      externalTicket: 'External Ticket',
      storeManager: 'Store Manager',
      billingPerson: 'Billing Person',
      invoiceAmount: 'Invoice Amount',
      shippingAddress: 'Shipping Address',
      via: (system: string) => `via ${system}`,
    },

    // Timestamps card
    timestamps: {
      created: 'Created',
      assemblyStarted: 'Assembly Started',
      assemblyCompleted: 'Assembly Completed',
      billed: 'Billed',
      dispatched: 'Dispatched',
    },

    // Variance banner
    variance: {
      heading: (count: number) => `${count} variance${count === 1 ? '' : 's'} vs. SO plan`,
      detail: (added: number, removed: number, replaced: number) =>
        `${added} added, ${removed} removed, ${replaced} replaced. Each variance has a reason + serial numbers recorded below.`,
    },

    // Line Items card
    lineItems: {
      heading: 'Line Items',
      summary: (count: number, total: string) => `(${count} total · ${total} fitted value)`,
      columns: {
        partVariant: 'Part / Variant',
        action: 'Action',
        planned: 'Planned',
        fitted: 'Fitted',
        serialNumbers: 'Serial Numbers',
        reasonNotes: 'Reason / Notes',
        rate: 'Rate',
        amount: 'Amount',
      },
      replaces: 'Replaces:',
      moreSerials: (count: number) => `+${count} more`,
    },

    // Documents card
    documents: {
      heading: 'Documents',
      attachButton: 'Attach',
      noDocuments:
        'No documents attached yet. Invoice, E-way Bill, and delivery challan go here once billing is done.',
      issuedPrefix: 'Issued ',
      uploadedBy: (person: string, timestamp: string) => `Uploaded by ${person} · ${timestamp}`,
    },

    // Notes card
    notesHeading: 'Notes',

    // Source reference (for SO link line)
    forSO: 'For SO',
  },

  form: {
    createTitle: 'Create Dispatch Request',
    editTitle: (dispatchNumber: string) => `Edit ${dispatchNumber}`,
    subtitle:
      'Record what was actually fitted against the SO plan. Required fields are marked with an asterisk (*).',
    dispatchNumberLabel: 'Dispatch #',

    cancelButton: 'Cancel',
    saveChanges: 'Save Changes',
    createButton: 'Create Dispatch Request',
    fittedValueLabel: 'Fitted value:',

    // Section 1 — Dispatch Info
    section1Title: 'Dispatch Info',
    section1Desc:
      'Pick what this dispatch ships against. Lines will auto-populate from the chosen source.',
    typeLabel: 'Type',

    // Source pickers
    salesOrderLabel: 'Sales Order',
    salesOrderPlaceholder: 'Select a Sales Order…',
    salesOrderPlanned: (lineCount: number) =>
      `Planned: ${lineCount} line${lineCount === 1 ? '' : 's'}`,
    viewSO: 'View SO →',

    rentalSalesOrderLabel: 'Sales Order (Rental)',

    demoRequestLabel: 'Demo Request',
    demoRequestPlaceholder: 'Select a Demo Request…',
    demoPlanned: (itemCount: number, unitCount: number) =>
      `Planned: ${itemCount} item${itemCount === 1 ? '' : 's'} · ${unitCount} unit${unitCount === 1 ? '' : 's'}`,
    demoExpectedReturn: (date: string) => ` · expected return ${date}`,

    employeeNameLabel: 'Employee Name',
    employeeNamePlaceholder: 'e.g. Ravi Kumar',
    employeeEmailLabel: 'Employee Email',
    employeeEmailPlaceholder: 'name@company.com',

    replacementRequestLabel: 'Replacement Request',
    replacementRequestPlaceholder: 'Select a Replacement Request…',

    // Section 2 — External Ticket & Billing
    section2Title: 'External Ticket & Billing',
    section2Desc:
      'Link the third-party ticket, store + billing owners, and shipping address.',
    externalTicketLabel: 'External Ticket #',
    externalTicketPlaceholder: 'FD-TKT-12345',
    externalSystemLabel: 'External System',
    externalSystemPlaceholder: 'Freshdesk / Zendesk / …',
    storeManagerLabel: 'Store Manager',
    namePlaceholder: 'Name',
    billingPersonLabel: 'Billing Person',
    invoiceAmountLabel: 'Invoice Amount (₹)',
    statusLabel: 'Status',
    shippingAddressLabel: 'Shipping Address',
    shippingAddressPlaceholder: 'Street, city, pincode',

    // Section 3 — Line Items
    section3Title: 'Line Items',
    section3Desc:
      'Auto-populated from the source above. Adjust qty if needed; lines you don\'t ship can be removed.',
    linesCount: (count: number) => `${count} line${count === 1 ? '' : 's'}`,
    emptyLinesDemoPrompt: 'Select a Demo Request above to auto-fill lines.',
    emptyLinesSOPrompt: 'Select a Sales Order above to auto-fill lines.',
    lineColumns: {
      variant: 'Variant',
      serialNumber: 'Serial Number',
      qty: 'Qty',
    },
    hideBOM: 'Hide BOM',
    viewBOM: 'View BOM',
    bomComponentCount: (count: number) => `${count} component${count === 1 ? '' : 's'}`,

    // Section 4 — Documents
    section4Title: 'Documents',
    section4Desc: 'Drop the right file into each slot once billing is done.',
    docsAttachedCount: (count: number) => `${count} attached`,
    docUploadClickLabel: 'Click to upload',
    docUploadOrDrop: 'or drag & drop',
    docNoFileAttached: 'No file attached',
    docAddAnother: 'Add another',
    docRemoveAriaLabel: 'Remove document',
    docNumberPlaceholder: 'Document number',
    docNotesPlaceholder: 'Notes',

    // Section 5 — Notes
    section5Title: 'Notes',
    section5Desc: 'Optional. Assembly team notes, customer acknowledgements, special instructions.',
    notesPlaceholder: 'Additional notes…',

    // BOM breakdown
    bom: {
      addComponentsTitle: 'Add Components',
      removeComponentsTitle: 'Remove Components',
      partNumberLabel: 'Part Number',
      partSearchPlaceholder: 'Search part number or description…',
      partSearchInputPlaceholder: 'Search by SKU, name, description, brand…',
      partNoMatches: 'No matching parts.',
      serialNumberLabel: 'Serial Number',
      serialPlaceholder: 'e.g. SN-AB1234',
      qtyLabel: 'Qty',
      locationLabel: 'Location',
      locationPlaceholder: 'Pick warehouse · row · rack',
      binLabel: 'Bin',
      binPlaceholder: 'Pick bin',
      binSelectLocationFirst: 'Select location first',
      saveAddButton: 'Save Add',
      saveRemoveButton: 'Save Remove',
      noComponentsAdded: 'No components added yet',
      noComponentsRemoved: 'No components removed yet',
      columns: {
        partNumber: 'Part Number',
        serialNumber: 'Serial Number',
        qty: 'Qty',
        locationBin: 'Location · Bin',
      },
      deleteAddedAriaLabel: 'Delete added row',
      deleteRemovedAriaLabel: 'Delete removed row',
      addedBadge: (count: number) => `${count} added`,
      removedBadge: (count: number) => `${count} removed`,
    },
  },

  toast: {
    saved: (dispatchNumber: string, lineCount: number) =>
      `Saved ${dispatchNumber} · ${lineCount} lines`,
    created: (dispatchNumber: string, lineCount: number) =>
      `Created ${dispatchNumber} · ${lineCount} lines`,
    selectSOFirst: 'Select a Sales Order first',
    selectDemoFirst: 'Select a Demo Request first',
    storeManagerRequired: 'Store Manager is required',
    addAtLeastOneLine: 'Add at least one line item',
    soNotFound: 'Sales Order not found',
    demoNotFound: 'Demo Request not found',
  },

  // Dispatch source type labels & descriptions (for the tile selector)
  sourceTypes: {
    SALES: { label: 'Sales', description: 'Ship against a Sales Order' },
    RENTAL: { label: 'Rental', description: 'Ship against a rental order' },
    DEMO: { label: 'Demo', description: 'Send device for demonstration' },
    INTERNAL_TRANSFER: { label: 'Internal Transfer', description: 'Issue to an employee' },
    RETURN_REPLACEMENT: { label: 'Replacement', description: 'Replace a dispatched device' },
  },

  // Doc type hints (shown under doc type name in the upload slot)
  docTypeHints: {
    Invoice: 'Tally invoice / customer billing',
    'E-way Bill': 'State e-way bill for transport',
    'Delivery Challan': 'Goods movement challan',
  },

  // DispatchCreateBody — source type tiles (2-step create wizard)
  createBody: {
    sourceTypes: {
      sales_orders: { label: 'Sales Order', description: 'Ship against a sales order' },
      demo_requests: { label: 'Demo Request', description: 'Demo units going out' },
      replacement_requests: { label: 'Replacement', description: 'Replacement units going out' },
      staff_requests: { label: 'Internal Transfer', description: 'Transfer to another department' },
    },
  },
} as const
