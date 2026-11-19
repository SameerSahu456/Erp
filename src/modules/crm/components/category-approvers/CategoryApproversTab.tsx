import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"
import { PAGINATION } from "@/shared/constants"
import { usePageSizeParam, useQueryParam } from "@/shared/hooks"
import { useAuth } from "@shared/auth/use-auth"
import { formatIST } from "@shared/lib/date"

import type {
  ApprovalScope,
  CategoryApproverWire,
} from "../../api/category-approvers";
import { useCategoryApproversPage } from "../../hooks/category-approvers/useCategoryApprovers";
import { CATEGORY_APPROVERS_STRINGS } from "./category-approvers.strings";
import { EditApproverDialog } from "./EditApproverDialog";
import { ManageApproversDialog } from "./ManageApproversDialog";

// Day-1 only `quote` is live. When Sales Order / Purchase Request /
// Demo Request adopt the shared `category_approvers` table, swap the
// scope here (or render a second instance for a different scope). Exported
// so the Category page can badge its tab with the same set's count.
export const CATEGORY_APPROVERS_SCOPE: ApprovalScope = "quote"
const SCOPE = CATEGORY_APPROVERS_SCOPE

// Single page-size source for this table (§16.6) — the same default the
// Parts / Subcategories tabs on the Category page use.
const APPROVERS_PAGE_SIZE: number = PAGINATION.DEFAULT_PAGE_SIZE;
// URL keys are prefixed: the Category page already owns `parts_page` /
// `subs_page`, and all three tabs share one query string.
const PAGE_KEY = "approvers_page";
const PAGE_SIZE_KEY = "approvers_page_size";

