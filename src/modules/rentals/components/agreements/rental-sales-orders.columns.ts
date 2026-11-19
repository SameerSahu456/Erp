import type { ColumnDef } from "@/components/common/tables/BusinessMetricsTable";
import { EMPTY_VALUE } from "@/shared/constants";

import type { RentalSalesOrderRow } from "../../api/sales-orders";
import {
  SALES_ORDER_TABS,
  type SalesOrderTabId,
} from "../../hooks/agreements/useRentalSalesOrdersView";
import { formatRentalDay } from "../../lib/format";
import { PURCHASE_ORDER_STRINGS as PO } from "../purchase-orders/purchase-orders.strings";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

const C = S.list.columns;

// No `truncate`: the grid pans. `sortable` mirrors exactly what the backend
// accepts. No column is `filterable`: the filters are the rentals filter bar
// (`salesOrderFilterBar`), not BMT's per-column dropdowns.
export const SALES_ORDER_COLUMNS: ColumnDef[] = [
  { key: "orderNumber", label: C.order, sortable: true },
  { key: "account", label: C.account, sortable: true },
  { key: "soStatus", label: C.soStatus, sortable: true },
  { key: "rentalStatus", label: C.rentalStatus, sortable: true },
  { key: "monthlyRate", label: C.monthlyRate, sortable: true, align: "right" },
  { key: "lines", label: C.lines, sortable: true, align: "right" },
  { key: "units", label: C.units, sortable: true, align: "right" },
  { key: "period", label: C.period },
  { key: "billedThrough", label: C.billedThrough },
  { key: "po", label: PO.list.column, sortable: true },
  { key: "configure", label: C.actions, align: "right" },
];

/** Flatten one wire row into the table's cell vocabulary; `_` keys feed the
 *  cell renderers only. */
export function toSalesOrderRow(r: RentalSalesOrderRow): Record<string, unknown> {
  return {
    id: r.sales_order_id,
    orderNumber: r.order_number,
    account: r.account_name ?? EMPTY_VALUE,
    soStatus: r.so_status,
    rentalStatus: r.rental_status ?? "",
    monthlyRate: r.monthly_rate,
    _expectedRate: r.expected_monthly_rate,
    lines: r.lines,
    units: r.units,
    period: S.period(formatRentalDay(r.start_date), formatRentalDay(r.end_date)),
    billedThrough: r.last_billed_date ? formatRentalDay(r.last_billed_date) : S.summary.notBilledYet,
    configure: "",
    po: r.po_state ?? "",
    _poRequired: r.po_required,
    _poOverdueDays: r.po_overdue_days ?? null,
    _poUnbilled: r.po_unbilled_estimate ?? null,
    _poEnd: r.end_date,
    _isConfigured: r.is_configured,
    _reconfigureRequired: r.reconfigure_required,
    _needsConfiguration: r.needs_configuration,
    _canConfigure: r.can_configure,
  };
}

/** Four views of one query: the active tab holds the rows, the others none.
 *  Every header carries its count under the current filters. */
export function salesOrderTabs(
  activeTab: string,
  rows: Record<string, unknown>[],
  countFor: (id: SalesOrderTabId) => number,
) {
  const tab = (id: SalesOrderTabId, label: string) => ({
    id,
    label,
    count: countFor(id),
    columns: SALES_ORDER_COLUMNS,
    data: activeTab === id ? rows : [],
  });
  return [
    tab(SALES_ORDER_TABS.orders, PO.list.allTab),
    tab(SALES_ORDER_TABS.renewals, PO.list.renewalsTab),
    tab(SALES_ORDER_TABS.expiring, S.list.expiringTab),
    tab(SALES_ORDER_TABS.expired, S.list.expiredTab),
  ];
}

const EMPTY_BY_TAB: Record<string, { title: string; description: string }> = {
  [SALES_ORDER_TABS.renewals]: { title: PO.list.renewalsEmpty, description: PO.list.renewalsEmptyHint },
  [SALES_ORDER_TABS.expiring]: { title: S.list.expiringEmpty, description: S.list.expiringEmptyHint },
  [SALES_ORDER_TABS.expired]: { title: S.list.expiredEmpty, description: S.list.expiredEmptyHint },
};

export function salesOrderEmptyState(activeTab: string) {
  return EMPTY_BY_TAB[activeTab] ?? { title: S.list.empty, description: S.list.emptyHint };
}
