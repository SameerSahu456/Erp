import type { Query } from "@tanstack/react-query";

/** Rentals query-key factory — the one source of rentals keys (§16.9.1).
 *  `['rentals', feature, kind, …]`; a record's sub-resources nest under
 *  `detail(id)` so one prefix refreshes one record. */
export const RENTALS_KEY = ["rentals"] as const;

function feature<F extends string>(name: F) {
  const all = [...RENTALS_KEY, name] as const;
  return {
    all,
    lists: () => [...all, "list"] as const,
    list: (params: unknown) => [...all, "list", params] as const,
    counts: () => [...all, "count"] as const,
    count: (params: unknown) => [...all, "count", params] as const,
    details: () => [...all, "detail"] as const,
    detail: (id: string) => [...all, "detail", id] as const,
  };
}

type Id = string | null | undefined;
// Disabled queries still need a key; "" keeps the shape stable.
const id = (value: Id) => value ?? "";

const salesOrders = feature("sales-orders");
const devices = feature("devices");
const invoices = feature("invoices");
const agreements = feature("agreements");

export const rentalKeys = {
  salesOrders: {
    ...salesOrders,
    billing: (soId: Id) => [...salesOrders.detail(id(soId)), "billing"] as const,
    versions: (soId: Id) => [...salesOrders.detail(id(soId)), "versions"] as const,
    rateTargets: (soId: Id) => [...salesOrders.detail(id(soId)), "rate-targets"] as const,
    extendBounds: (soId: Id) => [...salesOrders.detail(id(soId)), "extend-bounds"] as const,
    purchaseOrders: (soId: Id) => [...salesOrders.detail(id(soId)), "purchase-orders"] as const,
    /** Under `purchaseOrders`, so every PO write that refreshes the PO list
     *  refreshes the order's PO papers too. */
    purchaseOrderDocuments: (soId: Id) =>
      [...salesOrders.detail(id(soId)), "purchase-orders", "documents"] as const,
    earlyExit: (soId: Id) => [...salesOrders.detail(id(soId)), "early-exit"] as const,
  },
  /** List filter choices — its own root so an SO write never refetches them. */
  salesOrderFacets: [...RENTALS_KEY, "sales-order-facets"] as const,

  devices: {
    ...devices,
    history: (deviceId: Id) => [...devices.detail(id(deviceId)), "history"] as const,
    extendBounds: (deviceId: Id) => [...devices.detail(id(deviceId)), "extend-bounds"] as const,
    summaryAll: () => [...devices.all, "summary"] as const,
    summary: (params: unknown) => [...devices.all, "summary", params] as const,
    optionsAll: () => [...devices.all, "options"] as const,
    /** AsyncSelect pickers: `options(accountId, status, soId, q)`. */
    options: (...args: unknown[]) => [...devices.all, "options", ...args] as const,
    reconcile: () => [...devices.all, "identity-reconcile"] as const,
  },

  invoices: {
    ...invoices,
    document: (invoiceId: Id) => [...invoices.detail(id(invoiceId)), "document"] as const,
    creditNotes: (invoiceId: Id) => [...invoices.detail(id(invoiceId)), "credit-notes"] as const,
    summary: () => [...invoices.all, "summary"] as const,
    autoDaysAll: () => [...invoices.all, "auto-days"] as const,
    autoDays: (params: unknown) => [...invoices.all, "auto-days", params] as const,
    previewAll: () => [...invoices.all, "preview"] as const,
    preview: (params: unknown) => [...invoices.all, "preview", params] as const,
    documentsAll: () => [...invoices.all, "documents"] as const,
    documents: (params: unknown) => [...invoices.all, "documents", params] as const,
  },
  creditNoteRegister: feature("credit-note-register"),

  /** Keyed by AGREEMENT id: an amend spawns a version with no signatures. */
  agreements: {
    ...agreements,
    signatures: (agreementId: Id) => [...agreements.detail(id(agreementId)), "signatures"] as const,
  },

  accountSettings: feature("account-settings"),
  accountBillingClerks: feature("account-billing-clerks"),
  /** Sibling roots: saving one never refetches the other. */
  settings: {
    app: [...RENTALS_KEY, "settings", "app"] as const,
    poRenewal: [...RENTALS_KEY, "settings", "po-renewal"] as const,
  },

  poApprovals: feature("po-approvals"),
  /** Approvals → Rate change: extends that carry new rates. */
  extendApprovals: feature("extend-approvals"),
  swaps: feature("swaps"),
  adjustments: feature("billing-adjustments"),
  /** Approvals → Early exit: terminations and waivers, one queue. */
  earlyExitQueue: feature("early-exit-queue"),
  /** Termination and invoice-deletion requests awaiting a decision. */
  actionRequests: feature("action-requests"),
};

/** Predicate for one sub-resource across EVERY sales order (e.g. "early-exit"
 *  when the order is unknown) — exact-segment match, §16.9.1 rule 4. */
export function isSalesOrderSubQuery(sub: string) {
  return (query: Query): boolean => {
    const k = query.queryKey;
    return (
      k.length === 5 &&
      k[0] === RENTALS_KEY[0] &&
      k[1] === "sales-orders" &&
      k[2] === "detail" &&
      k[4] === sub
    );
  };
}
