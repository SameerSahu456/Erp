// User-facing copy for the WMS › inwards sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const INWARDS_STRINGS = {
  // PartCombobox
  partCombobox: {
    clearSelectionLabel: "Clear selection",
    searchPlaceholder: "Search by SKU, name, description, brand…",
    noMatchingParts: "No matching parts.",
  },

  // WarehouseSelect (manual-capture + return-source boxes)
  warehouseSelect: {
    placeholder: "Select a warehouse…",
    searchPlaceholder: "Search warehouse…",
  },

  // PoSourcePicker (PO flow: origin toggle + PO picker + PO summary card).
  // The "Origin" field label and the New / Refurbished button labels reuse
  // inwardInfo.* (byte-identical), so only the PO-picker + summary copy unique
  // to this component lives here.
  poSourcePicker: {
    purchaseOrderLabel: "Purchase Order",
    // Empty state — "No receivable <origin> purchase orders. …"
    noReceivablePos: (origin: string) =>
      `No receivable ${origin} purchase orders. Switch origin or issue a PO in Procurement first.`,
    selectPlaceholder: "Select a purchase order…",
    searchPlaceholder: "Search PO # or supplier…",
    // "<n> pending" caption in a PO option row
    pending: (quantity: number) => `${quantity} pending`,
    // PO summary card — DetailPair labels
    poNumberLabel: "PO Number",
    destinationLabel: "Destination",
    orderedLabel: "Ordered",
    receivedLabel: "Received",
    pendingLabel: "Pending",
  },

  // ManualCaptureFields (on-call capture: staff return / warehouse transfer).
  // Staff-return field labels/placeholders/hint reuse inwardInfo.* (byte-identical),
  // so only the warehouse labels + footer hint unique to this component live here.
  manualCapture: {
    fromWarehouseLabel: "From warehouse",
    toWarehouseLabel: "To warehouse (destination)",
    receiveIntoWarehouseLabel: "Receive into warehouse",
    footerHint:
      "Recorded from the call — no source document. Add the received units in the next step.",
  },

  // ReturnSourcePicker (return / transfer flow: source-document picker + destination
  // warehouse + dispatched / returned / pending summary card). The "Receive into
  // warehouse" label reuses manualCapture.receiveIntoWarehouseLabel (byte-identical).
  returnSourcePicker: {
    // Source field label — varies by return sub-type; generic fallback when no config label
    rentalOrderLabel: "Rental order",
    salesOrderLabel: "Sales order",
    sourceLabel: "Source",
    // Source picker placeholders — noun falls back to "source" when the config omits one
    sourceNoun: "source",
    selectPlaceholder: (noun: string) => `Select a ${noun}…`,
    searchPlaceholder: (noun: string) => `Search ${noun} number or customer…`,
    // "<n> pending return" caption in a source option row
    pendingReturn: (quantity: number) => `${quantity} pending return`,
    // Empty state — "No <noun><suffix> pending return." (noun/suffix resolved at call site)
    noneStart: "No ",
    rentalNoun: "rental",
    ordersSuffix: " orders",
    pluralSuffix: "s",
    noneEnd: " pending return.",
    // Read-only destination fallback (transfer inward — warehouse fixed to the picked row)
    selectTransferFirst: "Select a transfer first",
    // Summary card — DetailPair labels
    dispatchedLabel: "Dispatched",
    returnedLabel: "Returned",
    pendingReturnLabel: "Pending return",
    receivingIntoLabel: "Receiving into",
  },

  // InwardSourceBox — empty state when a return type has no source with units
  // pending return ("No <noun>s have units pending return.").
  sourceBox: {
    sourceNounFallback: "source",
    noPendingReturn: (noun: string) => `No ${noun}s have units pending return.`,
  },

  // BomInlineEditor
  bomEditor: {
    loadTemplatePlaceholder: "Load template…",
    loadTemplateTriggerLabel: "Load BOM template",
    clearBom: "Clear",
    noComponents: "No components yet. Add one or load a BOM template.",
    columnPartNumber: "Part Number",
    columnSerialNumber: "Serial Number",
    columnQty: "Qty",
    serialPlaceholder: "Serial #",
    autoGenerateSerialTitle: "Auto-generate serial number",
    autoGenerateSerialLabel: "Auto-generate serial number",
    serialTrackedQtyTitle: "Serial-tracked component — qty fixed at 1",
    removeComponentLabel: "Remove component",
    addComponent: "Add component",
    componentSearchPlaceholder: "Search component…",
    assemblyLabel: "Assembly",
    // "Slot · <position>" label shown beneath a BOM component row
    slotLabel: (position: string) => `Slot · ${position}`,
    // Toast on BOM template load: "Loaded <name> (<n> slots)"
    templateLoaded: (name: string, count: number, plural: string) =>
      `Loaded ${name} (${count} slot${plural})`,
    // "N component(s)" count label
    componentCount: (count: number) => `${count} component${count === 1 ? '' : 's'}`,
    // BomAssembly (inline assembly editor) — header + load-template button
    loadTemplateButton: "Load template",
    loadTemplateEmptyTitle: "This variant has no reference BOM to load",
    assemblySummary: (count: number) =>
      `Assembly · ${count} component${count === 1 ? '' : 's'}`,
    // Confirm dialog before "Load template" replaces an assembly that has rows
    replaceDialogTitle: "Replace Assembly?",
    replaceDialogDescription: (count: number) =>
      `Replace the ${count} component${count === 1 ? '' : 's'} in this assembly with the reference BOM?`,
    replaceConfirmLabel: "Replace with BOM",
    replaceCancelLabel: "Keep current",
  },

  // BomComponentRow (one assembly component row inside BomInlineEditor).
  // "Search component…" and "Remove component" reuse bomEditor.* (byte-identical),
  // so only the copy unique to this row lives here.
  bomComponentRow: {
    searchPlaceholder: "Search by part / SKU / description…",
    nonTrackedByQuantity: "Non Tracked · by quantity",
    serialPlaceholderOptional: "Serial # (optional)",
    serialAriaLabel: "Component serial number",
    duplicateSerialTitle: "Duplicate serial — already entered on another line",
    quantityAriaLabel: "Component quantity",
    // Inward-verification D1/D7: a BOM part not in the box is recorded missing,
    // and an added part may name the missing one it replaces.
    notInsideLabel: "Not inside — record as missing",
    removeAddedLabel: "Remove component",
    missingNote: "Not inside · recorded as missing",
    undoMissing: "Undo",
    insteadOfLabel: "Instead of",
    insteadOfNone: "Extra part (not a replacement)",
  },

  // InwardFormBody — PageHeader
  pageHeader: {
    title: "Create Inward Batch",
    subtitle: "Fill each section below. Required fields are marked with an asterisk (*).",
    batchLabel: "Batch #",
    breadcrumbWms: "WMS",
    breadcrumbInward: "Inward",
    breadcrumbNewBatch: "New Batch",
    // Edit-mode title — "Edit <batch>" (grn_number, or the generic fallback)
    editTitle: (batchName: string) => `Edit ${batchName}`,
    inwardBatchFallback: "Inward Batch",
    // Edit-mode subtitle (source + header are locked once a draft exists)
    editSubtitle: "Edit the received line items. The source and header are locked.",
    // Create-mode subtitle — "Step <n> of <total> — <stepLabel>. Required fields…"
    createSubtitle: (step: number, total: number, stepLabel: string) =>
      `Step ${step} of ${total} — ${stepLabel}. Required fields are marked with an asterisk (*).`,
    stepDetailsLabel: "inward details",
    stepLineItemsLabel: "line items",
  },

  // InwardFormBody — Section 1: Inward Info
  // §16.12 — the form-config copy that used to sit as naked literals in
  // inward-form/config.ts. config.ts still owns the structural data (icons,
  // inward types, source-entity pairing); only the display strings live here.
  formConfig: {
    typeGroups: {
      purchase_order: { label: "Purchase Order", description: "Stock against a vendor PO" },
      sale_return: { label: "Sale Return", description: "Customer return against a sale" },
      rental_return: {
        label: "Rental Return",
        description: "Rented units coming back",
      },
      demo_return: { label: "Demo Return", description: "Demo units coming back" },
      replacement_return: { label: "Replacement Return", description: "Replacement units returning" },
      internal_transfer: { label: "Internal Transfer", description: "From another department" },
    },
    returnCfg: {
      sale_return: { noun: "return request", label: "Return request" },
      rental_return: {
        noun: "rental return request",
        label: "Rental return request",
      },
      demo_return: { noun: "demo request", label: "Demo request" },
      replacement_return: { noun: "replacement request", label: "Replacement request" },
      staff_return: { noun: "staff issuance", label: "Staff issuance" },
      warehouse_transfer_inward: { noun: "transfer", label: "Transfer" },
    },
    steps: { details: "Inward Details", lines: "Line Items" },
  },
  inwardInfo: {
    sectionTitle: "Inward Info",
    sectionDescription: "Pick how this stock is arriving and its source reference.",
    typeFieldLabel: "Type",
    // Origin field (PO path)
    originFieldLabel: "Origin",
    originFieldHint: "Is this a new purchase or refurbished stock?",
    poFieldLabel: "Purchase Order #",
    poFieldHintNew: "Vendor PO reference",
    poFieldHintRefurb: "Source PO for this refurbished batch",
    poPlaceholder: "Select purchase order…",
    // Return fields
    originTypeFieldLabel: "Origin Type",
    originTypeFieldHint: "Did this return originate from a Sale or a prior Return?",
    demoRequestFieldLabel: "Demo Request #",
    demoRequestFieldHint: "Auto-fills items into Line Items",
    demoRequestPlaceholder: "Select demo request…",
    customerNameFieldLabel: "Customer Name",
    customerPlaceholder: "Select customer…",
    customerContactFieldLabel: "Customer Phone",
    customerContactFieldHint: "Phone or email of the customer contact",
    customerContactPlaceholder: "e.g., rohit@infosys.com · +91 98...",
    salesOrderRentalFieldLabel: "Sales Order #",
    salesOrderRentalFieldHint: "Original SO the rental was fulfilled from",
    salesOrderPlaceholder: "Select sales order…",
    salesOrderSaleFieldLabel: "Sales Order #",
    salesOrderSaleFieldHint: "SO number",
    // Internal Transfer fields
    sourceDeptFieldLabel: "Source Department",
    sourceDeptPlaceholder: "e.g., IT Department",
    employeeNameFieldLabel: "Employee Name",
    employeeNamePlaceholder: "e.g., Rahul Mehta",
    employeeIdFieldLabel: "Employee ID",
    employeeIdFieldHint: "Internal ID or email",
    employeeIdPlaceholder: "e.g., EMP-2041",
    // Replacement fields
    replacementRequestFieldLabel: "Replacement Request",
    replacementRequestFieldHint: "Pick the customer's replacement request this stock fulfils",
    replacementRequestPlaceholder: "Select replacement request…",
    // Origin button labels
    originNew: "New",
    originRefurb: "Refurbished",
    // Return origin type button labels (Sale / Rental)
    originTypeSale: "Sale",
    originTypeRental: "Rental",
    // Sale-return / Internal-transfer sub-type toggles (InwardInfoCard)
    returnAgainstFieldLabel: "Return against",
    returnSourceSalesLabel: "Sales",
    returnSourceSalesHint: "Against a sale order",
    returnSourceRentalHint: "Against a rental order",
    transferTypeFieldLabel: "Transfer type",
    transferStaffReturnLabel: "Staff Return",
    transferStaffReturnHint: "Staff-issued units returning",
    transferWarehouseTransferLabel: "Warehouse Transfer",
    transferWarehouseTransferHint: "Inbound inter-warehouse transfer",
  },

  // InwardLineStep — Step 2 empty state (nothing pending on the PO)
  lineStep: {
    // Replacement return: the faulty parts lead, the device is a fallback.
    partsComingInTitle: "Parts coming in",
    partsComingInDescription:
      "Faulty parts expected back on their own. Receive each one that arrived.",
    devicesTitle: "Devices coming in",
    deviceInstead: "Whole device came in instead?",
    deviceInsteadHelp:
      "Only the part was expected. If the customer sent the whole device, add it here — every part of that device then comes in with the device.",
    emptyTitle: "Nothing Pending on This PO",
    emptyDescription: "All ordered lines have already been received.",
    // Section header — title + description vary by return vs PO flow. The PO
    // title reuses lineItems.sectionTitle ("Line Items").
    returningUnitsTitle: "Returning Units",
    returningUnitsDescription:
      "Scan or check the dispatched units coming back; enter a quantity for non-tracked items.",
    lineItemsDescription:
      "Add a line, search the part number, then capture serials or quantity for each unit.",
    // Staged-count chip suffix (returning vs staged)
    returningChip: "returning",
    stagedChip: "staged",
  },

  // InwardFormBody — Section 2: Line Items
  lineItems: {
    sectionTitle: "Line Items",
    sectionDescription:
      "Lines auto-populate from the source above. Adjust qty as needed. Per-unit serial / barcode entry happens on the next step.",
    columnPartNumber: "Part Number",
    columnSerialNumber: "Serial Number",
    columnQty: "Qty",
    emptyWithSource: "No lines yet — pick a source above to auto-fill, or add a line manually.",
    emptyNoSource: "Pick a source above to auto-fill lines, or add one manually.",
    addLine: "Add line",
    partPlaceholder: "Search part number or description…",
    hideBom: "Hide BOM",
    viewBom: "View BOM",
    addBom: "Add BOM",
    serialPlaceholder: "Serial #",
    removeLineLabel: "Remove line",
    qtyFixedTitle: "Each line is one device — qty is fixed at 1",
    pickPartsHint: "Pick parts and set qty",
    // LineRow — serial cell (PO flow)
    selectPartFirst: "Select a part first",
    serialPlaceholderTracked: "Scan or enter manufacturer number",
    serialPlaceholderOptional: "Serial # (optional — locks qty to 1)",
    serialAriaLabel: (label: string) => `Serial number for ${label}`,
    serialRequired: "Serial required for tracked parts",
    serialDuplicate: "Duplicate serial — already entered on another line",
    serialInInventory: "Already in inventory — use a unique serial",
    quantityAriaLabel: (label: string) => `Quantity for ${label}`,
    qtyPlaceholder: "0",
    // LinePartCell — picker placeholders + BOM toggle + picked-part helper line.
    // "Hide BOM" / "Add BOM" reuse hideBom / addBom above.
    bomAvailableAtQty1: "BOM available at qty 1",
    bomCompsCount: (count: number) => `BOM · ${count} comps`,
    pickPartForLine: "Pick the part for this line…",
    pickPartFromPo: "Pick a part from this PO…",
    searchCatalog: "Search by part / SKU / alias / description…",
    searchThisPo: "Search this PO…",
    akaPrefix: "aka ",
    onPo: "On PO",
    // Picked-part helper line — "<condition> · <claim> of <pending>". The part
    // itself is already in the picker above, so it isn't repeated.
    poLineSummary: (condition: string, claim: number, pending: number) =>
      `${condition} · ${claim} of ${pending}`,
    overPoQtySummary: (received: number, pending: number) =>
      `Over PO qty — receiving ${received} of ${pending}; the extra will be received and flagged over-received.`,
    notOnPo: "Not on this PO — add it to the PO before finalizing.",
    identifyPart: "Identify the part for this line",
    // Toast when items auto-filled from a source
    itemsLoaded: (count: number, plural: string, ref: string) =>
      `Loaded ${count} item${plural} from ${ref}`,
    // Line count + unit count summary pill in section header
    lineCount: (lines: number, units: number) =>
      units > 0
        ? `${lines} line${lines === 1 ? '' : 's'} · ${units} unit${units === 1 ? '' : 's'}`
        : `${lines} line${lines === 1 ? '' : 's'}`,
    // Inline footer summary when items exist
    footerSummary: (lines: number, units: number) =>
      `${lines} line${lines === 1 ? '' : 's'} · ${units} unit${units === 1 ? '' : 's'}`,
  },

  // InwardLineItems (PO-flow line-items table: offline-template + bulk-import top
  // bar and the footer add-line button). Column headers "Part Number" / "Serial
  // Number" / "Qty" reuse lineItems.column* (byte-identical), so only the copy
  // unique to this component lives here.
  inwardLineItems: {
    template: "Template",
    bulkUpload: "Bulk upload",
    addLineFromPo: "Add line from PO",
    // LineItemsTable — empty state + description-bucket group copy
    emptyState: "No lines yet. Click “Add line from PO” to receive a part on this PO.",
    descriptionOnlyLine: "Description-only PO line",
    overPoReceiving: (received: number, pending: number) =>
      `Over PO qty — receiving ${received} of ${pending}; the extra will be received and flagged over-received`,
    receivedOfPending: (received: number, pending: number) =>
      `${received} of ${pending} received`,
    addPartToLine: "Add part to this line",
    // Disabled top-bar tooltips (§0.9): no pending PO lines to act on.
    templateEmptyHint: "No pending PO lines to build a template.",
    bulkUploadEmptyHint: "No pending PO lines to import against.",
  },

  // ReturnLineItems (return / transfer flow: operator-added returning-unit rows).
  // Mirrors the inward line-items table. "Add line" / "Remove line" reuse
  // lineItems.*, the "<n> pending" caption reuses poSourcePicker.pending, and the
  // "<n> pending return" caption reuses returnSourcePicker.pendingReturn — all
  // byte-identical, so no duplicate keys are added for those.
  legacyReturnUnits: {
    title: "Migrated units owed back",
    help: "These came from the old rentals system, so they have no dispatch record. Tick the units in this delivery; each is matched to its request by serial when the batch is finalised.",
    noSerial: "No serial on record",
    unnamed: "Rental unit",
    selectAll: (ticked: number, total: number) => `Select all · ${ticked} of ${total} ticked`,
  },
  returnLineItems: {
    // Column headers (own labels, per the per-group column convention)
    columnPartNumber: "Part Number",
    columnSerialNumber: "Serial Number",
    columnQty: "Qty",
    // Fallback part label when the variant has no name
    unitFallback: "Unit",
    // Empty state
    emptyState: "No lines yet. Click “Add line” to record a returning unit.",
    // Part Number picker
    variantSearchPlaceholder: "Search a part…",
    variantSearchInputPlaceholder: "Search by part name…",
    // Beneath a picked part — tracking-mode prefix ahead of the pending caption
    serialized: "Serialized",
    quantity: "Quantity",
    // Serial Number column states
    selectPartFirst: "Select a part first",
    nonTrackedByQuantity: "Non Tracked · received by quantity",
    // Constrained serial picker: only this line's returnable units.
    serialSelectPlaceholder: "Select the returning serial",
    serialSearchPlaceholder: "Scan or type a serial…",
    noReturnableUnits: "No returnable units left for this part.",
    serialPlaceholder: "Scan the returning serial",
    // Every unit carries a Comprint barcode, tracked or not, and the
    // receive endpoint resolves either that or the maker's serial — so the
    // scan box is offered on every line, not just tracked ones.
    serialPlaceholderAny: "Scan barcode or manufacturer serial",
    nonTrackedScanHint: "Optional — scan to pin the exact unit, or just set a quantity.",
    serialAriaLabel: (label: string) => `Returning serial for ${label}`,
    // Why a typed serial didn't resolve (inline danger message)
    serialAlreadyAdded: "Already added on another line.",
    serialNotReturnable: "Not a returnable unit of this part.",
    // Qty input aria-label
    quantityAriaLabel: (label: string) => `Quantity returning for ${label}`,
  },

  // ManualReceiveLines (on-call manual-receive flow: operator-added received-unit
  // rows — no source document). Mirrors the return line-items table. "Add line"
  // reuses lineItems.addLine and "Remove line" reuses lineItems.removeLineLabel
  // (both byte-identical), so no duplicate keys are added for those.
  manualReceiveLines: {
    // Column headers (own labels, per the per-group column convention)
    columnPartNumber: "Part Number",
    columnSerialNumber: "Serial Number",
    columnQty: "Qty",
    // Empty state
    emptyState: "No lines yet. Click “Add line” to record a received unit.",
    // Part Number picker
    searchPlaceholder: "Search part number or description…",
    searchInputPlaceholder: "Search by part / SKU / description…",
    // Serial Number column states
    selectPartFirst: "Select a part first",
    nonTrackedByQuantity: "Non Tracked · received by quantity",
    serialPlaceholder: "Scan or enter manufacturer number",
    serialAriaLabel: (label: string) => `Serial number for ${label}`,
    // Duplicate-serial inline danger message
    duplicateSerial: "Duplicate serial — already entered on another line",
    // Qty input aria-label
    quantityAriaLabel: (label: string) => `Quantity for ${label}`,
  },

  // InwardFormBody — Section 3: Delivery Challan
  challan: {
    sectionTitle: "Delivery Challan",
    sectionDescription: "Attach the DC received with this batch. PDF or image.",
    attached: "Attached",
    optional: "Optional",
    replace: "Replace",
    removeFileLabel: "Remove file",
    uploadHint: "Click to upload or drag and drop · PDF, PNG, JPG",
    browse: "Browse",
  },

  // DeliveryChallanSection (standalone challan attachment list on a GRN batch —
  // LIVE + STAGED modes). Distinct from the InwardFormBody Section 3 `challan`
  // group above, which is the create-form's single-file field.
  deliveryChallan: {
    // Row actions
    view: "View",
    removeAriaLabel: "Remove delivery challan",
    // Confirm-delete dialog (live mode)
    removeDialogTitle: "Remove Delivery Challan?",
    // "“<name>” will be removed from this batch."
    removeDialogDescription: (name: string) =>
      `“${name}” will be removed from this batch.`,
    removeConfirmLabel: "Remove",
    // Empty state
    emptyState: "No delivery challan uploaded.",
    // Dropzone caption — prompt varies by whether files already exist
    addMore: "Add more delivery challans",
    uploadPrompt: "Upload delivery challan(s)",
    // Trailing hint appended after the prompt (leading " · " joins it)
    multipleFilesSuffix: " · PDF, JPG, or PNG · you can select multiple",
    // Supported-formats + size hint under the dropzone (mb derived from the byte cap)
    uploadSizeHint: (mb: number) => `PDF, JPG, or PNG · up to ${mb} MB per file`,
    // Upload-in-progress helper
    uploading: "Uploading…",
    // Toast when the challan blob can't be opened
    openError: "Could not open the delivery challan",
    // Count-limit guards (backend caps delivery challans at `max` per batch —
    // block before the doomed upload instead of a raw per-file 422).
    maxReached: (max: number) =>
      `You can attach at most ${max} delivery challans to a batch.`,
    limitPartial: (max: number, dropped: number) =>
      `Only ${max} delivery challans are allowed per batch — ${dropped} file(s) were not added.`,
    // One summary toast after a batch upload (never one per file — the shared
    // upload hook is silenced per-file and we report the whole batch once).
    uploaded: (n: number) =>
      n === 1 ? "Delivery challan uploaded" : `${n} delivery challans uploaded`,
  },

  // InwardFormBody — Section 4: Notes
  notes: {
    sectionTitle: "Notes",
    sectionDescription: "Optional. Anything the inspection team should know.",
    placeholder: "Additional notes…",
  },

  // InwardFormBody — Sticky footer
  footer: {
    readyToSubmit: "Ready to submit",
    stillNeeded: "Still needed:",
    cancel: "Cancel",
    saveDraft: "Save Draft",
    createBatch: "Create Batch",
    // Step-dependent primary-action labels (InwardFormFooter)
    nextLineItems: "Next: Line Items",
    saving: "Saving…",
    saveChanges: "Save Changes",
    creating: "Creating…",
    receiveReturn: "Receive Return",
    createReturnBatch: "Create Return Batch",
    createEmptyBatch: "Create Empty Batch",
    // "(<n> unit(s))" suffix appended to Save Changes / Create Batch / Receive Return
    unitCountSuffix: (count: number) => ` (${count} unit${count === 1 ? '' : 's'})`,
    // Step-2 validation hints (right-aligned before the primary action)
    bomSerialHint: "Pick a part for every added component, or remove the row",
    serialHint: "Enter a serial for every tracked unit",
    duplicateSerialHint: "Remove the duplicate serial before finalizing",
    // Step-0 "Next" disabled tooltip (§0.9): required inward details unmet.
    nextDisabledHint: "Complete the required details to continue.",
  },

  // Toast messages (InwardFormBody)
  toast: {
    draftSaved: (batchNumber: string) => `Batch ${batchNumber} saved as draft.`,
    missingFields: (missing: string) => `Missing: ${missing}`,
    batchCreated: "Batch created successfully",
    batchCreatedDescription: (batchNumber: string, count: number) =>
      `${batchNumber} with ${count} item${count > 1 ? 's' : ''}`,
    // Bulk CSV import (useBulkImport)
    noDataRows: "The file has no data rows",
    noRowsImported: "No rows could be imported — no matching parts found",
    importedLines: (
      count: number,
      offCount: number,
      ambiguous: number,
      unresolved: number,
    ) =>
      `Imported ${count} line${count === 1 ? '' : 's'}` +
      (offCount ? ` (${offCount} off-PO)` : '') +
      (ambiguous ? ` · ${ambiguous} matched multiple variants (verify)` : '') +
      (unresolved ? ` · ${unresolved} row(s) skipped (part/condition not found)` : ''),
  },

  // BatchDevicesBody — empty/not-found states
  batchNotFound: {
    title: "Batch Not Found",
    description: "The batch you are looking for does not exist.",
    backToInward: "Back to Inward",
  },

  // BatchDevicesBody — Batch Information card
  batchInfo: {
    cardTitle: "Batch Information",
    sourceSection: "Source",
  },

  // BatchDevicesBody — Notes card
  batchNotes: {
    cardTitle: "Notes",
  },

  // BatchDevicesBody — Devices list card
  devices: {
    cardTitle: "Devices by Model",
    searchPlaceholder: "Search by barcode, serial, model, or engineer…",
    clearSearchLabel: "Clear search",
    noMatchPrefix: "No devices match",
    noMatchQuery: (query: string) => `No devices match "${query}".`,
    columnBarcode: "Barcode",
    columnPartNumber: "Part Number",
    columnSerialNumber: "Serial Number",
    columnStatus: "Status",
    columnGrade: "Grade",
    columnAssignedTo: "Assigned To",
    columnActions: "Actions",
    assignPlaceholder: "Assign...",
    moveToInspection: "Move to Inspection",
    sendAllToInspection: "Send All to Inspection",
    noDevicesTitle: "No Devices Yet",
    noDevicesDescription: "This batch has no devices associated with it.",
    // Toast messages
    movedToInspection: (barcode: string) => `${barcode} moved to Pending Inspection`,
    noReceivedDevices: "No RECEIVED devices to move.",
    allMovedToInspection: (count: number) => `${count} device(s) moved to Pending Inspection`,
    engineerAssigned: (barcode: string, engineer: string) =>
      `${barcode} assigned to ${engineer}`,
    // "N devices" badge inside collapsible header
    deviceCount: (count: number) => `${count} devices`,
  },

  // BatchDevicesBody — full component copy (§16.12 migration)
  // Replacement returns: faulty parts that come back loose (no dispatch
  // line) — on-site swaps, and in-house parts sent without their device
  // (spec D15) — staged against their replacement line.
  // GRN page, replacement return: what the request asks for, so whoever
  // inspects the unit knows the fault and what to do with it.
  replacementRequestNotes: {
    title: (number: string) => `Replacement request ${number}`,
    description: "What the customer reported and what to do with each part.",
    reason: "Reason",
    details: "Details",
    notes: "Notes",
    engineer: "Engineer",
    ticket: "Ticket",
    device: (serial: string) => `Device ${serial}`,
  },
  replacementParts: {
    title: "Faulty parts owed back",
    description:
      "Parts that come back on their own. Receive each against its replacement request.",
    // In house, the plan was the whole device: receiving the part alone
    // switches every part of that device to part-only.
    inHouseDevicePlanned: "In house · device expected — receiving only this part switches the device's parts to part-only",
    inHousePartOnly: "In house · only the part comes in",
    onSite: "Swapped at the customer's site",
    describedFallback: "Part",
    noSerial: "No serial on record",
    pickPart: "Choose its IMS part…",
    pickPartAria: "IMS part of the faulty part",
    stage: "Receive on this GRN",
    staged: "Staged",
    remove: "Remove",
    staging: "Saving…",
    describedHelp: "Not a part we track yet — pick what it is.",
  },
  batchDevices: {
    // Straight after a receipt the units are located nowhere; this parks them
    // (staging area, pallet) before anyone inspects them.
    assignLocation: "Assign Location",
    // Loading / error / not-found states
    loadErrorTitle: "Couldn’t Load This Batch",
    loadErrorDescription: "Something went wrong fetching the GRN batch. Refresh to try again.",
    backToInward: "Back to Inward",
    notFoundTitle: "Batch Not Found",
    notFoundDescription: "The batch you are looking for does not exist.",

    // Batch Information card — field labels
    categoryLabel: "Category",
    categories: "Categories",
    brandLabel: "Brand",
    conditionsLabel: "Conditions",
    unitsLabel: "Units",
    inwardTypeLabel: "Inward Type",
    warehouseLabel: "Warehouse",
    receivedByLabel: "Received By",
    closedLabel: "Closed",
    createdLabel: "Created",

    // Header actions & dialogs
    editLineItems: "Edit Line Items",
    cancelDialogTitle: "Cancel This Batch?",
    cancelDialogDescription: (grnNumber: string) =>
      `This cancels ${grnNumber} before receipt — its staged lines won't be received into inventory and the batch is marked cancelled. This can't be undone.`,
    cancelConfirmLabel: "Cancel Batch",
    keepBatch: "Keep Batch",
    finalizeDialogTitle: "Finalize & Receive?",
    finalizeDialogDescription:
      "This receives all staged units into inventory and closes the batch. This can't be undone.",
    finalizeConfirmLabel: (count: number) =>
      `Finalize & Receive${count > 0 ? ` (${count})` : ''}`,
    receiving: "Receiving…",
    finalizeButton: (count: number) => `Finalize & Receive (${count})`,
    // Disabled-finalize tooltip (§0.9): nothing staged yet.
    finalizeEmptyHint: "Stage at least one device to finalize.",

    // Badges
    needsItems: "Needs items",

    // Cards & section headings
    batchInformation: "Batch Information",
    source: "Source",
    vendor: "Vendor",
    estimatedDeliveryDate: "Estimated Delivery Date",
    deliveryChallan: "Delivery Challan",
    notes: "Notes",
    receivedUnits: "Received Units",

    // Received Units — search & empty
    searchReceivedPlaceholder: "Search by serial or part…",
    clearSearch: "Clear search",
    noUnitsMatch: (query: string) => `No units match “${query}”.`,

    // Received Units — group header & table columns
    descriptionBadge: "Description",
    unitsCount: (count: number) => `${count} unit${count === 1 ? "" : "s"}`,
    columnInternalSerial: "Internal Serial",
    columnMfrSerial: "Mfr Serial",
    columnVariant: "Variant",
    columnCondition: "Condition",
    columnStatus: "Status",
    columnInspectionEngineer: "Inspection Engineer",
    columnRepairEngineer: "Repair Engineer",
    columnQcEngineer: "QC Engineer",

    // Engineer assignment cells
    assignWork: 'Assign work',
    assignEngineerPlaceholder: "Assign engineer…",
    assignRepairNotReady: "Assignable at repair stage",
    assignRepairEngineerPlaceholder: "Assign repair engineer…",
    assignQcNotReady: "Assignable at QC stage",
    assignQcEngineerPlaceholder: "Assign QC engineer…",

    // Ready to Receive / Line Items (staged) card
    readyToReceive: "Ready to Receive",
    lineItems: "Line Items",
    searchStagedPlaceholder: "Search by part, variant, or serial…",
    columnSrNo: "Sr No",
    columnPartNo: "Part No.",
    columnVariantName: "Variant Name",
    columnManufacturerSerialNo: "Manufacturer Serial No.",
    columnQuantity: "Quantity",
    noLinesMatch: (query: string) => `No lines match “${query}”.`,

    // Empty state (no units at all)
    noUnitsRecordedTitle: "No Units Recorded",
    noUnitsRecordedDescription: "This batch has no received units.",

    // Staged / received line fallbacks when a variant carries no name
    fallbackReturningUnit: "Returning unit",
    // A faulty part staged against its replacement line (spec D10, D15).
    faultyPartLine: (name: string) => `${name} · faulty part`,
    fallbackPendingLine: "Pending line",
    fallbackOffPoItem: "Off-PO item",
    fallbackDescriptionLine: "Description line",
    fallbackUnknownPart: "Unknown part",
  },

  // FinalizePreviewDialog — pre-finalize dry-run confirmation.
  // Dialog title, confirm button, and "Receiving…" reuse batchDevices.* (same
  // finalize action, byte-identical copy) — no duplicate keys added for those.
  finalizePreview: {
    dialogDescription: "A dry-run of what will happen — nothing is committed until you confirm.",
    loading: "Checking what will happen…",
    error: "Could not run the finalize check. Please retry.",
    // Ready / blocked status badges
    readyToFinalize: "Ready to finalize",
    cannotFinalizeYet: "Cannot finalize yet",
    // Disabled-confirm tooltip (§0.9) when the dry-run found blockers.
    finalizeBlockedHint: "Resolve the blocking issues above before finalizing.",
    cancel: "Cancel",
    // Summary row labels (the summary_* data keys stay in the component)
    summaryLinesAccepted: "Lines accepted",
    summaryLinesHeld: "Lines held",
    summaryStockItemsCreated: "Stock items created",
    summaryStockItemsFlipped: "Stock items flipped",
    summaryStockMovements: "Stock movements",
    summaryInspectionOps: "Inspection ops",
    // Per-line backend-error prefix: "Line N: "
    lineErrorPrefix: (lineNumber: number) => `Line ${lineNumber}: `,
    // "N issue(s) to fix" blocker heading
    issuesToFix: (count: number) => `${count} issue${count === 1 ? '' : 's'} to fix`,
    // "N discrepancy line(s) will be recorded and held for review."
    discrepanciesHeld: (count: number) =>
      `${count} discrepancy line${count === 1 ? '' : 's'} will be recorded and held for review.`,
  },

  // InwardPage (list page)
  list: {
    title: "Inward / GRN",
    subtitle: "Incoming device batches — from POs, returns, demos, and transfers.",
    createBatch: "Create Batch",
    breadcrumbWms: "WMS",
    breadcrumbInward: "Inward",
    // Tab labels
    tabOpenBatches: (count: number) => `Open Batches (${count})`,
    tabAllBatches: (count: number) => `All Batches (${count})`,
    // Column headers
    columnBatchNumber: "Batch #",
    columnInwardType: "Inward Type",
    columnCategory: "Category",
    columnDevices: "Devices",
    columnWarehouse: "Warehouse",
    columnReceivedBy: "Received By",
    columnDate: "Date",
    columnStatus: "Status",
    // Empty state
    emptyTitle: "No Batches Yet",
    emptyDescription:
      "Create an inward batch to register devices arriving at the warehouse.",
  },

  // InwardDetailsStep (inward-form step 1: locked Inward Info card + the editable
  // Delivery Challan / Notes cards). The "Delivery Challan" title reuses
  // challan.sectionTitle, the "Notes" title reuses notes.sectionTitle, and the
  // "Additional notes…" textarea placeholder reuses notes.placeholder — all
  // byte-identical, so only the two section descriptions unique to this step
  // (which differ from the InwardFormBody section copy) live here.
  detailsStep: {
    deliveryChallanDescription:
      "Optional — upload the delivery challan received with this batch.",
    notesDescription: "Optional. Anything the receiving team should know.",
  },
} as const
