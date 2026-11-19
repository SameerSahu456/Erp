import { useSearchParams } from "react-router-dom";

import { useMemoryState } from "@/shared/hooks/useMemoryState";
import { asUuid } from "@shared/lib/validation";

import { orderedYmd } from "../../lib/dateRange";
import { useServerListView } from "../shared/useServerListView";
import { useCreditNoteRegister } from "./useCreditNotes";
import {
  useAutoInvoiceDays,
  useInvoiceRegisterSummary,
  useRentalInvoices,
} from "./useRentalInvoices";

// Matches the table's `persistKey` and the section `useScopedViewReset` wipes.
const VIEW_KEY = "rentals-invoices";

// `period` sorts on the period START: the cell's display string would
// alphabetise to nonsense. Only what the backend accepts is listed.
const SORT_FIELD_BY_COLUMN: Record<string, string> = {
  number: "invoice",
  account: "account",
  period: "period",
  issued: "issued",
  due: "due",
  lines: "lines",
  total: "total",
};

interface ActiveQuery {
  data?: { total: number };
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/** The register's credit-notes tab (2026-11-17: back on this page; the
 *  Adjustments page keeps its own list too). A row opens the note's page. */
export const CREDIT_NOTES_TAB = "credit_notes";

/** A tab remembered from an older layout falls back to Live rather than
 *  rendering an empty view. */
const REGISTER_TABS = new Set(["live", "auto", "voided", CREDIT_NOTES_TAB]);

/** The invoice register's view state (memory state, so a detail round trip
 *  keeps it) and the three queries behind its four tabs — only the active
 *  tab's query runs. */
export function useInvoiceRegisterView() {
  const view = useServerListView({ viewKey: VIEW_KEY, sortFields: SORT_FIELD_BY_COLUMN });
  // The tab IS the voided filter; `voided_only`, not `include_deleted`
  // (which means live AND voided), so each tab is one exclusive set.
  const [rememberedTab, setActiveTab] = useMemoryState<string>(`${VIEW_KEY}:tab`, "live");
  const activeTab = REGISTER_TABS.has(rememberedTab) ? rememberedTab : "live";
  // Issue date, not period: the date the document carries.
  const [issued, setIssued] = useMemoryState<{ from?: string; to?: string }>(`${VIEW_KEY}:issued`, {});
  // `?so=` (the order card's "View all") is parsed, not trusted (§11.1).
  const [searchParams] = useSearchParams();
  const scopedSalesOrderId = asUuid(searchParams.get("so")) ?? undefined;

  const autoTab = activeTab === "auto";
  const creditNotesTab = activeTab === CREDIT_NOTES_TAB;
  const invoiceTab = !autoTab && !creditNotesTab;
  const range = orderedYmd(issued);
  const paging = { page: view.page, page_size: view.pageSize };

  const invoices = useRentalInvoices(
    {
      ...paging,
      q: view.q,
      sales_order_id: scopedSalesOrderId,
      sort: view.sortParam,
      voided_only: activeTab === "voided",
      date_from: range.from,
      date_to: range.to,
    },
    { enabled: invoiceTab },
  );
  const autoDays = useAutoInvoiceDays(paging, { enabled: autoTab });
  // Searched by invoice no., CN no. or account (the register's `q`).
  const creditNotes = useCreditNoteRegister(
    { ...paging, q: view.q },
    { enabled: creditNotesTab },
  );
  const summary = useInvoiceRegisterSummary();

  const activeQuery: ActiveQuery = autoTab ? autoDays : creditNotesTab ? creditNotes : invoices;

  return {
    view,
    activeTab,
    setActiveTab: view.withPageReset(setActiveTab),
    issued,
    setIssued: view.withPageReset(setIssued),
    autoTab,
    creditNotesTab,
    invoiceTab,
    invoices,
    autoDays,
    creditNotes,
    summary,
    activeQuery,
  };
}
