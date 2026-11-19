import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { ListPageShell } from "@/components/page-shells";
import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";
import { usePermission } from "@shared/rbac";

import { ExportMenu } from "../exports/ExportMenu";
import { usePartsListView } from "../../hooks/parts/usePartsListView";
import { usePartsListDeletes } from "../../hooks/parts/usePartsListDeletes";
import { imsCan, imsPermissions } from "../../permissions";
import { PARTS_STRINGS } from "./parts.strings";
import {
  buildPartsColumns,
  partRowHref,
  PARTS_CONDITION_FILTER_OPTIONS,
  PARTS_NEW_PATH,
} from "./parts-list.columns";
import {
  PartAliasesCell,
  PartConditionCell,
  PartPriceCell,
  PartQtyCell,
  PartRowActions,
  PartSkuLink,
  PartTypeBadge,
} from "./PartsListCells";
import { PartsCategoryFilter, PartsOemFilter } from "./PartsListFilters";
import { DeletePartDialog, DeleteVariantDialog } from "./PartsDeleteDialogs";

const L = PARTS_STRINGS.list;
const CATALOG_EXPORT = ["catalog"] as const;

type Row = Record<string, unknown>;
type Deletes = ReturnType<typeof usePartsListDeletes>;
interface CellCtx {
  canEditPrice: boolean;
  deletes: Deletes;
}
// `undefined` = fall back to BMT's default cell rendering.
type CellRenderer = (value: unknown, row: Row, ctx: CellCtx) => ReactNode | undefined;

function PartsRowActionsCell({ row, deletes }: { row: Row; deletes: Deletes }) {
  const label = (row._label as string) ?? (row.sku as string);
  const id = row._id as string | undefined;
  const partId = row._partId as string | undefined;
  if (row._kind === "variant") {
    if (!id || !partId) return <span />;
    return (
      <PartRowActions
        label={label}
        editHref={`/ims/parts/${partId}/variants/${id}/edit`}
        editTitle={L.tooltips.editVariant}
        deleteTitle={L.tooltips.deleteVariant}
        testIdPrefix="variant"
        deleteDisabled={deletes.deleteVariant.isPending}
        onDelete={() => deletes.requestVariantDelete({ partId, variantId: id, label })}
      />
    );
  }
  if (!id) return <span />;
  return (
    <PartRowActions
      label={label}
      editHref={`/ims/parts/${id}/edit`}
      editTitle={L.tooltips.editPart}
      deleteTitle={L.tooltips.deletePart}
      testIdPrefix="part"
      deleteDisabled={deletes.deletePart.isPending || deletes.deleteVariant.isPending}
      onDelete={() => deletes.requestPartDelete({ id, label })}
    />
  );
}

const CELL_RENDERERS: Record<string, CellRenderer> = {
  sku: (v, row) => (typeof v === "string" ? <PartSkuLink row={row} value={v} /> : undefined),
  // Long descriptions ellipsize with the full text in a styled tooltip.
  description: (v) => (typeof v === "string" ? <TruncatedText value={v} className="max-w-full" /> : undefined),
  type: (v) => (typeof v === "string" ? <PartTypeBadge value={v} /> : undefined),
  aliases: (v) => <PartAliasesCell aliases={v as string[] | undefined} />,
  condition: (v) => <PartConditionCell value={v} />,
  qty: (v) => <PartQtyCell value={v} />,
  price: (v, row, ctx) => <PartPriceCell row={row} value={v} canEditPrice={ctx.canEditPrice} />,
  actions: (_v, row, ctx) => <PartsRowActionsCell row={row} deletes={ctx.deletes} />,
};

export function PartsBody() {
  const navigate = useNavigate();
  const view = usePartsListView();
  const deletes = usePartsListDeletes();
  // Read-only users see data but no Add / Edit / Delete affordances.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);
  // Price editing is its own authority (not ims:manage). FlatPartRow has no
  // per-row can_edit_price, so out-of-scope PMs get a 403 toast on save.
  const canEditPrice = can([imsPermissions.PRICE_WRITE]);
  const ctx: CellCtx = { canEditPrice, deletes };

  const cellFormatter: CellFormatter = (value, key, row) => {
    const display = CELL_RENDERERS[key]?.(value, row, ctx);
    return display === undefined ? null : { display };
  };

  return (
    <ListPageShell
      title={L.title}
      subtitle={L.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu exportTypes={CATALOG_EXPORT} filters={view.exportFilters} />
          {canWrite ? (
            <Button render={<Link to={PARTS_NEW_PATH} />}>
              <Plus className="mr-1.5 size-4" />
              {L.addPart}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="bmt-search-lg">
        <BusinessMetricsTable
          className="ims-bmt-compact-filters"
          useAsyncFilterDropdowns
          showIndex
          renderFilter={({ column, value, onChange }) => {
            if (column.key === "category") return <PartsCategoryFilter value={value} onChange={onChange} />;
            if (column.key !== "brand") return null;
            return (
              <PartsOemFilter
                value={value}
                onChange={onChange}
                option={view.oemOption}
                onOptionChange={view.setOemOption}
              />
            );
          }}
          tabs={[
            {
              id: "parts",
              label: L.tabLabel(view.total),
              columns: buildPartsColumns({ showPrice: view.showPrice, canWrite }),
              data: view.rows,
            },
          ]}
          cellFormatter={cellFormatter}
          searchable
          onSearchChange={view.setSearch}
          persistKey="ims-parts"
          serverPagination={{
            page: view.page,
            pageSize: view.pageSize,
            total: view.total,
            isFetching: view.partsQuery.isFetching,
            onPageChange: view.setPage,
            // usePageSizeParam resets the page key atomically.
            onPageSizeChange: view.setPageSize,
            sort: view.sort,
            onSortChange: view.onSortChange,
            filters: view.tableFilters,
            onFiltersChange: view.onFiltersChange,
            filterOptions: { condition: PARTS_CONDITION_FILTER_OPTIONS },
            searchableFilterColumns: [],
          }}
          onRowClick={(row) => navigate(partRowHref(row))}
          error={
            view.partsQuery.isError
              ? { title: L.error.title, description: L.error.description, onRetry: () => void view.partsQuery.refetch() }
              : undefined
          }
          emptyState={{
            title: L.empty.title,
            description: L.empty.description,
            action: canWrite ? { label: L.empty.action, onClick: () => navigate(PARTS_NEW_PATH) } : undefined,
          }}
          // Clear drops every server-side filter, back to the unfiltered list.
          onClearFilters={view.clearFilters}
          externalFiltersActive={view.externalFiltersActive}
        />
      </div>

      <DeleteVariantDialog
        pending={deletes.pendingVariant}
        onClose={deletes.closeVariant}
        isPending={deletes.deleteVariant.isPending}
        onConfirm={deletes.confirmVariant}
      />
      <DeletePartDialog
        pending={deletes.pendingPart}
        onClose={deletes.closePart}
        isPending={deletes.deletePart.isPending}
        onConfirm={deletes.confirmPart}
      />
    </ListPageShell>
  );
}
