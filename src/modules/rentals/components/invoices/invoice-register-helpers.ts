import type { TabConfig } from "@/components/common/tables/BusinessMetricsTable";

import type { CreditNoteRegisterRow } from "../../api/credit-notes";
import type {
  AutoInvoiceDay,
  RentalInvoiceRegisterSummary,
  RentalInvoiceRow,
} from "../../api/invoices";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import {
  AUTO_DAY_COLUMNS,
  CREDIT_NOTE_REGISTER_COLUMNS,
  INVOICE_COLUMNS,
  toAutoDayRow,
  toCreditNoteRegisterRow,
  toInvoiceRow,
} from "./invoice-register.columns";

import { CREDIT_NOTES_TAB } from "../../hooks/invoices/useInvoiceRegisterView";

type Rows = Record<string, unknown>[];

/** Valid (every non-voided invoice) / Voided / Auto / Credit notes as tabs.
 *  The Auto tab carries no count pill: the others count documents, it would
 *  count days. The Credit notes count is its query's total, known once that
 *  tab has loaded. */
export function buildRegisterTabs(args: {
  invoices: { items: RentalInvoiceRow[] } | undefined;
  autoDays: { items: AutoInvoiceDay[] } | undefined;
  creditNotes: { items: CreditNoteRegisterRow[]; total: number } | undefined;
  summary: RentalInvoiceRegisterSummary | undefined;
}): TabConfig[] {
  const { summary } = args;
  const invoiceRows: Rows = (args.invoices?.items ?? []).map(toInvoiceRow);
  const autoRows: Rows = (args.autoDays?.items ?? []).map(toAutoDayRow);
  const creditNoteRows: Rows = (args.creditNotes?.items ?? []).map(toCreditNoteRegisterRow);
  const creditNoteCount = args.creditNotes?.total;
  return [
    { id: "live", label: S.invoices.tabs.live, count: summary?.live_count, columns: INVOICE_COLUMNS, data: invoiceRows },
    { id: "voided", label: S.invoices.tabs.voided, count: summary?.deleted_count, columns: INVOICE_COLUMNS, data: invoiceRows },
    { id: "auto", label: S.invoices.tabs.auto, columns: AUTO_DAY_COLUMNS, data: autoRows },
    {
      id: CREDIT_NOTES_TAB,
      label: S.invoices.tabs.creditNotes,
      count: creditNoteCount,
      columns: CREDIT_NOTE_REGISTER_COLUMNS,
      data: creditNoteRows,
    },
  ];
}

const TAB_COPY: Record<string, { loadError: string; empty: { title: string; description: string } }> = {
  auto: {
    loadError: S.invoices.autoDays.loadError,
    empty: { title: S.invoices.autoDays.empty, description: S.invoices.autoDays.emptyHint },
  },
  [CREDIT_NOTES_TAB]: {
    loadError: S.invoices.creditNoteRegister.loadError,
    empty: {
      title: S.invoices.creditNoteRegister.empty,
      description: S.invoices.creditNoteRegister.emptyHint,
    },
  },
};

const INVOICE_TAB_COPY = {
  loadError: S.invoices.loadError,
  empty: { title: S.invoices.empty, description: S.invoices.emptyHint },
};

/** Where a register row opens: the invoice, or on the Credit notes tab the
 *  note's own page. (Auto-run days are not documents and open nothing.) */
export function registerRowHref(tab: string, id: string): string {
  return tab === CREDIT_NOTES_TAB ? `/rentals/credit-notes/${id}` : `/rentals/invoices/${id}`;
}

/** What the active tab says when it is empty or fails to load. */
export function registerTabCopy(tab: string) {
  return TAB_COPY[tab] ?? INVOICE_TAB_COPY;
}