// §11.1 — URL params are untrusted. A page is a positive integer; anything
// else (`abc`, `0`, `-3`, `1.5`) is page 1. Never send the raw value.
function parsePage(raw: string | null): number {
  if (raw == null || !/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

const inrFmt = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
function formatThreshold(wire: string): string {
  const n = Number(wire);
  if (!Number.isFinite(n)) return wire;
  return `₹${inrFmt.format(n)}`;
}

interface Props {
  categoryId: string;
}

export function CategoryApproversTab({ categoryId }: Props) {
  const S = CATEGORY_APPROVERS_STRINGS;
  // Role-name gate — deliberate deviation from the permission-based convention
  // (comprint-erp-docs/modules/foundation/roles/spec.md). Product-owner decision:
  // only PM / APM / admin / superadmin can manage category approvers. Backend mirrors
  // this with `require_role_in([...])` on the PUT endpoint.
  const { user } = useAuth();
  const canManage =
    !!user?.is_superuser ||
    (user?.roles ?? []).some(
      (r) =>
        r === "product_manager" ||
        r === "asst_product_manager" ||
        r === "admin" ||
        r === "superadmin",
    );
  const [dialogOpen, setDialogOpen] = useState(false);
  // One row at a time: null = no editor open, otherwise the row being edited.
  const [editing, setEditing] = useState<CategoryApproverWire | null>(null);

  const [pageRaw, setPageRaw] = useQueryParam(PAGE_KEY);
  const page = parsePage(pageRaw);
  const setPage = (n: number) => setPageRaw(n > 1 ? String(n) : null);
  const [pageSizeParam, setPageSize] = usePageSizeParam({
    key: PAGE_SIZE_KEY,
    pageKey: PAGE_KEY,
    defaultSize: APPROVERS_PAGE_SIZE,
  });
  // Only the sizes the pager offers are valid — the API 422s above 100, so a
  // hand-typed `?approvers_page_size=5000` falls back instead of erroring.
  const pageSizeValid = (
    PAGINATION.PAGE_SIZE_OPTIONS as readonly number[]
  ).includes(pageSizeParam);
  const pageSize = pageSizeValid ? pageSizeParam : APPROVERS_PAGE_SIZE;

  const { data, isLoading, isError, isFetching, refetch } =
    useCategoryApproversPage(categoryId, SCOPE, page, pageSize);
  const approvers = useMemo(() => data?.items ?? [], [data]);
  // Server total — NOT `approvers.length`, which is only this page.
  const count = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // Repair the URL to match what actually rendered (§11.1). Each branch is a
  // no-op on a clean URL.
  const pageParamInvalid = pageRaw != null && String(page) !== pageRaw;
  // A page past the end — reached by a hand-edited URL, or by removing the
  // last approvers on the last page — steps back to the last real page.
  const pagePastEnd = !!data && !isFetching && page > totalPages;
  useEffect(() => {
    if (!pageSizeValid) setPageSize(APPROVERS_PAGE_SIZE);
    else if (pageParamInvalid) setPageRaw(page > 1 ? String(page) : null);
    else if (pagePastEnd)
      setPageRaw(totalPages > 1 ? String(totalPages) : null);
  }, [
    pageSizeValid,
    pageParamInvalid,
    pagePastEnd,
    page,
    totalPages,
    setPageSize,
    setPageRaw,
  ]);

  // Same table primitive as the Parts / Specifications tabs beside it, so
  // the four tabs read as one surface. Rows carry the wire object so the
  // Edit action can open the editor without re-reading the page.
  const tab: TabConfig = useMemo(
    () => ({
      id: "approvers",
      label: S.panel.title,
      columns: [
        { key: "name", label: S.columns.name },
        { key: "type", label: S.columns.type, width: "120px" },
        { key: "role", label: S.columns.role },
        { key: "threshold", label: S.columns.threshold, align: "right" },
        { key: "addedOn", label: S.columns.addedOn, width: "200px" },
        ...(canManage
          ? [
              {
                key: "actions",
                label: S.columns.actions,
                width: "56px",
                align: "right" as const,
              },
            ]
          : []),
      ],
      data: approvers.map((a) => ({
        id: a.id,
        name: a.user_name,
        type: S.scopeLabel[SCOPE],
        role: a.user_role ?? "—",
        // Pre-formatted strings so every cell takes the table's own text
        // styling (13px body) — nothing is wrapped in <Typography>, same as
        // the Specifications tab beside it. Weight / tabular digits are
        // applied as cell classes in the formatter below.
        threshold: formatThreshold(a.threshold),
        addedOn: formatIST(a.created_at),
        actions: a.id,
        _approver: a,
      })),
    }),
    [approvers, canManage, S],
  );

  const cellFormatter: CellFormatter = (value, key, row) => {
    // Name / Role can outgrow their column (long full names, long role
    // codes). Clip to ONE line with an ellipsis and reveal the full value in
    // a tooltip on hover — the same shared TruncatedText the Parts tab uses
    // for its description column — so a long value never stretches the row
    // or the table. Width caps keep the two columns from crowding the rest.
    if (key === "name") {
      return {
        className: "font-medium",
        display: (
          <TruncatedText value={String(value)} className="max-w-[240px]" />
        ),
      };
    }
    if (key === "role") {
      return {
        display: (
          <TruncatedText value={String(value)} className="max-w-[220px]" />
        ),
      };
    }
    if (key === "threshold") return { className: "tabular-nums" };
    if (key === "actions") {
      const approver = row._approver as CategoryApproverWire;
      return {
        display: (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={S.rowActions.edit}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(approver);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        ),
      };
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            disabled={isLoading || isError}
          >
            <Pencil className="mr-1.5 size-4" />
            {S.panel.manageButton}
          </Button>
        </div>
      )}

      <BusinessMetricsTable
        showIndex
        searchable={false}
        tabs={[tab]}
        activeTab="approvers"
        cellFormatter={cellFormatter}
        persistKey="crm-category-approvers"
        serverPagination={{
          page,
          pageSize,
          total: count,
          isFetching,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        }}
        error={
          isError
            ? { title: S.panel.loadError, onRetry: () => void refetch() }
            : undefined
        }
        emptyState={{ title: S.panel.emptyText }}
      />

      {canManage && (
        <ManageApproversDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categoryId={categoryId}
          scope={SCOPE}
          // The dialog loads the full set itself — never hand it this page.
          // After a save the set changed, so return to the first page.
          onSaved={() => setPage(1)}
        />
      )}

      {canManage && editing && (
        <EditApproverDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          categoryId={categoryId}
          scope={SCOPE}
          approver={editing}
        />
      )}
    </div>
  );
}
