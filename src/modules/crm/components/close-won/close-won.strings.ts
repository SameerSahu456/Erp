// User-facing copy for the CRM › close-won wizard sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, status hints,
// and the sub-feature's toast messages live here as one typed `as const`
// object instead of being hardcoded ("naked") in JSX/hooks. The wizard is a
// multi-step flow, so copy is grouped by wizard screen/step:
//   • page      — the page-level loading / not-found shells (ClosedWonPage)
//   • chrome     — the wizard top bar + sticky footer (ClosedWonWizardBody)
//   • artifact   — the Sales Order / Demo Request segmented choice
//   • accountStep — Step 1 (leads only): account + primary contact + documents
//   • soStep      — the Sales Order artifact step (quote, items, addresses)
//   • toast       — sonner messages fired from the wizard controller hook
//
// Dynamic copy is expressed as a function member (see `chrome.subtitle.*`,
// `toast.*`). Status / enum VALUES (industry, account type, order type, quote
// status) are NOT copy — they come from the typed arrays in `../../api` and
// are rendered verbatim.
export const CLOSE_WON_STRINGS = {
  page: {
    // Loading shell — `entityLabel` is the lowercased source-entity noun.
    loading: (entityLabel: string) => `Loading ${entityLabel}…`,
    entityLead: "lead",
    entityDemo: "demo request",
    entityDeal: "deal",
    // Not-found shell — `entityLabel` is the capitalized source-entity noun.
    notFound: (entityLabel: string) => `${entityLabel} not found`,
    notFoundLead: "Lead",
    notFoundDemo: "Demo request",
    notFoundDeal: "Deal",
    goBack: "Go Back",
  },

  chrome: {
    back: "Go back",
    titleConvertDemo: "Convert demo to Sales Order",
    titleCloseWon: "Close Won",
    // Header subtitle — one variant per source/artifact branch.
    subtitle: {
      leadDemo: "Create an account and demo request to close this lead.",
      leadSo: "Create an account and sales order to close this lead.",
      demoConvert: (entityName: string) =>
        `Pricing pre-filled from ${entityName} — back-to-back PO will be raised on the vendor.`,
      dealDemo: (accountName: string) =>
        `Create a demo request for ${accountName}.`,
      dealSo: (accountName: string) => `Create a sales order for ${accountName}.`,
      // Fallback subject when the deal's account name hasn't resolved yet.
      thisDeal: "this deal",
    },
    // Inline step-indicator labels.
    stepAccount: "Account",
    stepSalesOrder: "Sales Order",
    stepDemoRequest: "Demo Request",
    stepArtifactPending: "Sales Order / Demo",
    // Footer status hints (left side of the sticky action bar).
    status: {
      accountReadyContinue: "Account ready — continue to the next step.",
      accountReadyToSo: "Account ready — continue to Sales Order.",
      fillAccountFields: "Fill required account fields to continue.",
      demoReady: (summary: string) => `Demo ready — ${summary}.`,
      demoIncomplete: "Add demo items and shipping details to continue.",
      orderReady: (total: string) => `Order ready — total ₹${total}.`,
      discountError: "Fix the line discount — it cannot be 100% of the line amount.",
      incompleteItems: (count: number) =>
        `Complete or remove the incomplete item row${count === 1 ? "" : "s"}.`,
      selectBilling: "Select a billing address to continue.",
      addLineItem: "Add at least one line item with quantity & rate.",
    },
    // Footer action buttons.
    cancel: "Cancel",
    backButton: "Back",
    continue: "Continue",
    continueToSo: "Continue to Sales Order",
    createDemoRequest: "Create Demo Request",
    complete: "Complete",
  },

  artifact: {
    prompt: "What do you want to create for this won record?",
    so: {
      title: "Sales Order",
      desc: "Binding order — quote, pricing, tax, invoicing.",
    },
    demo: {
      title: "Demo Request",
      desc: "Loan units for on-site evaluation. Needs PM approval.",
    },
  },

  accountStep: {
    account: {
      heading: "Account Details",
      subtitle: "Company information for the new account",
      nameLabel: "Account Name",
      namePlaceholder: "Company name",
      // Duplicate-account warning wraps the name in <span>, so it is split
      // into the copy before/after the highlighted name.
      duplicateBefore: "An account named ",
      duplicateAfter: " already exists.",
      industryLabel: "Industry",
      industryPlaceholder: "Select industry",
      typeLabel: "Type",
      typePlaceholder: "Select type",
      companySizeLabel: "Company Size",
      companySizePlaceholder: "Select",
      employeesLabel: "Employees",
      employeesPlaceholder: "Count",
      tagLabel: "Tag",
      websiteLabel: "Website",
      websitePlaceholder: "https://www.example.com",
      revenueLabel: "Annual Revenue (₹)",
      revenuePlaceholder: "0",
      panLabel: "PAN Number",
      panPlaceholder: "ABCDE1234F",
      gstLabel: "GST Number",
      gstPlaceholder: "27ABCDE1234F1Z5",
      categoriesInterestedLabel: "Categories Interested",
      categoriesInterestedPlaceholder: "Select categories interested...",
      categoriesBoughtLabel: "Categories Bought",
      categoriesBoughtPlaceholder: "Select categories bought...",
    },
    contact: {
      heading: "Primary Contact",
      subtitle: "Main point of contact at the account",
      firstNameLabel: "First Name",
      firstNamePlaceholder: "First name",
      lastNameLabel: "Last Name",
      lastNamePlaceholder: "Last name",
      emailLabel: "Email",
      emailPlaceholder: "email@company.com",
      // Duplicate-contact warning; `suffix` carries the optional " (Name)".
      duplicate: (suffix: string) =>
        `A contact with this email already exists${suffix}. Continuing will create a duplicate.`,
      phoneLabel: "Phone",
      phonePlaceholder: "10-digit mobile number",
      designationLabel: "Designation",
      designationPlaceholder: "e.g. IT Manager",
      departmentLabel: "Department",
      departmentPlaceholder: "e.g. IT, Procurement",
    },
    documents: {
      heading: "Documents",
      subtitle: "PDF, JPG, PNG · up to 20 MB",
    },
  },

  soStep: {
    quote: {
      heading: "Quote Selection",
      subtitle: (entityLabel: string) =>
        `Pick a quote for this ${entityLabel} — line items load below automatically. Use "Build manually" to skip.`,
      selectPlaceholder: "Select an accepted quote (optional)…",
      searchPlaceholder: "Search by quote number…",
      // Loaded-items hint wraps the quote number in <span>, so it is split.
      loadedBefore: "Items from ",
      loadedAfter:
        " have been loaded below. You can edit, remove, or add new items — the final order is sent as flat lines.",
      orderTypeLabel: "Order Type",
      orderTypePlaceholder: "Select order type",
      // Order Type is a LABEL. What makes an order bill as rent is
      // `sellable_type = 'rental_sales'`, which is decided by the quote's
      // lines — so the screen says which one is in force rather than
      // letting the select imply it decides.
      orderTypeNotRentalSwitch:
        "This only labels the order. Whether it bills as rent is decided by the quote's line items.",
      rentalOrderLabel: "Rental order date",
      rentalOrderHelp: "The day the customer placed the order.",
      rentalOrderMissing: "The rental order date is required.",
      // One period on a two-calendar picker, as on the Sales Order form.
      rentalPeriodLabel: "Billing period",
      rentalPeriodPlaceholder: "Pick the rental window",
      rentalPeriodHelp: "Rent is charged from the first day through the last, both included.",
      rentalWindowHeading: "Rental period",
      rentalWindowHelp:
        "Every line of this order bills across this period unless a line is given its own dates later.",
      rentalWindowSeeded: "Taken from the selected quote — change either date if the order differs.",
      rentalWindowMissing:
        "Both dates are required for a rental order. Without them no rental agreement is created and nothing bills as rent.",
      rentalWindowInvertedField: "The end date cannot be before the start date.",
      rentalTitle: "This will create a rental order",
      rentalBody: (rentalLines: number, totalLines: number, from: string, to: string) =>
        `${rentalLines} of ${totalLines} quote line${totalLines === 1 ? "" : "s"} ${
          rentalLines === 1 ? "is" : "are"
        } rented, so a rental agreement will be created and the units will bill as rent over ${from} – ${to}. Non-rented lines bill once.`,
      // No quote: the operator stated the window by hand, so there is no
      // line count to report — only what the window will do.
      rentalBodyNoQuote: (from: string, to: string) =>
        `A rental agreement will be created and every line of this order will bill as rent over ${from} – ${to}. A line sold outright can be marked non-rental on the order afterwards.`,
      rentalCycleNote:
        "The billing cycle — monthly, quarterly, arrears or advance — is set on the agreement after this order is approved.",
      // Picking "Rental" on a quote with no rented lines produces an
      // order that can never bill as rent. Said plainly, because the old
      // screen accepted it silently.
      rentalLabelOnlyTitle: "Labelled Rental, but nothing here is rented",
      rentalLabelOnlyBody:
        "No line on this quote is marked as rented, so this order will not create a rental agreement and nothing will bill as rent. Add rented lines to the quote first if that is what you intended.",
    },
    account: {
      label: "Account",
      demoValue: "Demo Value",
      dealValue: "Deal Value",
      // Account-name fallbacks when none resolved.
      emDash: "—",
      na: "N/A",
    },
    items: {
      heading: "Items",
      subtitle:
        "Pick a part number in a row to auto-fill rate & category, fill it in as a freeform line, or paste rows from Excel.",
      calcError:
        "Couldn't price these items right now — totals will refresh after the next valid change.",
      emptyTitle: "No items yet",
      emptyDescription: "Add a line item or pick a quote to seed items.",
      addLineItem: "Add line item",
    },
    addresses: {
      heading: "Addresses",
      subtitle: "Pick billing & shipping addresses",
      billingLabel: "Billing",
      shippingLabel: "Shipping",
      add: "Add",
      defaultBadge: "Default",
      editAddress: (label: string) => `Edit ${label}`,
      // Fallback subject in the edit aria-label when a row has no label.
      addressFallback: "address",
      billingEmptyTitle: "No billing addresses available.",
      shippingEmptyTitle: "No shipping addresses available.",
      emptyAddHint: 'Click "Add" to create one.',
    },
  },

  validation: {
    // Close Won creates a Sales Order from a lead/deal — every line must
    // resolve to a real catalog part (Part Number, Part Name, Category,
    // Brand/OEM) on both the parent row and every BOM child. The regular
    // SO form and from-quote paths stay permissive (freeform rows allowed);
    // this stricter rule only applies here. Each message maps to a specific
    // cell so the user can see exactly which field to fill.
    partNumberRequired: "Pick a part number.",
    partNameRequired: "Enter a part name.",
    categoryRequired: "Select a category.",
    oemRequired: "Pick a Brand/OEM.",
    conditionRequired: "Pick a condition.",
    priceRequired: "Enter a price greater than 0.",
  },

  toast: {
    calcFailed: (msg: string) => `Calculation failed — ${msg}`,
    calcFailedFallback: "Calculation failed",
    fillAccountFields: "Please fill all required account fields.",
    demoSoExists: "A sales order has already been created for this demo",
    soCreatedFromDemo: (orderNumber: string, demoNumber: string, total: string) =>
      `${orderNumber} created from ${demoNumber} — ${total}`,
    soFromDemoDescription: (poNumber: string, vendorName: string) =>
      `Back-to-back ${poNumber} raised on ${vendorName}.`,
    viewSo: "View SO",
    fixDiscount: "Fix the line discount — it cannot be 100% of the line amount.",
    incompleteRows: (count: number) =>
      `${count} item row${count === 1 ? " is" : "s are"} incomplete — set the part/item, quantity, rate and category, or remove ${count === 1 ? "it" : "them"}.`,
    // A rental order without its window would be created, seed an
    // agreement, and bill nothing — so this blocks rather than warns.
    rentalWindowRequired:
      "Pick the rental start and end dates — a rental order without them creates an agreement that bills nothing.",
    rentalWindowInverted: "The rental end date cannot be before the start date.",
    rentalOrderDateRequired: "Pick the rental order date.",
    orderTypeRequired: "Select an order type before creating the order.",
    pickBillingAddress: "Pick or add a billing address.",
    pickShippingAddress: "Pick or add a shipping address.",
    addValidItem:
      "Add at least one valid item. Free-form rows must pick a category.",
    pickAccountType: "Pick an Account Type to continue.",
    pickIndustry: "Pick an Industry to continue.",
    accountDeleted:
      "This deal's account has been deleted — it can't be moved to Closed Won.",
  },
} as const
