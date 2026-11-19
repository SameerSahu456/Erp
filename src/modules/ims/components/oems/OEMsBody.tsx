import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListPageShell } from "@/components/page-shells";
import { BusinessMetricsTable, type CellFormatter, type TabConfig } from "@/components/common/tables/BusinessMetricsTable";
import { useClearFiltersOnReload, useFilterParams, useListSearchFilters, usePageSizeParam } from "@/shared/hooks";

import { usePermission } from "@shared/rbac";

import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { useDeleteOEM, useOEMsPaged } from "../../hooks/oems/useOEMs";
import { OEMS_STRINGS } from "./oems.strings";
// PM-assignment probe import — commented 2026-05-28 alongside the delete
// dialog's PM precondition row. Restore when re-enabling PM gating.
// import { usePMAssignmentsPage } from "../../hooks/pm-assignments/usePMAssignments";
import type { OEM } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { resolveSortParam } from "../../lib/list-params";
import { imsCan } from "../../permissions";

export function OEMsBody() {
  // Refresh = "start over" for filters: on browser reload we drop every
  // URL param so the user lands on the unfiltered first page. SPA-nav
  // (back from a detail page, sidebar link) is unaffected.
  useClearFiltersOnReload();

  const navigate = useNavigate();

  // Filter + pagination + page size all live in the URL so back-nav from
  // a detail page restores the exact listing state the user left.
  const { get, set, setMany, clear: clearFilters } = useFilterParams();
  const search = get("search");
  const sortRaw = get("sort");
  const page = Math.max(1, Number(get("page", "1")) || 1);
  // Cap at the backend `search` limit (100) so a long paste can't 422.
  const setSearch = (v: string) => set("search", v.slice(0, IMS_SEARCH_MAX_LEN));
  const setPage = (n: number) => set("page", n > 1 ? String(n) : null);
  const [pageSize, setPageSize] = usePageSizeParam({
    defaultSize: IMS_PAGE_SIZE,
  });

  // BMT column key → backend sort field for /ims/oems. Only the columns the
  // table exposes (name, code) are allowed; any other key is DROPPED, because
  // the backend `sort` is a Literal and a crafted `?sort=garbage` would 422 the
  // whole list (§11.1: repair over reject).
  const SORT_FIELD_MAP: Record<string, string> = { name: "name", code: "code" };
  const sortColumnKey = sortRaw.replace(/^-/, "");
  const sortDirection: "asc" | "desc" | null =
    sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc";
  const sortParam = resolveSortParam(sortRaw, SORT_FIELD_MAP);

  // Create + edit moved to dedicated /ims/oems/new + /ims/oems/:id/edit
  // pages (full-page form, see OEMFormPage). Delete still lives in this
  // page as an inline confirm.
  const [pendingDeleteOEM, setPendingDeleteOEM] = useState<OEM | null>(null);
  const deleteOEM = useDeleteOEM();

  // Lazy PM-assignment count for the delete dialog — commented out
  // 2026-05-28 per product request: no PM-related activity in IMS
  // delete dialogs (and don't fire the PM API for the precondition
  // probe either). Restore the block + the matching precondition row
  // in the dialog below when PM gating is wanted back.
  //
  // const pendingOemPmCountQuery = usePMAssignmentsPage(
  //   pendingDeleteOEM
  //     ? { oem_id: pendingDeleteOEM.id, page_size: 1 }
  //     : undefined,
  //   { enabled: !!pendingDeleteOEM },
  // );
  // const pendingOemPmCount = pendingOemPmCountQuery.data?.total ?? 0;
  const pendingOemPartsCount = pendingDeleteOEM?.parts_count ?? 0;

  // RBAC: read-only users see data but no action affordances.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  const openCreate = () => navigate("/ims/oems/new");
  const openEdit = (oem: OEM) => navigate(`/ims/oems/${oem.id}/edit`);

  // Bypass debounce when search is cleared — otherwise "Clear filters"
  // wipes the URL but the API keeps the stale search for 300ms, during
  // which BMT flashes the "No items yet" empty state.
  // Debounced + length-capped search and the empty-state signal from one shared
  // hook (search cap = 100; externalFiltersActive drives "No results
  // match your filters", incl. a search present in the URL on load).
  const { searchParam, externalFiltersActive } = useListSearchFilters({
    search,
    maxLength: IMS_SEARCH_MAX_LEN,
  });

  const oemsQuery = useOEMsPaged({
    page,
    page_size: pageSize,
    search: searchParam,
    sort: sortParam,
  });
  const oems = (oemsQuery.data?.items ?? []) as OEM[];
  const total = oemsQuery.data?.total ?? 0;

  const tab: TabConfig = useMemo(
    () => ({
      id: "oems",
      label: OEMS_STRINGS.list.tabLabel(total),
      // Actions column only renders for write-enabled users — read-only
      // users see Name + Code with no trailing empty "Actions" header.
      columns: [
        { key: "name", label: OEMS_STRINGS.list.columns.name, sortable: true },
        { key: "code", label: OEMS_STRINGS.list.columns.code, sortable: true },
        ...(canWrite
          ? [{ key: "actions", label: OEMS_STRINGS.list.columns.actions, align: "right" as const }]
          : []),
      ],
      data: oems.map((oem) => ({
        name: oem.name,
        code: oem.code,
        actions: oem.id,
        _id: oem.id,
        _oem: oem,
      })),
    }),
    [oems, total, canWrite],
  );

  const handleTableFiltersChange = (next: Record<string, string>) => {
    setPage(1);
  };

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "name" && typeof value === "string") {
      const id = row._id as string;
      return {
        display: (
          <Link
            to={`/ims/oems/${id}`}
            className="font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      };
    }

    if (key === "actions") {
      const oem = row._oem as OEM | undefined;
      if (!oem) return null;
      return {
        display: (
          <div
            className="inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(oem);
              }}
              aria-label={`Edit ${oem.name}`}
              title={OEMS_STRINGS.list.editButtonTitle}
              data-testid="oem-edit-button"
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
                setPendingDeleteOEM(oem);
              }}
              disabled={deleteOEM.isPending}
              aria-label={`Delete ${oem.name}`}
              title={OEMS_STRINGS.list.deleteButtonTitle}
              data-testid="oem-delete-button"
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
      title={OEMS_STRINGS.list.title}
      subtitle={OEMS_STRINGS.list.subtitle}
      actions={
        canWrite ? (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            {OEMS_STRINGS.list.addOEM}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        className="ims-bmt-compact-filters"
        useAsyncFilterDropdowns
        tabs={[tab]}
        cellFormatter={cellFormatter}
        showIndex
        searchable
        onSearchChange={(q) => {
          // `setSearch` already drops the `page` param via useFilterParams.
          // A second `setPage(1)` here would stomp the search update —
          // both setSearchParams calls see the same `prev` URL.
          setSearch(q);
        }}
        persistKey="ims-oems"
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching: oemsQuery.isFetching,
          onPageChange: setPage,
          // setPageSize atomically resets the page key via usePageSizeParam.
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
            const prefix = dir === "desc" ? "-" : "";
            setMany({ sort: `${prefix}${col}`, page: null });
          },
          onFiltersChange: handleTableFiltersChange,
        }}
        onRowClick={(row) => navigate(`/ims/oems/${row._id}`)}
        error={
          oemsQuery.isError
            ? {
                title: OEMS_STRINGS.list.error.title,
                description: OEMS_STRINGS.list.error.description,
                onRetry: () => void oemsQuery.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: OEMS_STRINGS.list.empty.title,
          description: OEMS_STRINGS.list.empty.description,
          // Empty-state CTA gated — read-only users see the prose only.
          action: canWrite
            ? { label: OEMS_STRINGS.list.empty.action, onClick: openCreate }
            : undefined,
        }}
        onClearFilters={clearFilters}
        externalFiltersActive={externalFiltersActive}
      />

      {/* Delete confirmation — preconditions mirror OEMService.delete()
          guards. PM count is a lazy probe fired on row-click only. */}
      <DeleteWithPreconditionsDialog
        open={pendingDeleteOEM != null}
        onOpenChange={(o) => !o && setPendingDeleteOEM(null)}
        title={OEMS_STRINGS.delete.title}
        entityName={pendingDeleteOEM?.name ?? ""}
        description={OEMS_STRINGS.delete.description}
        preconditions={
          pendingDeleteOEM
            ? [
                {
                  satisfied: pendingOemPartsCount === 0,
                  label: OEMS_STRINGS.delete.preconditions.noActiveParts,
                  detail:
                    pendingOemPartsCount > 0
                      ? OEMS_STRINGS.delete.preconditions.activePartsDetail(pendingOemPartsCount)
                      : undefined,
                },
                // PM precondition row — hidden 2026-05-28 per product
                // request; restore alongside the `pendingOemPmCountQuery`
                // block above when PM gating on delete is wanted back.
                /*
                {
                  satisfied: pendingOemPmCount === 0,
                  loading: pendingOemPmCountQuery.isLoading,
                  label: "No active PM assignments scoped to this OEM",
                  detail:
                    pendingOemPmCount > 0
                      ? `${pendingOemPmCount} active assignment${pendingOemPmCount === 1 ? "" : "s"} — revoke from PM Assignments first`
                      : undefined,
                },
                */
              ]
            : []
        }
        isPending={deleteOEM.isPending}
        confirmLabel={OEMS_STRINGS.delete.confirmLabel}
        onConfirm={() => {
          if (!pendingDeleteOEM) return;
          deleteOEM.mutate(pendingDeleteOEM.id, {
            onSuccess: () => setPendingDeleteOEM(null),
          });
        }}
      />
    </ListPageShell>
  );
}

