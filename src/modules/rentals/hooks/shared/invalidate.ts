import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { rentalKeys } from "./keys";

// One named helper per feature (§16.9.1 rule 2): exactly what a write changes.

const K = rentalKeys;

function invalidate(qc: QueryClient, keys: readonly QueryKey[]) {
  for (const queryKey of keys) void qc.invalidateQueries({ queryKey });
}

/** These orders (billing, versions, POs, rate targets, …) and the list rows. */
export function invalidateSalesOrders(qc: QueryClient, ids: readonly string[]) {
  invalidate(qc, ids.map((id) => K.salesOrders.detail(id)));
  invalidate(qc, [K.salesOrders.lists(), K.salesOrders.counts()]);
}

export function invalidateSalesOrder(qc: QueryClient, id: string) {
  invalidateSalesOrders(qc, [id]);
}

export interface DeviceRef {
  id: string;
  sales_order_id?: string | null;
  live_sales_order_id?: string | null;
}

/** Units whose ids the write does not return: lists, details, summary, pickers. */
export function invalidateDevices(qc: QueryClient) {
  const D = K.devices;
  invalidate(qc, [D.lists(), D.details(), D.summaryAll(), D.optionsAll()]);
}

/** One unit (+ history, bounds), the unit lists / summary / pickers, and the
 *  order it bills on when known. */
export function invalidateDevice(qc: QueryClient, device: DeviceRef) {
  const D = K.devices;
  invalidate(qc, [D.detail(device.id), D.lists(), D.summaryAll(), D.optionsAll()]);
  const soIds = [device.sales_order_id, device.live_sales_order_id].filter(
    (id): id is string => !!id,
  );
  invalidate(qc, [...new Set(soIds)].map((id) => K.salesOrders.detail(id)));
}

/** The register (lists, totals, auto days, previews, print sets) and, when
 *  given, the orders the invoices bill. */
export function invalidateInvoices(qc: QueryClient, soIds?: readonly string[]) {
  const I = K.invoices;
  invalidate(qc, [
    I.lists(),
    I.counts(),
    I.summary(),
    I.autoDaysAll(),
    I.previewAll(),
    I.documentsAll(),
  ]);
  if (soIds?.length) invalidateSalesOrders(qc, soIds);
}

/** One invoice's credit notes (every invoice's when unknown) and the register. */
export function invalidateCreditNotes(qc: QueryClient, invoiceId?: string) {
  invalidate(qc, [
    invoiceId ? K.invoices.creditNotes(invoiceId) : K.invoices.details(),
    K.creditNoteRegister.lists(),
  ]);
}

/** Deliberately wide: a run raises invoices, moves anchors and closes orders. */
export function invalidateAfterBillingRun(qc: QueryClient) {
  invalidate(qc, [K.invoices.all, K.devices.all, K.salesOrders.all, K.settings.app]);
}
