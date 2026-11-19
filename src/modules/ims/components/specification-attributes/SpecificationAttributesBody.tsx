import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";
import {
  useClearFiltersOnReload,
  useFilterParams,
  useListSearchFilters,
  usePageSizeParam,
} from "@/shared/hooks";

import { usePermission } from "@shared/rbac";

import type { SpecificationAttribute, SpecificationAttributeSortField } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import {
  useDeleteSpecificationAttribute,
  useSpecificationAttributesPaged,
} from "../../hooks/specification-attributes/useSpecificationAttributes";
import { resolveSortParam } from "../../lib/list-params";
import { imsCan } from "../../permissions";
import { SPEC_ATTRIBUTES_STRINGS } from "./specification-attributes.strings";

const L = SPEC_ATTRIBUTES_STRINGS.list;

// BMT column key → backend `sort` field. Only these are server-sortable.
const SORT_FIELD_MAP: Record<string, "name" | "created_at"> = {
  name: "name",
  created_at: "created_at",
};

export function SpecificationAttributesBody() {
  // Refresh = "start over" for filters (same as every IMS master list).
  useClearFiltersOnReload();

  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  const { get, set, setMany, clear: clearFilters } = useFilterParams();
  const search = get("search");
  const sortRaw = get("sort");
  const page = Math.max(1, Number(get("page", "1")) || 1);
  const setSearch = (v: string) => set("search", v.slice(0, IMS_SEARCH_MAX_LEN));
  const setPage = (n: number) => set("page", n > 1 ? String(n) : null);
  const [pageSize, setPageSize] = usePageSizeParam({ defaultSize: IMS_PAGE_SIZE });

  const sortColumnKey = sortRaw.replace(/^-/, "");
  const sortDirection: "asc" | "desc" | null =
    sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc";
  // Unknown columns are dropped, not passed through (§11.1).
  const sortParam = resolveSortParam(sortRaw, SORT_FIELD_MAP) as
    | SpecificationAttributeSortField
    | undefined;

  const { searchParam, externalFiltersActive } = useListSearchFilters({
    search,
    maxLength: IMS_SEARCH_MAX_LEN,
  });

  const query = useSpecificationAttributesPaged({
    page,
    page_size: pageSize,
    search: searchParam,
    sort: sortParam,
  });
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;

  const [pendingDelete, setPendingDelete] = useState<SpecificationAttribute | null>(null);
  const deleteAttr = useDeleteSpecificationAttribute();

  const openCreate = () => navigate("/ims/specification-attributes/new");
  const openEdit = (a: SpecificationAttribute) =>
    navigate(`/ims/specification-attributes/${a.id}/edit`);

  const tab: TabConfig = useMemo(
    () => ({
      id: "specification-attributes",
      label: `${L.title} (${total})`,
      columns: [
        { key: "name", label: L.columns.name, sortable: true, width: "220px" },
        { key: "values", label: L.columns.values },
        { key: "categories", label: L.columns.categories, align: "right" as const, width: "120px" },
        { key: "status", label: L.columns.status, width: "120px" },
        ...(canWrite
          ? ([
              { key: "actions", label: L.columns.actions, align: "right" as const, width: "120px" },
            ] as const)
          : []),
      ],
      data: rows.map((a) => ({
        name: a.name,
        values: a.values,
        categories: a.categories_count,
        status: a.is_active,
        actions: a.id,
        _id: a.id,
        _attr: a,
      })),
    }),
    [rows, total, canWrite],
  );

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "values") {
      const list = (value as string[]) ?? [];
      return {
        display: (
          <OverflowPillList
            items={list}
            getItemKey={(v) => v}
            getItemLabel={(v) => v}
            summaryLabel={L.columns.values}
            hoverTitle={L.columns.values}
            emptyLabel={L.noValues}
          />
        ),
      };
    }
    if (key === "categories") {
      return { display: <span className="tabular-nums">{String(value)}</span> };
    }
    if (key === "status") {
      return {
        display: (
          <StatusBadge variant={value ? "success" : "neutral"}>
            {value ? L.active : L.inactive}
          </StatusBadge>
        ),
      };
    }
    if (key === "actions") {
      if (!canWrite) return { display: null };
      const attr = row._attr as SpecificationAttribute | undefined;
      if (!attr) return null;
      return {
        display: (
          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(attr);
              }}
              aria-label={L.editAriaLabel(attr.name)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDelete(attr);
              }}
              disabled={deleteAttr.isPending}
              aria-label={L.deleteAriaLabel(attr.name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      };
    }
    return null;
  };

  return (
    <ListPageShell
      title={L.title}
      subtitle={L.subtitle}
      actions={
        canWrite ? (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            {L.add}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        className="ims-bmt-compact-filters"
        tabs={[tab]}
        cellFormatter={cellFormatter}
        showIndex
        searchable
        onSearchChange={(q) => setSearch(q)}
        persistKey="ims-specification-attributes"
        onRowClick={canWrite ? (row) => openEdit(row._attr as SpecificationAttribute) : undefined}
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching: query.isFetching,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          sort: {
            column: sortDirection ? sortColumnKey : null,
            direction: sortDirection,
          },
          onSortChange: (col, dir) => {
            if (!col || !dir) {
              setMany({ sort: null, page: null });
              return;
            }
            setMany({ sort: `${dir === "desc" ? "-" : ""}${col}`, page: null });
          },
        }}
        error={
          query.isError
            ? {
                title: L.error.title,
                description: L.error.description,
                onRetry: () => void query.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: L.empty.title,
          description: canWrite ? L.empty.descriptionWrite : L.empty.descriptionReadOnly,
          action: canWrite ? { label: L.add, onClick: openCreate } : undefined,
        }}
        onClearFilters={clearFilters}
        externalFiltersActive={externalFiltersActive}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={L.deleteDialogHeading}
        description={pendingDelete ? L.deleteDescription(pendingDelete.name) : ""}
        confirmLabel={deleteAttr.isPending ? L.deleting : L.deleteConfirm}
        cancelLabel={L.deleteCancel}
        variant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteAttr.mutate(pendingDelete.id, {
            onSuccess: () => setPendingDelete(null),
          });
        }}
      />
    </ListPageShell>
  );
}
