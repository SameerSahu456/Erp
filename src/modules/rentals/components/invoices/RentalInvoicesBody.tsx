import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus } from "lucide-react";

import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable";
import { ListPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { PAGINATION } from "@/shared/constants";
import { PermissionGuard, usePermission } from "@shared/rbac";

import { RENTALS_LIST_MAX_CELL_CHARS } from "../../constants/list";
import { useInvoiceRegisterView } from "../../hooks/invoices/useInvoiceRegisterView";
import { rentalsCan } from "../../permissions";
import { FilterDateRange } from "../shared/filters/FilterDateRange";
import { FilterSearch } from "../shared/filters/FilterSearch";
import { filterBar } from "../shared/filters/filterBar";
import { RENTALS_FILTER_STRINGS as F } from "../shared/filters/filters.strings";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { ExportInvoicesDialog } from "./ExportInvoicesDialog";
import { InvoiceRegisterStats } from "./InvoiceRegisterStats";
import { invoiceRegisterCell } from "./invoice-register.cells";
import { buildRegisterTabs, registerRowHref, registerTabCopy } from "./invoice-register-helpers";

/** The rental invoice register: live, voided, auto-run days and credit
 *  notes (each opening its own page). */
export function RentalInvoicesBody() {
  const navigate = useNavigate();
  const r = useInvoiceRegisterView();
  const { view } = r;
  // Not memory state: a dialog is not part of the view.
  const [exportOpen, setExportOpen] = useState(false);
  // The export endpoints are gated on `rentals:invoice_export`.
  const canExport = usePermission().canAny(rentalsCan.exportInvoices);

  const tabs = buildRegisterTabs({
    invoices: r.invoices.data,
    autoDays: r.autoDays.data,
    creditNotes: r.creditNotes.data,
    summary: r.summary.data,
  });
  const openRow = r.autoTab
    ? undefined
    : (row: Record<string, unknown>) => navigate(registerRowHref(r.activeTab, String(row.id)));
  const copy = registerTabCopy(r.activeTab);
  // The rentals filter bar. A day row has nothing to match on, so the auto
  // tab has no search; only the invoice tabs take an issue-date window.
  const filters = filterBar([
    ...(r.autoTab
      ? []
      : [
          {
            key: "search",
            active: view.search.trim() !== "",
            node: (
              <FilterSearch
                value={view.search}
                onChange={view.setSearch}
                placeholder={F.search}
                clearAriaLabel={F.clearSearch}
              />
            ),
          },
        ]),
    ...(r.invoiceTab
      ? [
          {
            key: "issued",
            active: !!(r.issued.from || r.issued.to),
            node: (
              <FilterDateRange
                value={r.issued}
                onChange={r.setIssued}
                placeholder={S.invoices.issuedFilter}
                disableFuture
              />
            ),
          },
        ]
      : []),
  ]);

  return (
    <ListPageShell
      title={S.invoices.title}
      subtitle={S.invoices.description}
      actions={
        <>
          {/* Export picks its own window: you export an accounting period,
              which rarely matches what you were browsing. */}
          {canExport ? (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="size-4" />
              {S.export.trigger}
            </Button>
          ) : null}
          <PermissionGuard required={[...rentalsCan.createInvoice]}>
            <Button onClick={() => navigate("/rentals/invoices/new")}>
              <Plus className="size-4" />
              {S.newInvoice.action}
            </Button>
          </PermissionGuard>
        </>
      }
      className="animate-fade-in-up"
      stats={r.summary.data ? <InvoiceRegisterStats summary={r.summary.data} /> : undefined}
    >
      <BusinessMetricsTable
        maxCellChars={RENTALS_LIST_MAX_CELL_CHARS}
        showIndex
        tabs={tabs}
        searchable={false}
        toolbarFilters={filters}
        onClearFilters={() => {
          view.setSearch("");
          r.setIssued({});
        }}
        cellFormatter={invoiceRegisterCell}
        onRowClick={openRow}
        persistKey="rentals-invoices"
        activeTab={r.activeTab}
        onTabChange={r.setActiveTab}
        serverPagination={{
          page: view.page,
          pageSize: view.pageSize,
          total: r.activeQuery.data?.total ?? 0,
          isFetching: r.activeQuery.isFetching,
          onPageChange: view.setPage,
          onPageSizeChange: view.setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          // The server sorts; reordering one page would look right and be wrong.
          sort: view.sort,
          onSortChange: (column, direction) => view.setSort({ column, direction }),
        }}
        error={
          r.activeQuery.isError
            ? { title: copy.loadError, onRetry: () => void r.activeQuery.refetch() }
            : undefined
        }
        emptyState={copy.empty}
      />
      <ExportInvoicesDialog open={exportOpen} onOpenChange={setExportOpen} />
    </ListPageShell>
  );
}
