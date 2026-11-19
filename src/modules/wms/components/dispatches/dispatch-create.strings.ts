export const DISPATCH_CREATE_STRINGS = {
  title: "Create Dispatch Request",
  subtitle: "Pick a source document, then select the ready units to ship.",
  // 2-step wizard (mirrors Inward): source + logistics, then line items.
  stepSource: "Source & Logistics",
  stepUnits: "Line Items",
  stepSubtitle: (n: number, lower: string) =>
    `Step ${n} of 2 — ${lower}. Required fields are marked with an asterisk (*).`,
  next: "Next",
  back: "Back",
  cancel: "Cancel",
  // Numbered section cards.
  dispatchInfoHeading: "Dispatch Info",
  dispatchInfoDesc: "Pick the source document this dispatch ships against.",
  typeLabel: "Type",
  // Selected-source summary card (below the picker).
  summaryAccount: "Account",
  summaryOrderDate: "Order Date",
  summaryOrderValue: "Order Value",
  summaryReady: "Issued Lines Ready",
  // Logistics (step 1) — optional; also editable later on the dispatch.
  logisticsHeading: "Logistics",
  logisticsHint:
    "The AWB / Tracking No. is required. The rest is optional — you can also add it later on the dispatch.",
  awb: "AWB / Tracking No.",
  courier: "Courier Partner",
  docket: "Docket No.",
  mode: "Mode",
  packages: "No. of Packages",
  freightCharges: "Freight Charges",
  freightPaidBy: "Freight Paid By",
  invoiceAmount: "Invoice Amount",
  awbPlaceholder: "e.g. AWB123456789",
  courierPlaceholder: "e.g. Blue Dart, Delhivery",
  docketPlaceholder: "e.g. DKT-0045218",
  packagesPlaceholder: "e.g. 3",
  freightChargesPlaceholder: "e.g. 1500",
  selectPlaceholder: "Select…",
  // Documents (staged at create, uploaded once the dispatch exists) + notes.
  docsHeading: "Documents",
  docsAttached: (n: number) => `${n} attached`,
  docTypeLabel: "Document Type",
  docView: "View document",
  docRemove: "Remove document",
  docRemoveConfirmTitle: "Remove This Document?",
  docRemoveConfirmBody: (name: string) =>
    `“${name}” will be removed from this dispatch. You can add it again before creating.`,
  docRemoveConfirm: "Remove",
  notesLabel: "Notes",
  notesPlaceholder: "Optional — special instructions, packaging notes…",
  docsUploadPartial:
    "Dispatch created, but some documents didn’t upload. Add them from the dispatch detail.",
  missingSource:
    "No source document. Open a Sales Order and use “Create dispatch” to start.",
  sourceTypeLabel: "Source Type",
  sourceLabel: "Source Document",
  // The picker's placeholder names the CHOSEN source type so it reads
  // "Search for Demo Request" when Demo is selected, not a fixed "sales
  // orders" line for every type. `label` is the selected SOURCE_TYPES label.
  pickSourcePlaceholderFor: (label: string) => `Search for ${label}`,
  // Option label suffix: how many QC-passed units are ready on this source.
  sourceReadyCount: (n: number) => `${n} ready`,
  chooseSourceFirst: "Choose a source document to see its ready units.",
  sourceNotSupported: "This source type isn’t available yet.",
  readyHeading: "Ready for Dispatch",
  readyDesc: "Select the issued, QC-passed units to ship on this dispatch.",
  selectedSuffix: "selected",
  selectAll: "Select all",
  colSerial: "Serial",
  colVariant: "Variant",
  colMi: "Material Issue",
  colComponents: "Components",
  componentsCount: (n: number) => `${n} component${n === 1 ? "" : "s"}`,
  none: "—",
  emptyTitle: "Nothing Ready to Dispatch",
  emptyBody:
    "This order has no issued, QC-passed units awaiting dispatch right now.",
  errorTitle: "Couldn’t Load Ready Units",
  errorBody: "The ready-for-dispatch list failed to load. Refresh to try again.",
  createBtn: "Create Dispatch",
  creating: "Creating…",
  created: "Dispatch created",
  createFailed: "Couldn’t create the dispatch.",
  unitsNotAdded: (reason: string) =>
    `The dispatch was saved as a draft, but its units couldn’t be added: ${reason}. Add them from the draft.`,
  multiWarehouse:
    "Selected units span multiple warehouses — dispatch one warehouse at a time.",
  unsupportedSource: (t: string) => `Dispatch from ${t} is not supported yet.`,
  // Why-tooltip on a source type that has no backend flow yet (§0.14).
  comingSoon: "This source type isn’t available yet.",
  // Why the step's action button is disabled — surfaced in a tooltip (§0.9).
  blocked: {
    needsSource: "Pick a source document to continue.",
    needsAwb: "Enter the AWB / Tracking No. to continue.",
    noUnits: "Select at least one unit to dispatch.",
  },
  // Inline field-level validation (§3/§9) — a plain-language message shown
  // under the empty required control, not a raw backend metadata error.
  validation: {
    awbRequired: "Please enter AWB Number.",
  },
} as const;
