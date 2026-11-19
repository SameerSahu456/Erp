import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
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

import type { HSNCode, HSNSortField } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { useDeleteHSNCode, useHSNCodesPaged } from "../../hooks/parts/useHSN";
import { formatPercent } from "../../lib/format";
import { resolveSortParam } from "../../lib/list-params";
import { imsCan } from "../../permissions";
import { HSN_CODES_STRINGS } from "./hsn-codes.strings";


// Backend's `sort` query param accepts these fields; map BMT column keys
// onto the wire field names. (`gst` is the FE row key; `gst_rate` is the
// backend column.)
export const SORT_FIELD_MAP: Record<string, "code" | "gst_rate" | "created_at"> = {
  code: "code",
  gst: "gst_rate",
  created_at: "created_at",
};


export function HSNCodesBody() {
  // Refresh = "start over" for filters: on browser reload we drop every
  // URL param so the user lands on the unfiltered first page. SPA-nav
  // (back from edit, sidebar link) is unaffected.
  useClearFiltersOnReload();

  const navigate = useNavigate();

  // RBAC: read-only viewers see HSN data but not the Add / Edit /
  // Delete affordances. The Active toggle on the form is also
  // disabled — handled in HSNCodeFormPage by reading the same flag.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  // Page / search / sort all live in the URL so back-nav from edit
  // restores exactly the view the user left.
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

  const sortColumnKey = sortRaw.replace(/^-/, "");
  const sortDirection: "asc" | "desc" | null =
    sortRaw === "" ? null : sortRaw.startsWith("-") ? "desc" : "asc";
  // Unknown columns are DROPPED, not passed through — the backend `sort` is a
  // Literal (`code` / `gst_rate` / `created_at`), so a crafted `?sort=garbage`
  // would 422 the whole list (§11.1: repair over reject).
  const sortParam = resolveSortParam(sortRaw, SORT_FIELD_MAP) as
    | HSNSortField
    | undefined;

  // Debounce search so we don't refetch on every keystroke. Backend
  // gates search at min 2 chars; useHSNCodesPaged drops shorter strings.
  // Debounced + length-capped search and the empty-state signal from one shared
  // hook (search cap = 100; externalFiltersActive drives "No results
  // match your filters", incl. a search present in the URL on load).
  const { searchParam, externalFiltersActive } = useListSearchFilters({
    search,
    maxLength: IMS_SEARCH_MAX_LEN,
  });

  const hsnQuery = useHSNCodesPaged({
    page,
    page_size: pageSize,
    search: searchParam,
    sort: sortParam,
  });
  const hsnCodes = (hsnQuery.data?.items ?? []) as HSNCode[];
  const total = hsnQuery.data?.total ?? 0;

  const [pendingDelete, setPendingDelete] = useState<HSNCode | null>(null);
  const deleteHSN = useDeleteHSNCode();

  const openCreate = () => navigate("/ims/hsn-codes/new");
  const openEdit = (hsn: HSNCode) => navigate(`/ims/hsn-codes/${hsn.id}/edit`);

  const tab: TabConfig = useMemo(
    () => ({
      id: "hsn-codes",
      label: `HSN Codes (${total})`,
      // Sortable columns map back to the backend `sort` field via
      // SORT_FIELD_MAP. Backend allows `code`, `gst_rate`, `created_at`.
      columns: [
        { key: "code", label: HSN_CODES_STRINGS.list.columns.hsnCode, sortable: true, width: "200px" },
        // GST column reads left-aligned — the values are short and
        // uniform ("0.00%", "18.00%", "28.00%"), so right-alignment
        // pulls the value away from the header label and reads as
        // misaligned even though both are technically aligned to their
        // own edges. Left edge keeps header text and value stacked
        // under each other.
        {
          key: "gst",
          label: HSN_CODES_STRINGS.list.columns.gst,
          sortable: true,
          width: "140px",
        },
        // Actions column only renders for write-enabled users; read-only
        // viewers get a cleaner table without the trailing empty cell.
        ...(canWrite
          ? ([
              {
                key: "actions",
                label: HSN_CODES_STRINGS.list.columns.actions,
                align: "right" as const,
                width: "120px",
              },
            ] as const)
          : []),
      ],
      // `gst_rate` arrives as a string (Numeric(5,2)). Coerce to number
      // for the cellFormatter — sort happens server-side now.
      data: hsnCodes.map((hsn) => ({
        code: hsn.code,
        gst: Number(hsn.gst_rate),
        actions: hsn.id,
        _id: hsn.id,
        _hsn: hsn,
      })),
    }),
    [hsnCodes, total, canWrite],
  );

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "code" && typeof value === "string") {
      return {
        display: (
          <Typography asChild variant="body" className="font-mono font-medium">
            <span>{value}</span>
          </Typography>
        ),
      };
    }

    if (key === "gst" && typeof value === "number") {
      // IMS-wide trimming rule via formatPercent — "18%" (not "18.00%"),
      // "12.50%", "5%", "0%". `tabular-nums` keeps the column vertically
      // aligned regardless of how many decimals are shown.
      return {
        display: (
          <span className="tabular-nums">{formatPercent(value)}</span>
        ),
      };
    }

    if (key === "actions") {
      // Read-only viewers see no buttons in this cell at all. The
      // column itself stays in the layout so row heights stay
      // consistent, but the content is empty.
      if (!canWrite) return { display: null };
      const hsn = row._hsn as HSNCode | undefined;
      if (!hsn) return null;
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
                openEdit(hsn);
              }}
              aria-label={HSN_CODES_STRINGS.list.editAriaLabel(hsn.code)}
              title={HSN_CODES_STRINGS.list.editTitle}
              data-testid="hsn-edit-button"
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
                setPendingDelete(hsn);
              }}
              disabled={deleteHSN.isPending}
              aria-label={HSN_CODES_STRINGS.list.deleteAriaLabel(hsn.code)}
              title={HSN_CODES_STRINGS.list.deleteTitle}
              data-testid="hsn-delete-button"
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
      title={HSN_CODES_STRINGS.list.title}
      subtitle={HSN_CODES_STRINGS.list.subtitle}
      actions={
        canWrite ? (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            {HSN_CODES_STRINGS.list.addHsnCode}
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
        persistKey="ims-hsn-codes"
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching: hsnQuery.isFetching,
          onPageChange: setPage,
          // usePageSizeParam atomically resets the page key on size change.
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
        }}
        error={
          hsnQuery.isError
            ? {
                title: HSN_CODES_STRINGS.list.error.title,
                description: HSN_CODES_STRINGS.list.error.description,
                onRetry: () => void hsnQuery.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: HSN_CODES_STRINGS.list.empty.title,
          description: canWrite
            ? HSN_CODES_STRINGS.list.empty.descriptionWrite
            : HSN_CODES_STRINGS.list.empty.descriptionReadOnly,
          action: canWrite
            ? { label: HSN_CODES_STRINGS.list.addHsnCode, onClick: openCreate }
            : undefined,
        }}
        onClearFilters={clearFilters}
        externalFiltersActive={externalFiltersActive}
      />

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" aria-hidden />
              {HSN_CODES_STRINGS.list.deleteDialogHeading}
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              {pendingDelete ? (
                <>
                  <span
                    className="block truncate font-mono font-medium text-foreground"
                    title={pendingDelete.code}
                  >
                    {pendingDelete.code}
                  </span>
                  {" "}{HSN_CODES_STRINGS.list.deleteDescriptionSuffix}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteHSN.isPending}>
              {HSN_CODES_STRINGS.list.deleteCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                deleteHSN.mutate(pendingDelete.id, {
                  onSuccess: () => setPendingDelete(null),
                });
              }}
              disabled={deleteHSN.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-1.5 size-4" />
              {deleteHSN.isPending ? HSN_CODES_STRINGS.list.deleting : HSN_CODES_STRINGS.list.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageShell>
  );
}

