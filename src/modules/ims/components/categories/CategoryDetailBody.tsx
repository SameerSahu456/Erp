import { useState } from "react";
import { useNavigate, useParams, Navigate, useSearchParams } from "react-router-dom";
import { Layers, Package, Pencil, Plus, Search, Trash2, Workflow, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { TablePagination } from "@/components/common/tables/TablePagination";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";
import { DetailTabs } from "@/components/page-shells/DetailTabs";
import { EntityHeader } from "@/components/page-shells/EntityHeader";



import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import { useCategories, useCategory, useDeleteCategory } from "../../hooks/categories/useCategories";
import { usePartsPage } from "../../hooks/parts/useParts";
import { useOEMOptions } from "../../hooks/oems/useOEMs";
import { useScopedPMAssignments } from "../../hooks/pm-assignments/usePMAssignments";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import type { Category } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { imsCan } from "../../permissions";
import { PAGINATION } from "@/shared/constants";
import { usePageSizeParam, useQueryParam } from "@/shared/hooks";
import { usePermission } from "@shared/rbac";
import { CategoryNode } from "./CategoryNode";
import { CategorySpecificationsTab } from "./CategorySpecificationsTab";
import { type TreeNode } from "./categories-body-helpers";
import { CATEGORIES_STRINGS } from "./categories.strings";
import { NO_EXPANDED, noopToggle, numberFmt } from "./category-detail-helpers";
import {
  CategoryApproversTab,
  CATEGORY_APPROVERS_SCOPE,
  useCategoryApproversCount,
} from "@modules/crm";

export function CategoryDetailBody() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // RBAC: read-only users see the category without the Edit + Delete buttons.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  // Delete-confirmation dialog state. Preconditions mirror the backend's
  // `CategoryService.delete()` guards (`app/modules/ims/services/
  // category_service.py` ~L376-447):
  //   1. No active sub-categories → 400 CATEGORY_HAS_CHILDREN
  //   2. No active parts → 409 CATEGORY_HAS_PARTS
  //   3. No active PM assignments → 409 CATEGORY_HAS_PM_ASSIGNMENTS
  // Each precondition shows a live ✓/✗ derived from data already loaded
  // for the detail page (no extra fetches). If state drifts between
  // load and click, the mutation's onError toast surfaces the backend
  // message verbatim.
  const [showDelete, setShowDelete] = useState(false);
  // Delete a SUBCATEGORY row from the list below (mirrors the Categories list
  // page's inline delete). Distinct from `showDelete`, which deletes THIS
  // category; both drive their own DeleteWithPreconditionsDialog.
  const [pendingDeleteSub, setPendingDeleteSub] = useState<Category | null>(null);
  const deleteCategory = useDeleteCategory();

  const { data: category, isLoading, isError } = useCategory(id);
  // No useCategoryAncestors call: the backend's recursive CTE for
  // /ancestors is missing `is_bom_eligible` in its SELECT list, which
  // breaks Pydantic deserialization and returns a 500. The catalog is
  // only two levels deep (CLAUDE.md §IMS), so `category.parent_name`
  // off the regular GET is enough for the breadcrumb. Restore the
  // ancestors call once the backend SELECT is patched.
  // Top-level vs subcategory: catalogue is 2 levels deep. Top-level
  // categories own subcategories; subcategories don't. Wait for `category`
  // to land before deciding whether to fetch children; the empty default
  // keeps `children` an empty array until then.
  const isTopLevel = category != null && category.parent_id == null;
  // Approvers count for the tab badge. Fetched here (not inside the tab) so
  // it shows on every tab — DetailTabs only mounts the active one.
  const approversCount = useCategoryApproversCount(
    category?.id,
    CATEGORY_APPROVERS_SCOPE,
  );
  const { data: children = [] } = useCategories(
    { parent_id: id },
    { enabled: isTopLevel },
  );
  // `parts_page` + `parts_search` live in the URL so back-nav from a
  // Part detail page restores the same page of parts AND the search
  // filter that produced it. Page size stays local — power preference,
  // not navigation state.
  const [partsPageRaw, setPartsPageRaw] = useQueryParam("parts_page");
  const partsPage = Math.max(1, Number(partsPageRaw ?? "1") || 1);
  const setPartsPage = (n: number) =>
    setPartsPageRaw(n > 1 ? String(n) : null);
  const [partsSearchRaw] = useQueryParam("parts_search");
  const partsSearch = partsSearchRaw ?? "";
  // Subcategories list is small + fully loaded — single-key URL state,
  // filter client-side. Page index lives in URL too so back-nav from a
  // subcategory detail page restores the same slice the user was on.
  const [subsSearchRaw, setSubsSearchRaw] = useQueryParam("subs_search");
  const subsSearch = subsSearchRaw ?? "";
  const [subsPageRaw, setSubsPageRaw] = useQueryParam("subs_page");
  const subsPage = Math.max(1, Number(subsPageRaw ?? "1") || 1);
  const setSubsPage = (n: number) =>
    setSubsPageRaw(n > 1 ? String(n) : null);
  const [subsPageSize, setSubsPageSize] = usePageSizeParam({
    key: "subs_page_size",
    pageKey: "subs_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  // Sequential setSearchParams calls stomp each other (each sees the
  // same `prev` URL until React applies the previous). Write search +
  // page in ONE update so the API actually sees the new filter.
  const [, setSearchParams] = useSearchParams();
  const setPartsSearchAndReset = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set("parts_search", v);
        else next.delete("parts_search");
        next.delete("parts_page");
        return next;
      },
      { replace: true },
    );
  };
  // Backend rejects search shorter than 2 chars; gate locally so a
  // 1-char input doesn't 422 the API.
  const partsSearchParam =
    partsSearch.trim().length >= 2
      ? partsSearch.trim().slice(0, IMS_SEARCH_MAX_LEN) // cap so a long paste can't 422
      : undefined;
  // Brand / OEM filter — `parts_oem` in the URL; the resolved AsyncSelect
  // option (for the chip label) is local. Picking one resets to page 1.
  const [partsOemRaw] = useQueryParam("parts_oem");
  const partsOem = partsOemRaw ?? "";
  const [partsOemOption, setPartsOemOption] = useState<AsyncSelectOption | null>(
    null,
  );
  const setPartsOem = (opt: AsyncSelectOption | null) => {
    setPartsOemOption(opt);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (opt?.id) next.set("parts_oem", opt.id);
        else next.delete("parts_oem");
        next.delete("parts_page");
        return next;
      },
      { replace: true },
    );
  };
  const [partsPageSize, setPartsPageSize] = usePageSizeParam({
    key: "parts_page_size",
    pageKey: "parts_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  const { data: partsData, isFetching: partsFetching } = usePartsPage({
    category_id: id,
    page: partsPage,
    page_size: partsPageSize,
    search: partsSearchParam,
    oem_id: partsOem || undefined,
  });
  const { data: pms = [] } = useScopedPMAssignments({ category_id: id });

  // Two separate openers:
  // Edit + "Add subcategory" now route to /ims/categories/:id/edit and
  // /ims/categories/new?parent_id=:id — full pages, no inline dialog
  // state needed.

  const partsInCategory = partsData?.items ?? [];
  const partsTotal = partsData?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !category) {
    return <Navigate to="/ims/categories" replace />;
  }

  // Two-level catalog (CLAUDE.md §IMS): a subcategory's breadcrumb is
  // just its parent's name, available inline on the regular Category
  // GET response. No round-trip to /ancestors.
  const breadcrumbLabel = category.parent_name ?? "Top-level category";

  // Hierarchy card chain. Built from `parent_name` + `parent_id` on the
  // current Category response — saves a /ancestors round-trip and the
  // 500 the recursive CTE currently throws (missing is_bom_eligible in
  // its SELECT list, see hook comment above).
  const chain = category.parent_id && category.parent_name
    ? [
        { id: category.parent_id, name: category.parent_name },
        { id: category.id, name: category.name },
      ]
    : [{ id: category.id, name: category.name }];

  const subCount = children.length;
  const partCount = category.part_count ?? 0;
  const subsSearchQuery = subsSearch.trim().toLowerCase();
  const filteredChildren = subsSearchQuery
    ? children.filter((c) => c.name.toLowerCase().includes(subsSearchQuery))
    : children;
  const filteredSubCount = filteredChildren.length;
  const subsTotalPages = Math.max(
    1,
    Math.ceil(filteredSubCount / subsPageSize),
  );
  // Clamp `subsPage` so a deletion / filter shrink doesn't strand the
  // operator on an empty trailing page.
  const safeSubsPage = Math.min(subsPage, subsTotalPages);
  const paginatedChildren = filteredChildren.slice(
    (safeSubsPage - 1) * subsPageSize,
    safeSubsPage * subsPageSize,
  );

  // Parts render through the app's canonical data table (BusinessMetricsTable —
  // the same component the main Parts list uses), so the table skin, the toolbar
  // search, and the footer pager all match the rest of IMS. Columns mirror the
  // Parts list: Sr No (showIndex) · Part Name · Description · Brand/OEM ·
  // Quantity. `available_stock_qty` is the same available-stock rollup the Parts
  // list surfaces as "Qty".
  const partsColumns: TabConfig["columns"] = [
    { key: "name", label: CATEGORIES_STRINGS.detail.partsCard.tableColPartName },
    { key: "description", label: CATEGORIES_STRINGS.detail.partsCard.tableColDescription },
    // On a subcategory (leaf) page every part shares this subcategory, so the
    // Category column is redundant — only the top-level page (whose Parts tab
    // can span the category directly) shows it.
    ...(isTopLevel
      ? [{ key: "category", label: CATEGORIES_STRINGS.detail.partsCard.tableColCategory }]
      : []),
    { key: "oem", label: CATEGORIES_STRINGS.detail.partsCard.tableColBrandOem },
    {
      key: "qty",
      label: CATEGORIES_STRINGS.detail.partsCard.tableColQuantity,
      align: "right",
    },
  ];
  const partsRows = partsInCategory.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "—",
    category: p.category_name ?? "—",
    oem: p.oem_name ?? "—",
    qty: Number(p.available_stock_qty ?? 0),
  }));
  const partsCellFormatter: CellFormatter = (value, key) => {
    if (key === "name") {
      return {
        display: (
          <Typography variant="body-strong" className="min-w-0 truncate">
            {String(value)}
          </Typography>
        ),
      };
    }
    if (key === "description") {
      // Truncate to one line; the full description reveals in a tooltip on
      // hover (shared TruncatedText, used across WMS). Capped so a long
      // description can't stretch the column.
      return {
        display: (
          <TruncatedText
            value={String(value)}
            className="max-w-[320px] text-muted-foreground"
          />
        ),
      };
    }
    if (key === "qty") {
      return {
        display: (
          <Typography variant="body" numeric>
            {numberFmt.format(Number(value))}
          </Typography>
        ),
      };
    }
    return null;
  };
  const specificationsTab = {
    id: "specifications",
    label: CATEGORIES_STRINGS.detail.tabs.specifications,
    count: category.specification_attributes?.length ?? 0,
    content: <CategorySpecificationsTab category={category} canWrite={canWrite} />,
  };
  const approversTab = {
    id: "approvers",
    label: CATEGORIES_STRINGS.detail.tabs.approvers,
    count: approversCount,
    content: <CategoryApproversTab categoryId={category.id} />,
  };
  // `withHeader` renders the single-tab strip as a "Parts (N)" section header
  // — on for the leaf page (no DetailTabs above it), off inside the top-level
  // Parts tab (DetailTabs already labels it).
  const renderPartsTable = (withHeader: boolean) => (
    <BusinessMetricsTable
      showIndex
      searchable
      alwaysShowTabs={withHeader}
      searchValue={partsSearch}
      onSearchChange={setPartsSearchAndReset}
      onClearFilters={() => {
        setPartsSearchAndReset("");
        setPartsOem(null);
      }}
      externalFiltersActive={partsSearch.trim().length > 0 || !!partsOem}
      searchPlaceholder={CATEGORIES_STRINGS.detail.partsCard.searchPlaceholder}
      tabs={[
        {
          id: "parts",
          label: CATEGORIES_STRINGS.detail.partsCard.title(partsTotal),
          columns: partsColumns,
          data: partsRows,
        },
      ]}
      activeTab="parts"
      cellFormatter={partsCellFormatter}
      onRowClick={(row) => navigate(`/ims/parts/${String(row.id)}`)}
      toolbarFilters={[
        {
          key: "oem",
          label: CATEGORIES_STRINGS.detail.partsCard.brandFilter,
          value: partsOem,
          options: [],
          render: () => (
            <AsyncSelect
              value={
                partsOem && partsOemOption?.id === partsOem
                  ? partsOemOption
                  : null
              }
              onValueChange={setPartsOem}
              useOptions={useOEMOptions}
              toLabel={(o) => o.name}
              placeholder={CATEGORIES_STRINGS.detail.partsCard.allBrands}
              allOption={CATEGORIES_STRINGS.detail.partsCard.allBrands}
              searchPlaceholder={CATEGORIES_STRINGS.detail.partsCard.searchBrand}
              searchable
              clearable
              chevron="down"
              className="h-9 w-[190px]"
            />
          ),
        },
      ]}
      serverPagination={{
        page: partsPage,
        pageSize: partsPageSize,
        total: partsTotal,
        isFetching: partsFetching,
        onPageChange: setPartsPage,
        onPageSizeChange: setPartsPageSize,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
      }}
      emptyState={{
        title: partsSearchParam
          ? CATEGORIES_STRINGS.detail.partsCard.noMatchTitle(partsSearchParam)
          : CATEGORIES_STRINGS.detail.partsCard.emptyTitle,
        description: partsSearchParam
          ? CATEGORIES_STRINGS.detail.partsCard.noMatchHelper
          : CATEGORIES_STRINGS.detail.partsCard.emptyHelper(category.name),
      }}
    />
  );

  // Subcategories render through the SAME listing surface + rows as the
  // Categories list page: the `cpt-table-wrap` shell, a `cpt-table-toolbar`
  // search, reused `CategoryNode` rows, and the footer pager. Children are
  // leaves here (2-level catalogue), so each node carries an empty
  // `subcategories` and renders without a chevron.
  const subTreeNodes: TreeNode[] = paginatedChildren.map((sub) => ({
    id: sub.id,
    name: sub.name,
    partCount: sub.part_count ?? 0,
    isActive: sub.is_active,
    raw: sub,
    subcategories: [],
  }));
  const subcategoriesSection = (
    <div className="cpt-table-wrap">
      <div className="cpt-table-toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={subsSearch}
            onChange={(e) => setSubsSearchRaw(e.target.value || null)}
            placeholder={CATEGORIES_STRINGS.detail.subcategoriesCard.searchPlaceholder}
            className="h-9 pl-9 pr-8"
          />
          {subsSearch && (
            <button
              type="button"
              onClick={() => setSubsSearchRaw(null)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={CATEGORIES_STRINGS.detail.subcategoriesCard.clearSearch}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {/* Add-Subcategory CTA — `ims:manage` only. */}
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => navigate(`/ims/categories/new?parent_id=${category.id}`)}
          >
            <Plus className="mr-1 size-3.5" />
            {CATEGORIES_STRINGS.detail.subcategoriesCard.newButton}
          </Button>
        )}
      </div>

      <div className="p-3">
        {filteredSubCount > 0 ? (
          <div className="space-y-0.5">
            {subTreeNodes.map((node) => (
              <CategoryNode
                key={node.id}
                category={node}
                depth={0}
                expandable={false}
                expanded={NO_EXPANDED}
                onToggle={noopToggle}
                onEdit={(c) => navigate(`/ims/categories/${c.id}/edit`)}
                onDelete={(c) => setPendingDeleteSub(c)}
                deletePending={deleteCategory.isPending}
                canWrite={canWrite}
              />
            ))}
          </div>
        ) : subsSearchQuery ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="size-5 text-muted-foreground/60" />
            <Typography variant="body-strong">
              {CATEGORIES_STRINGS.detail.subcategoriesCard.noMatchTitle(subsSearch.trim())}
            </Typography>
            <Button size="sm" variant="outline" onClick={() => setSubsSearchRaw(null)}>
              {CATEGORIES_STRINGS.detail.subcategoriesCard.clearSearch}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Typography variant="body" tone="muted">
              {CATEGORIES_STRINGS.detail.subcategoriesCard.emptyText}
            </Typography>
          </div>
        )}
      </div>

      {filteredSubCount > 0 && (
        <TablePagination
          page={safeSubsPage}
          totalPages={subsTotalPages}
          pageSize={subsPageSize}
          total={filteredSubCount}
          onPageChange={setSubsPage}
          onPageSizeChange={setSubsPageSize}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <EntityHeader
        title={category.name}
        subtitle={breadcrumbLabel}
        status={
          category.is_active
            ? { label: CATEGORIES_STRINGS.detail.status.active, variant: "success" }
            : { label: CATEGORIES_STRINGS.detail.status.inactive, variant: "neutral" }
        }
        backHref="/ims/categories"
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/ims/categories/${category.id}/edit`)}
              >
                <Pencil className="mr-1.5 size-4" />
                {CATEGORIES_STRINGS.detail.actions.edit}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                aria-label={CATEGORIES_STRINGS.detail.actions.deleteAriaLabel(category.name)}
              >
                <Trash2 className="mr-1.5 size-4" />
                {CATEGORIES_STRINGS.detail.actions.delete}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* KPI strip — Parts, Subcategories, BOM eligibility. BOM is a
          status flag (not a count) so it renders the enabled/disabled
          word + a colored dot at the same scale as the numeric cards;
          parallel layout keeps the row reading as one strip. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <Package className="size-3.5" />
              {CATEGORIES_STRINGS.detail.kpi.parts}
            </div>
          </Typography>
          <Typography asChild variant="section-title" numeric className="mt-1">
            <p>{numberFmt.format(partCount)}</p>
          </Typography>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <Layers className="size-3.5" />
              {CATEGORIES_STRINGS.detail.kpi.subcategories}
            </div>
          </Typography>
          <Typography asChild variant="section-title" numeric className="mt-1">
            <p>{subCount}</p>
          </Typography>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Typography asChild variant="helper" tone="muted" className="flex items-center gap-2">
            <div>
              <Workflow className="size-3.5" />
              {CATEGORIES_STRINGS.detail.kpi.bomEligible}
            </div>
          </Typography>
          {/* Status takes the slot the numbers occupy on the other cards
              — same `section-title` scale so the strip stays balanced
              even though this card carries a word, not a count. A small
              colored dot acts as the at-a-glance signal. */}
          <Typography
            asChild
            variant="section-title"
            className="mt-1 flex items-center gap-2"
          >
            <p>
              <span
                aria-hidden
                className={
                  "inline-block size-2 rounded-full " +
                  (category.is_bom_eligible
                    ? "bg-success"
                    : "bg-muted-foreground/40")
                }
              />
              {category.is_bom_eligible ? CATEGORIES_STRINGS.detail.kpi.bomYes : CATEGORIES_STRINGS.detail.kpi.bomNo}
            </p>
          </Typography>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: a top-level category splits Subcategories / Parts across the
            app's standard DetailTabs (parts here are the ones attached DIRECTLY
            to it); a subcategory (leaf) shows just its parts table. */}
        <div className="space-y-6">
          {isTopLevel ? (
            <DetailTabs
              tabs={[
                {
                  id: "subcategories",
                  label: CATEGORIES_STRINGS.detail.tabs.subcategories,
                  count: subCount,
                  content: subcategoriesSection,
                },
                {
                  id: "parts",
                  label: CATEGORIES_STRINGS.detail.tabs.parts,
                  count: partsTotal,
                  content: renderPartsTable(false),
                },
                specificationsTab,
                approversTab,
              ]}
            />
          ) : (
            <DetailTabs
              tabs={[
                {
                  id: "parts",
                  label: CATEGORIES_STRINGS.detail.tabs.parts,
                  count: partsTotal,
                  content: renderPartsTable(false),
                },
                specificationsTab,
                approversTab,
              ]}
            />
          )}
        </div>

        {/* Right: Compact info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <Typography asChild variant="body">
                <CardTitle>{CATEGORIES_STRINGS.detail.infoCard.title}</CardTitle>
              </Typography>
            </CardHeader>
            <Typography asChild variant="body">
            <CardContent className="space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{CATEGORIES_STRINGS.detail.infoCard.productManager}</span>
                {/* A category can have several active PMs (incl. inherited from
                    an ancestor); show the first as a pill + "+N" that expands to
                    the full list on hover, instead of only the newest one. */}
                <OverflowPillList
                  items={pms}
                  getItemLabel={(pm) => pm.user_name ?? "—"}
                  getItemKey={(pm) => pm.id}
                />
              </div>
              {chain.length > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{CATEGORIES_STRINGS.detail.infoCard.hierarchy}</span>
                  <Typography asChild variant="helper" tone="inherit" className="flex flex-wrap items-center gap-1">
                  <div>
                    {chain.map((c, i) => (
                      <span key={c.id} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-muted-foreground" aria-hidden>{CATEGORIES_STRINGS.detail.infoCard.hierarchySeparator}</span>
                        )}
                        {c.id === category.id ? (
                          <span className="font-medium">{c.name}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/ims/categories/${c.id}`)}
                            className="text-primary hover:underline"
                          >
                            {c.name}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  </Typography>
                </div>
              )}
              {category.description && (
                <div className="flex flex-col gap-1 border-t pt-3">
                  <span className="text-muted-foreground">{CATEGORIES_STRINGS.detail.infoCard.description}</span>
                  <Typography variant="body">{category.description}</Typography>
                </div>
              )}
            </CardContent>
            </Typography>
          </Card>
        </div>
      </div>

      {/* Delete confirmation — preconditions mirror CategoryService.delete()
          guards (`app/modules/ims/services/category_service.py`). */}
      <DeleteWithPreconditionsDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={CATEGORIES_STRINGS.detail.delete.title}
        entityName={category.name}
        description={CATEGORIES_STRINGS.detail.delete.description}
        preconditions={[
          ...(isTopLevel
            ? [
                {
                  satisfied: subCount === 0,
                  label: CATEGORIES_STRINGS.detail.delete.noSubCategories,
                  detail:
                    subCount > 0
                      ? CATEGORIES_STRINGS.detail.delete.subCategoryDetail(subCount)
                      : undefined,
                },
              ]
            : []),
          {
            satisfied: partCount === 0,
            label: CATEGORIES_STRINGS.detail.delete.noActiveParts,
            detail:
              partCount > 0
                ? CATEGORIES_STRINGS.detail.delete.partsDetail(partCount)
                : undefined,
          },
          // PM precondition row — hidden 2026-05-28 per product request.
          // The `pms` variable still drives the sidebar "Product Manager"
          // card, so the `useScopedPMAssignments` fetch above stays;
          // only this row is muted. Restore when PM gating on delete is
          // wanted back.
          /*
          {
            satisfied: pms.length === 0,
            label: "No active PM assignments scoped to this category",
            detail:
              pms.length > 0
                ? `${pms.length} active assignment${pms.length === 1 ? "" : "s"} — revoke from PM Assignments first`
                : undefined,
          },
          */
        ]}
        isPending={deleteCategory.isPending}
        confirmLabel={CATEGORIES_STRINGS.detail.delete.confirmLabel}
        onConfirm={() =>
          deleteCategory.mutate(category.id, {
            onSuccess: () => {
              // No more removeQueries here — calling it while this
              // page's useCategory(id) observer was still mounted
              // caused the observer to re-subscribe and fire a fresh
              // GET (which then 404'd because the row was just
              // deleted). useDeleteCategory's invalidate now skips the
              // deleted id via predicate, so the cache entry stays
              // until this page unmounts on navigate below.
              setShowDelete(false);
              navigate("/ims/categories");
            },
          })
        }
      />

      {/* Subcategory delete — same preconditions as the Categories list page's
          inline delete (a subcategory has no children, so only the
          no-active-parts guard applies). Stays on this page on success; the
          mutation invalidates the children list, which drops the row. */}
      <DeleteWithPreconditionsDialog
        open={pendingDeleteSub != null}
        onOpenChange={(o) => !o && setPendingDeleteSub(null)}
        title={CATEGORIES_STRINGS.list.delete.title}
        entityName={pendingDeleteSub?.name ?? ""}
        description={CATEGORIES_STRINGS.list.delete.description}
        preconditions={
          pendingDeleteSub
            ? [
                {
                  satisfied: (pendingDeleteSub.part_count ?? 0) === 0,
                  label: CATEGORIES_STRINGS.list.preconditions.noActiveParts,
                  detail:
                    (pendingDeleteSub.part_count ?? 0) > 0
                      ? CATEGORIES_STRINGS.list.preconditions.partsDetail(
                          pendingDeleteSub.part_count ?? 0,
                        )
                      : undefined,
                },
              ]
            : []
        }
        isPending={deleteCategory.isPending}
        confirmLabel={CATEGORIES_STRINGS.list.delete.confirmLabel}
        onConfirm={() => {
          if (!pendingDeleteSub) return;
          deleteCategory.mutate(pendingDeleteSub.id, {
            onSuccess: () => setPendingDeleteSub(null),
          });
        }}
      />
    </div>
  );
}

