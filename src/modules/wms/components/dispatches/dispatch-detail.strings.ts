export const DISPATCH_DETAIL_STRINGS = {
  title: "Dispatch",
  loadError: "Couldn’t load this dispatch. Refresh to try again.",
  notFound: "Dispatch not found.",
  notFoundDescription: "It may have been cancelled, or the link is out of date.",
  // Sections
  overviewHeading: "Overview",
  linesHeading: "Units",
  logisticsHeading: "Logistics",
  documentsHeading: "Documents",
  // Overview fields
  overview: {
    type: "Type",
    source: "Source Document",
    account: "Account",
    warehouse: "From Warehouse",
    created: "Created",
    dispatchedAt: "Dispatched",
    notes: "Notes",
    cancellationReason: "Cancellation reason",
  },
  // Edit-logistics dialog
  editLogistics: "Edit Logistics",
  editLogisticsTitle: "Edit Logistics",
  editLogisticsDesc: "Capture the courier, docket, and freight details for this dispatch.",
  saveChanges: "Save changes",
  dialogCancel: "Cancel",
  // Line tree
  colSerial: "Serial",
  colVariant: "Variant",
  colStatus: "Status",
  component: "Component",
  primary: "Machine",
  noLines: "No units on this dispatch yet.",
  linesLoadError: "Couldn’t load this dispatch’s units. Refresh to try again.",
  unitsCount: (n: number) => `${n} unit${n === 1 ? "" : "s"}`,
  unitStatus: {
    pending: "Pending",
    dispatched: "Dispatched",
    cancelled: "Cancelled",
    returned: "Returned",
    sold: "Sold",
  } as Record<string, string>,
  // Logistics fields
  awb: "AWB / tracking no.",
  awbRequired: "AWB / tracking no. can't be left blank once dispatched.",
  courier: "Courier partner",
  docket: "Docket no.",
  mode: "Mode",
  packages: "No. of packages",
  freightCharges: "Freight charges",
  freightPaidBy: "Freight paid by",
  deliveryDate: "Delivered on",
  invoiceAmount: "Invoice amount",
  awbPlaceholder: "e.g. AWB123456789",
  courierPlaceholder: "e.g. Blue Dart, Delhivery",
  docketPlaceholder: "e.g. DKT-0045218",
  packagesPlaceholder: "e.g. 3",
  freightChargesPlaceholder: "e.g. 1500",
  invoiceAmountPlaceholder: "e.g. 25000",
  saveLogistics: "Save logistics",
  saving: "Saving…",
  // Documents
  docType: "Document type",
  uploadBtn: "Upload",
  uploading: "Uploading…",
  noDocs: "No documents uploaded.",
  delete: "Delete",
  view: "View",
  addMoreDocs: "Add more documents",
  uploadDocs: "Upload documents",
  docsHint: "PDF, JPG, or PNG · up to 20 MB per file",
  openDocError: "Could not open the document.",
  // One summary toast after a batch upload (per-file success is silenced;
  // per-file errors still surface individually).
  docsUploaded: (n: number) =>
    n === 1 ? "Document uploaded" : `${n} documents uploaded`,
  removeDocTitle: "Remove Document?",
  removeDocDesc: (name: string) => `“${name}” will be removed from this dispatch.`,
  removeConfirm: "Remove",
  // Actions
  finalise: "Finalise dispatch",
  finalising: "Finalising…",
  cancel: "Cancel dispatch",
  recall: "Cancel / recall",
  cancelling: "Cancelling…",
  cancelReasonPrompt: "Reason for cancelling this dispatch:",
  cancelDialog: {
    title: "Cancel this dispatch?",
    description:
      "The dispatch is cancelled and its units return to the ready-for-dispatch queue.",
    // A vendor consignment never went through the ready-for-dispatch queue.
    vendorReturnDescription:
      "The dispatch is cancelled. Its units come back to the purchase return as waiting to ship, and the return is reopened.",
    reasonLabel: "Reason",
    reasonPlaceholder: "Why is this dispatch being cancelled?",
    dismiss: "Keep dispatch",
    confirm: "Cancel dispatch",
    // §0.9 — disabled-confirm tooltip naming the empty required reason.
    blockedReason: "Enter a reason to continue.",
  },
  // A replacement part shipped into the customer's device (spec D15).
  fitterDialog: {
    title: "Who fits the part?",
    description:
      "This dispatch ships a replacement part for the customer's own device. It is recorded as fitted in that device either way.",
    label: "Fitted by",
    dismiss: "Back",
    confirm: "Finalise dispatch",
  },
  linesFrozen: "Units are frozen — this dispatch has shipped.",
  none: "—",
} as const;

export const DISPATCH_DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "eway_bill", label: "E-way bill" },
  { value: "packing_list", label: "Packing list" },
  { value: "delivery_challan", label: "Delivery challan" },
  { value: "other", label: "Other" },
] as const;

export const DISPATCH_MODES = [
  { value: "courier", label: "Courier" },
  { value: "road", label: "Road" },
  { value: "air", label: "Air" },
  { value: "rail", label: "Rail" },
  { value: "hand_delivery", label: "Hand delivery" },
] as const;

export const FREIGHT_PAID_BY = [
  { value: "consignor", label: "Consignor" },
  { value: "consignee", label: "Consignee" },
  { value: "to_pay", label: "To pay" },
] as const;
