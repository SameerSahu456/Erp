import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ListPageShell } from "@/components/page-shells";

import { type PageHeaderOverride, resolvePageHeader } from "../shared/page-header-override";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type ColumnDef,
} from "@/components/common/tables/BusinessMetricsTable";
import { EMPTY_VALUE, PAGINATION } from "@/shared/constants";
import { formatIST_date } from "@shared/lib/date";

import type { RentalPurchaseOrder } from "../../api/purchase-orders";
import { PO_INVOICING_LABELS } from "../../constants/billing";
import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list";
import { usePendingPurchaseOrders } from "../../hooks/purchase-orders/usePurchaseOrders";
import { formatRentalDay } from "../../lib/format";
import { PoDecisionDialog, type PoDecision } from "./PoDecisionDialog";
import { PURCHASE_ORDER_STRINGS as STRINGS } from "./purchase-orders.strings";

const S = STRINGS.approvals;
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

const COLUMNS: ColumnDef[] = [
  { key: "order", label: S.columns.order },
  { key: "po", label: S.columns.po },
  { key: "validTo", label: S.columns.validTo },
  { key: "invoicing", label: S.columns.invoicing },
  { key: "rates", label: S.columns.rates, align: "right" },
  { key: "raisedBy", label: S.columns.raisedBy },
  { key: "raisedOn", label: S.columns.raisedOn },
  { key: "actions", label: S.columns.actions, align: "right" },
];

function toRow(po: RentalPurchaseOrder): Record<string, unknown> {
  return {
    id: po.id,
    order: po.order_number ?? po.sales_order_id,
    po: po.po_number ?? STRINGS.awaitedNumber,
    validTo: formatRentalDay(po.valid_to),
    invoicing: po.invoicing ? PO_INVOICING_LABELS[po.invoicing] : EMPTY_VALUE,
    rates: po.line_rates?.length ?? 0,
    raisedBy: po.created_by_name ?? EMPTY_VALUE,
    raisedOn: formatIST_date(po.created_at),
    actions: "",
    _po: po,
  };
}

/** Extend PO requests waiting for approval — a rate change, or a PO that had
 *  already lapsed — decided by the rental manager, accounts or a sales
 *  manager given the code; the requester may decide their own (2026-11-14). */
export function PoApprovalsBody({ header }: { header?: PageHeaderOverride } = {}) {
  const pageHeader = resolvePageHeader(header, S.title);
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{
    po: RentalPurchaseOrder;
    decision: PoDecision;
  } | null>(null);
  const query = usePendingPurchaseOrders({ page, page_size: PAGE_SIZE });
  const rows = (query.data?.items ?? []).map(toRow);

  const cellFormatter: CellFormatter = (_value, key, row) => {
    const po = row._po as RentalPurchaseOrder;
    if (key === "order") {
      return {
        display: (
          <Link
            to={`/rentals/agreements/${po.sales_order_id}`}
            className="hover:underline"
          >
            {String(row.order)}
          </Link>
        ),
      };
    }
    if (key !== "actions") return null;
    return {
      display: (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => setDeciding({ po, decision: "approve" })}
          >
            {STRINGS.decision.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeciding({ po, decision: "reject" })}
          >
            {STRINGS.decision.reject}
          </Button>
        </div>
      ),
    };
  };

  return (
    <ListPageShell title={pageHeader.title} subtitle={S.description} toolbar={pageHeader.toolbar}>
      <BusinessMetricsTable
        showIndex
        // Long plain-text values are cut, full text on hover.
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        // The pending-PO endpoint takes no search, and on a server-paged
        // table BMT's own box filters nothing — so no search box at all.
        searchable={false}
        tabs={[{ id: "pending", label: S.title, columns: COLUMNS, data: rows }]}
        cellFormatter={cellFormatter}
        persistKey="rentals-po-approvals"
        serverPagination={{
          page,
          pageSize: PAGE_SIZE,
          total: query.data?.total ?? 0,
          isFetching: query.isFetching,
          onPageChange: setPage,
        }}
        error={
          query.isError
            ? { title: S.loadError, onRetry: () => void query.refetch() }
            : undefined
        }
        emptyState={{ title: S.empty, description: S.emptyHint }}
      />
      {deciding ? (
        <PoDecisionDialog
          purchaseOrder={deciding.po}
          decision={deciding.decision}
          onClose={() => setDeciding(null)}
        />
      ) : null}
    </ListPageShell>
  );
}
