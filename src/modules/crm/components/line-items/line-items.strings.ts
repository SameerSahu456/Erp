// User-facing copy for the CRM › line-items sub-feature (the shared line-item
// row + BOM child editor used by Quotes, Sales Orders, and the Closed-Won
// wizard).
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): field labels,
// placeholders, aria-labels, table headers, empty text, and validation copy
// live here as one typed `as const` object instead of being hardcoded
// ("naked") in JSX. The three components import this single source so copy
// stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member. The discount-cap validation
// message is shared by the per-line and per-child discount checks in
// `lineItemMappers.ts`.
//
// Note: backend discriminator literals (e.g. line `type`) and the part-derived
// display values (variant/condition, category name) are NOT copy — they are
// data and stay inline.
export const LINE_ITEMS_STRINGS = {
  // The per-line rental window, shared by the quote builder and the SO
  // form. Empty means "same as the document".
  billingPeriod: {
    label: "Line billing period",
    // ONE range control since 2026-10-29, the same picker as the rental SO's
    // own billing period. It replaced two separate fields; each pane drills
    // into its own year/month, so a far end is still a few clicks away.
    placeholder: "Same as the document",
    help: "Defaults to the document's window. Override only if this item is out for a different span.",
    /** Shown while the line states neither date — it is running on the
     *  document's window, and a date in the box would otherwise read as
     *  this line's own choice. */
    inherited: "Same as the order — change either date to narrow this line.",
    // Rentals price per MONTH; the cadence itself is set per order on
    // the rentals module's Configure SO page, not per line.
    rateMonthly: "Monthly rent",
  },
  row: {
    removeLineAria: "Remove line",
    fields: {
      partNumber: "Part Number",
      name: "Name",
      description: "Description",
      category: "Category",
      oem: "Brand/OEM",
      condition: "Condition",
      qty: "Qty",
      rate: "Rate",
      disc: "Disc",
      tax: "Tax %",
      // No `amount` label — the line card renders the price as a bare value
      // with no column header.
    },
    placeholders: {
      itemName: "Enter item name",
      categoryFromPart: "Set from selected part number",
      categorySelect: "Select a category",
      oemSelect: "Select Brand/OEM",
      oemFromPart: "Set from selected part number",
      conditionSelect: "Select condition",
      conditionFromPart: "Set from selected part number",
    },
    discountAria: "Line discount in rupees",
    taxAria: "Tax percent (0 to 100)",
    categoryFromPartHint:
      "Category is determined by the selected part number. Clear the part to set a category manually.",
  },
  bom: {
    assembly: "Assembly",
    componentCount: (count: number) =>
      `${count} component${count === 1 ? "" : "s"}`,
    clear: "Clear",
    clearAllAria: "Clear all components",
    columns: {
      partNumber: "Part Number",
      name: "Part Name",
      description: "Description",
      oem: "Brand/OEM",
      condition: "Condition",
      qty: "Qty",
      rate: "Rate",
      disc: "Disc",
      tax: "Tax %",
      amount: "Amount",
    },
    fromPart: "From part",
    oemPlaceholder: "Select Brand/OEM",
    conditionPlaceholder: "Select condition",
    empty: "No components yet. Click “Add component” to build the BOM.",
    componentDiscountAria: "Component discount in rupees",
    componentTaxAria: "Component tax percent",
    removeComponentAria: "Remove component",
    addComponent: "Add component",
  },
  section: {
    assembly: "Assembly",
    componentCount: (count: number) =>
      `${count} component${count === 1 ? "" : "s"}`,
    compCount: (count: number) => `${count} comp${count === 1 ? "" : "s"}`,
    addBom: "Add BOM",
    viewBom: "View BOM",
    hideBom: "Hide BOM",
  },
  grid: {
    loadingMore: "Loading more…",
    scrollForMore: "Scroll for more",
    title: "Line Items",
    loading: "Loading…",
    noMatches: "No matches",
    typeToSearch: "Type to search…",
    columns: {
      partNumber: "Part Number",
      partName: "Part Name",
      category: "Category",
      oem: "OEM",
      condition: "Condition",
      description: "Description",
      warranty: "Warranty",
      qty: "Qty",
      listPrice: "List Price",
      price: "Price",
      // A rental line's rate is its rent per month (billing is monthly).
      monthlyRate: "Monthly Rate",
      discount: "Disc",
      tax: "Tax %",
      amount: "Amount",
    },
    placeholders: {
      partNumber: "Search part number or description",
      partName: "Part name…",
      categorySelect: "Category",
      oemSelect: "OEM",
      conditionDash: "—",
      description: "Description",
      warranty: "e.g., 3Y Onsite",
    },
    parentTitle: "Parent line",
    componentTitle: "Component of the line above",
    componentPricingNote:
      "",
    addComponent: "Add component",
    removeLine: "Remove line",
    removeComponent: "Remove component",
    parentCount: (n: number) => `${n} parent line${n === 1 ? "" : "s"}`,
    componentCount: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
    subtotal: "Subtotal",
    addLineItem: "Add Line Item",
    clearAll: "Clear all",
    clearAllTitle: "Clear all line items?",
    clearAllDescription:
      "Every line and its components will be removed from this document. Saved lines are deleted when you save.",
    clearAllConfirm: "Clear all",
  },
  validation: {
    // Shared per-line / per-child discount cap. The backend enforces
    // `discount_amount <= gross_amount` and 422s the whole /calculate request
    // when any row breaks it, so we mirror the rule client-side.
    discountExceedsAmount: "Discount cannot be more than the line amount (Qty × Rate).",
    discountIsFullAmount: "Discount cannot be 100% of the line amount.",
    // A priced row must carry a rate greater than 0 — a 0 rate is treated as
    // an unpriced line and blocks save (parent line and BOM child alike).
    ratePositive: "Rate must be greater than 0.",
    // Every row (parent line and BOM child alike) must be identifiable: it
    // needs at least a part number OR a description. A row with neither is
    // blocked on save rather than persisted with a placeholder "-" name.
    identityRequired: "Add a part number or description.",
    // Category is mandatory on every BOM component, same as the parent
    // line — a picked part auto-fills it; a freeform component must select
    // one explicitly. Blocked on save.
    categoryRequired: "Select a category.",
    // Part Name is mandatory on every BOM component — a picked part
    // auto-fills it; a freeform component must type one. Blocked on save.
    nameRequired: "Enter a part name.",
    // Brand/OEM + Condition are mandatory on every freeform Sales Order line
    // (SO form and Closed Won). A catalog line fills both from the part.
    oemRequired: "Pick a Brand/OEM.",
    conditionRequired: "Pick a condition.",
  },
  // Paste-from-Excel dialog + launcher button (PasteLineItemsDialog /
  // LineItemsSection). One copy set for every document that hosts the grid
  // (Quote, Sales Order) — keep the wording document-neutral.
  paste: {
    openButton: "Paste from Excel",
    title: "Paste line items from Excel",
    description:
      "Copy the rows from your sheet and paste into the grid — columns are part number, description, quantity, price, category, condition. A row with a price becomes a parent line item; the rows beneath it without a price become its components. Component prices are never shown on the document. Up to 100 rows per paste — split larger sheets into batches.",
    columns: {
      partNumber: "Part Number",
      category: "Category",
      condition: "Condition",
      description: "Description",
      quantity: "Quantity",
      price: "Price",
    },
    pcTitle: "Parent / Component",
    parentTitle: "Parent line item",
    componentTitle: "Component of the parent above",
    priceHint: "Enter a price to make this row a parent line item; leave blank for a component",
    tip: "Tip: click the first Part Number cell and press Ctrl+V / ⌘V — a multi-row paste fills down and across from that cell, just like Excel. The sheet's header row is skipped automatically. Rows marked P (price filled) are parents; rows marked C (no price) are their components.",
    pasteFromClipboard: "Paste from clipboard",
    row: "Row",
    clear: "Clear",
    cancel: "Cancel",
    dismiss: "Dismiss",
    insertRowBelow: "Insert row below",
    removeRow: "Remove row",
    modeAppend: "Add to existing lines",
    modeReplace: "Replace existing lines",
    parentCount: (count: number) => `${count} parent${count === 1 ? "" : "s"}`,
    componentCount: (count: number) => `${count} component${count === 1 ? "" : "s"}`,
    skippedRows: (count: number) =>
      `${count} row${count === 1 ? "" : "s"} without part number or description will be skipped`,
    addLines: (count: number) =>
      count > 0 ? `Add ${count} line${count === 1 ? "" : "s"}` : "Add lines",
    summary: {
      fixRed: "Fix the red cells before adding",
      fixHighlighted: "Fix the highlighted cells before adding",
      row: "row",
      rows: "rows",
    },
    preview: {
      show: "Show how this lands in the line items",
      hide: "Hide how this lands in the line items",
      qty: "qty",
      noPrice: "no price",
    },
    issues: {
      clipboardEmpty: "Clipboard is empty — copy the rows from Excel first.",
      clipboardBlocked:
        "Clipboard access was blocked by the browser. Click a cell and press Ctrl+V / ⌘V instead.",
      gridExceeded: (filled: number, incoming: number, max: number) =>
        `Grid would exceed ${max} rows — ${filled} already filled, pasting ${incoming} more. Clear or split into smaller batches.`,
      overCap: (filled: number, max: number) =>
        `Too many rows — ${filled} filled, only ${max} allowed. Remove rows before adding.`,
    },
    toast: {
      added: (lines: number, components: number, unmatched: number) => {
        const base = `Added ${lines} line item${lines === 1 ? "" : "s"} with ${components} component${components === 1 ? "" : "s"}`
        if (unmatched === 0) return base
        return `${base} · ${unmatched} part number${unmatched === 1 ? "" : "s"} not in inventory, kept as description`
      },
    },
  },
} as const
