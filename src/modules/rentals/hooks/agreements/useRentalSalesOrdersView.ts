import { useMemoryState } from "@/shared/hooks/useMemoryState";
import { useTabCounts } from "@shared/hooks";

import type { RentalStatus } from "../../api/agreements";
import type { PoState } from "../../api/purchase-orders";
import {
  fetchRentalSalesOrders,
  type FetchRentalSalesOrdersParams,
} from "../../api/sales-orders";
import { PO_STATES } from "../../constants/billing";
import { orderedYmd } from "../../lib/dateRange";
import { rentalKeys } from "../shared/keys";
import { useServerListView } from "../shared/useServerListView";
import { useRentalSalesOrderFacets, useRentalSalesOrders } from "./useRentalSalesOrders";

/** Matches the table's `persistKey` and the keys `useScopedViewReset` clears. */
export const SALES_ORDERS_VIEW_KEY = "rentals-sales-orders";
export const SALES_ORDER_TABS = {
  orders: "orders",
  renewals: "renewals",
  expiring: "expiring",
  expired: "expired",
} as const;
export type SalesOrderTabId = (typeof SALES_ORDER_TABS)[keyof typeof SALES_ORDER_TABS];
const SALES_ORDER_TAB_IDS: readonly SalesOrderTabId[] = Object.values(SALES_ORDER_TABS);

/** Table column key → backend sort field; a column absent here never sorts. */
const SORT_FIELDS: Record<string, string> = {
  orderNumber: "order_number",
  account: "account",
  soStatus: "so_status",
  rentalStatus: "rental_status",
  monthlyRate: "rate",
  lines: "lines",
  units: "units",
  period: "start_date",
  billedThrough: "last_billed_date",
  // Money at risk on a lapsed PO.
  po: "po_unbilled",
};

/** "PO renewals due" tab = every PO state, soonest end first. */
const RENEWAL_STATES: PoState[] = [...PO_STATES];

export interface SalesOrderStatusFilter {
  soStatus?: string;
  rentalStatus?: RentalStatus;
}

/** The rental sales-order register's view: memory-state filters (they survive
 *  a detail round trip), the debounced query and the facets. */
export function useRentalSalesOrdersView() {
  const view = useServerListView({ viewKey: SALES_ORDERS_VIEW_KEY, sortFields: SORT_FIELDS });
  const k = (name: string) => `${SALES_ORDERS_VIEW_KEY}:${name}`;
  // Sales-order CREATION window as `YYYY-MM-DD` strings (serialisable).
  const [created, setCreated] = useMemoryState<{ from?: string; to?: string }>(k("created"), {});
  const [status, setStatus] = useMemoryState<SalesOrderStatusFilter>(k("status"), {});
  const [activeTab, setActiveTab] = useMemoryState<string>(k("tab"), SALES_ORDER_TABS.orders);
  // Ordered: a remembered range could be inverted, which the API 422s.
  const range = orderedYmd(created);

  /** One tab's rows as the server filters them: the shared filters, search
   *  and date range, plus what the tab itself means. The list and every tab
   *  count are built from this, so a count can never disagree with its rows. */
  const filtersFor = (tab: SalesOrderTabId): FetchRentalSalesOrdersParams => {
    const renewals = tab === SALES_ORDER_TABS.renewals;
    return {
      q: view.q,
      account: view.filters.account || undefined,
      so_status: status.soStatus ? [status.soStatus] : undefined,
      rental_status: status.rentalStatus ? [status.rentalStatus] : undefined,
      created_from: range.from,
      created_to: range.to,
      po_state: renewals ? RENEWAL_STATES : undefined,
      expiring: tab === SALES_ORDER_TABS.expiring || undefined,
      expired: tab === SALES_ORDER_TABS.expired || undefined,
    };
  };

  const tab = activeTab as SalesOrderTabId;
  const query = useRentalSalesOrders({
    ...filtersFor(tab),
    page: view.page,
    page_size: view.pageSize,
    // Renewals / ending / expired read soonest-ending first unless a header says otherwise.
    sort: view.sortParam ?? (tab === SALES_ORDER_TABS.orders ? undefined : "end_date"),
  });
  const facets = useRentalSalesOrderFacets().data;
  // Each header's count follows the same filters; the active tab reuses the
  // list's own total (§16.7 — no per-tab page_size:1 query for it).
  const countFor = useTabCounts({
    tabIds: SALES_ORDER_TAB_IDS,
    activeTab: tab,
    activeTotal: query.data?.total ?? 0,
    paramsFor: (id) => ({ ...filtersFor(id), page: 1, page_size: 1 }),
    queryKey: (params) => rentalKeys.salesOrders.count(params),
    fetchCount: fetchRentalSalesOrders,
  });

  return {
    ...view,
    query,
    facets,
    countFor,
    created,
    setCreated: view.withPageReset(setCreated),
    status,
    setStatus: view.withPageReset(setStatus),
    activeTab,
    setActiveTab: view.withPageReset(setActiveTab),
  };
}

export type RentalSalesOrdersView = ReturnType<typeof useRentalSalesOrdersView>;
