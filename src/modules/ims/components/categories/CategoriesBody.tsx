import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { ListPageShell } from "@/components/page-shells";
import {
  useClearFiltersOnReload,
  useFilterParams,
  usePageSizeParam,
} from "@/shared/hooks";
import { TablePagination } from "@/components/common/tables/TablePagination";
import { useListSearchFilters } from "@/shared/hooks";
import { BUSINESS_METRICS_TABLE_STRINGS } from "@/components/common/tables/business-metrics-table.strings";

import { usePermission } from "@shared/rbac";

import { DeleteWithPreconditionsDialog } from "../../components/shared/DeleteWithPreconditionsDialog";
import {
  useAllCategories,
  useCategoriesPage,
  useDeleteCategory,
} from "../../hooks/categories/useCategories";
// PM-assignment probe import — commented 2026-05-28 alongside the delete
// dialog's PM precondition row. Restore when re-enabling PM gating.
// import { useScopedPMAssignments } from "../../hooks/pm-assignments/usePMAssignments";
import type { Category } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { imsCan } from "../../permissions";
import { CATEGORIES_STRINGS } from "./categories.strings";
import { CategoryNode } from "./CategoryNode";
import {
  buildTree,
  collectAllIds,
  countDescendants,
  type TreeNode,
} from "./categories-body-helpers";


export function CategoriesBody() {
  // Refresh = "start over" for filters: on browser reload we drop every
  // URL param so the user lands on the unfiltered tree. SPA-nav (back
  // from a detail page, sidebar link) is unaffected.
  useClearFiltersOnReload();

  // RBAC: read-only users see the tree but no Edit / Delete hover
  // actions and no "New Category" CTA in the header.
  const { can } = usePermission();
  const canWrite = can([...imsCan.write]);

  const navigate = useNavigate();
  // Search + pagination live in the URL so back-nav from a detail page
  // restores the filtered listing. The mode (search vs tree) is derived
  // from whether `search` is set, so a single `page` URL param doubles
  // as "page of search results" or "page of tree", picked by mode below.
  // Page sizes + expand state stay local — power preferences.
  const { get, set } = useFilterParams();
  const search = get("search");
  // Cap at the backend `search` limit so a long paste can't 422.
  const setSearch = (v: string) => set("search", v.slice(0, IMS_SEARCH_MAX_LEN));
  const urlPage = Math.max(1, Number(get("page", "1")) || 1);
  const setUrlPage = (n: number) => set("page", n > 1 ? String(n) : null);
  const searchPage = urlPage;
  const setSearchPage = setUrlPage;
  const treePage = urlPage;
  const setTreePage = setUrlPage;
  // Search + tree views share the `page` URL key (only one is active at a
  // time), so the same `page_size` key powers both.
  const [searchPageSize, setSearchPageSize] = usePageSizeParam({
    defaultSize: IMS_PAGE_SIZE,
  });
  const [treePageSize, setTreePageSize] = usePageSizeParam({
    defaultSize: IMS_PAGE_SIZE,
  });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Create + edit moved to /ims/categories/new + /ims/categories/:id/edit
  // pages — only delete still lives inline as a confirm.
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  // Lazy PM-assignment scan for the delete dialog — commented out
  // 2026-05-28 per product request: no PM-related activity in IMS
  // delete dialogs (and don't fire the PM API for the precondition
  // probe either). Restore alongside the matching precondition row in
  // the dialog below when PM gating is wanted back.
  //
  // const pendingPmsQuery = useScopedPMAssignments({
  //   category_id: pendingDelete?.id,
  // });
  // const pendingPmsCount = pendingPmsQuery.data?.length ?? 0;

  const deleteCategory = useDeleteCategory();

  // Server-side search: debounce ≥ 2 chars before sending to backend.
  // Backend rejects search shorter than 2 chars (min_length=2).
  // Debounced + length-capped search from the shared hook (search cap =
  // 100). `isSearching` (below) puts the page into search mode.
  const { searchParam: apiSearch } = useListSearchFilters({
    search,
    maxLength: IMS_SEARCH_MAX_LEN,
  });

  const isSearching = !!apiSearch;

  // When searching: server-paginated fetch with search param.
  // When not searching: chained-pages fetch over the full catalog so the
  // tree can wire parents to children; root-level pagination is applied
  // client-side over the resulting roots.
  const searchQuery = useCategoriesPage(
    isSearching
      ? { page: searchPage, page_size: searchPageSize, search: apiSearch }
      : { page: 1, page_size: searchPageSize },
  );
  const allQuery = useAllCategories({ enabled: !isSearching });

  const categoriesQuery = isSearching ? searchQuery : allQuery;
  const allCategories = isSearching
    ? searchQuery.data?.items ?? []
    : allQuery.data ?? [];
  const total = isSearching ? searchQuery.data?.total ?? 0 : 0;

  // Tree view (only when not searching)
  const tree = useMemo(
    () => (isSearching ? [] : buildTree(allCategories as Category[])),
    [allCategories, isSearching],
  );

  // Root-level pagination — children of each root stay nested. The total
  // count for the footer is the number of root categories, not the whole
  // catalog (children are accessed via expand).
  const treeTotal = tree.length;
  const paginatedTree = useMemo(
    () =>
      tree.slice(
        (treePage - 1) * treePageSize,
        treePage * treePageSize,
      ),
    [tree, treePage, treePageSize],
  );

  // Flat search results (only when searching)
  const searchResults = useMemo(
    () =>
      isSearching
        ? allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            partCount: c.part_count ?? 0,
            isActive: c.is_active,
            raw: c,
            subcategories: [] as TreeNode[],
          }))
        : [],
    [allCategories, isSearching],
  );

  const allIds = useMemo(() => collectAllIds(tree), [tree]);
  const searchActive = search.trim().length > 0;

  const effectiveExpanded = useMemo(() => {
    if (isSearching) return new Set<string>();
    if (searchActive && !isSearching) return new Set(allIds);
    return expanded;
  }, [isSearching, searchActive, expanded, allIds]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setExpanded]);

  const summary = useMemo(() => {
    const rootCount = tree.length;
    let subCount = 0;
    let partCount = 0;
    for (const cat of tree) {
      subCount += countDescendants(cat);
      partCount += cat.partCount;
      const walk = (c: TreeNode) => {
        for (const s of c.subcategories) {
          partCount += s.partCount;
          walk(s);
        }
      };
      walk(cat);
    }
    return { rootCount, subCount, partCount };
  }, [tree]);

  const allExpanded = expanded.size === allIds.length && allIds.length > 0;

  function handleEdit(c: Category) {
    navigate(`/ims/categories/${c.id}/edit`);
  }
  function handleDelete(c: Category) {
    setPendingDelete(c);
  }

  const displayItems = isSearching ? searchResults : paginatedTree;
  const isEmpty = displayItems.length === 0;

  return (
    // ListPageShell is the same shell every BMT-based IMS list page
    // (HSN / OEMs / Parts / PM Assignments) wraps with — so the gap
    // between the page header and the bordered listing surface is the
    // exact same `flex flex-col gap-5` everywhere, not approximated
    // by a per-page `space-y-*` value.
    <ListPageShell
      title={CATEGORIES_STRINGS.list.title}
      subtitle={
        isSearching
          ? CATEGORIES_STRINGS.list.subtitle.searching(total, apiSearch ?? "")
          : CATEGORIES_STRINGS.list.subtitle.tree(
              summary.rootCount,
              summary.subCount,
              summary.partCount,
            )
      }
      actions={
        canWrite ? (
          <Button onClick={() => navigate("/ims/categories/new")}>
            <Plus className="mr-1.5 size-4" />
            {CATEGORIES_STRINGS.list.newCategory}
          </Button>
        ) : undefined
      }
    >
      {/* `cpt-table-wrap` — the project's listing-surface shell: border,
          radius, resting shadow, and (critically) excluded from the card
          hover-lift rules so the category tree stays flat / static.
          Search + Expand-all live inside the wrap as a top toolbar so
          this page reads with the same search-to-table spacing as the
          BMT-based IMS list pages, where the search is part of the same
          bordered surface and not a separate row above it. */}
      <div className="cpt-table-wrap">
        <div className="cpt-table-toolbar">
          {/* `min-w-0` is load-bearing: a flex child defaults to
              `min-width: auto`, which the browser resolves against the
              input's *content* once the value is long enough. Without
              it, typing ~50 chars pushes this column wider than its 1fr
              share and the Expand-all button overlaps the input on the
              right. */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Typography asChild variant="body" tone="inherit">
            <Input
              value={search}
              onChange={(e) => {
                // `setSearch` already drops the `page` param via
                // useFilterParams. A second setPage call here would stomp
                // the search update — both setSearchParams calls see the
                // same `prev` URL and only the last one survives.
                setSearch(e.target.value);
              }}
              placeholder={CATEGORIES_STRINGS.list.searchPlaceholder}
              maxLength={IMS_SEARCH_MAX_LEN}
              className="h-9 pl-9 pr-8"
            />
            </Typography>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={CATEGORIES_STRINGS.list.clearSearch}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {!isSearching && (
            <Button
              variant="ghost"
              size="sm"
              disabled={searchActive}
              onClick={() => setExpanded(allExpanded ? new Set() : new Set(allIds))}
              className="shrink-0 text-muted-foreground"
            >
              {allExpanded ? CATEGORIES_STRINGS.list.collapseAll : CATEGORIES_STRINGS.list.expandAll}
            </Button>
          )}
        </div>

        <div className="p-3">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Search className="size-5 text-muted-foreground/60" />
              <Typography variant="body-strong">
                {isSearching
                  ? BUSINESS_METRICS_TABLE_STRINGS.emptyState.filteredTitle
                  : CATEGORIES_STRINGS.list.empty.emptyTitle}
              </Typography>
              <Typography asChild variant="helper">
                <p>
                  {isSearching
                    ? BUSINESS_METRICS_TABLE_STRINGS.emptyState.filteredDescription
                    : CATEGORIES_STRINGS.list.empty.emptyHelper}
                </p>
              </Typography>
              {/* Same "No results match your filters" + Clear filters affordance
                  as the BMT-backed IMS listings (this page is a bespoke tree, not
                  BMT), so the empty state is consistent across IMS. */}
              {isSearching && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => setSearch("")}
                >
                  {BUSINESS_METRICS_TABLE_STRINGS.emptyState.clearFilters}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {displayItems.map((cat) => (
                <CategoryNode
                  key={cat.id}
                  category={cat}
                  depth={0}
                  expanded={effectiveExpanded}
                  onToggle={toggleExpanded}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletePending={deleteCategory.isPending}
                  canWrite={canWrite}
                />
              ))}
            </div>
          )}
        </div>

        {isSearching ? (
          <TablePagination
            page={searchPage}
            pageSize={searchPageSize}
            totalPages={Math.max(1, Math.ceil(total / searchPageSize))}
            total={total}
            isFetching={categoriesQuery.isFetching}
            onPageChange={setSearchPage}
            onPageSizeChange={setSearchPageSize}
          />
        ) : (
          <TablePagination
            page={treePage}
            pageSize={treePageSize}
            totalPages={Math.max(1, Math.ceil(treeTotal / treePageSize))}
            total={treeTotal}
            isFetching={categoriesQuery.isFetching}
            onPageChange={setTreePage}
            onPageSizeChange={setTreePageSize}
          />
        )}
      </div>

      {/* Delete confirmation — preconditions mirror CategoryService.delete()
          guards. Sub-category check only shown for top-level rows (the
          catalogue is 2-deep). PM count is a lazy probe. */}
      <DeleteWithPreconditionsDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={CATEGORIES_STRINGS.list.delete.title}
        entityName={pendingDelete?.name ?? ""}
        description={CATEGORIES_STRINGS.list.delete.description}
        preconditions={
          pendingDelete
            ? [
                ...(pendingDelete.parent_id == null
                  ? [
                      {
                        satisfied: (pendingDelete.subcategory_count ?? 0) === 0,
                        label: CATEGORIES_STRINGS.list.preconditions.noSubCategories,
                        detail:
                          (pendingDelete.subcategory_count ?? 0) > 0
                            ? CATEGORIES_STRINGS.list.preconditions.subCategoryDetail(pendingDelete.subcategory_count ?? 0)
                            : undefined,
                      },
                    ]
                  : []),
                {
                  satisfied: (pendingDelete.part_count ?? 0) === 0,
                  label: CATEGORIES_STRINGS.list.preconditions.noActiveParts,
                  detail:
                    (pendingDelete.part_count ?? 0) > 0
                      ? CATEGORIES_STRINGS.list.preconditions.partsDetail(pendingDelete.part_count ?? 0)
                      : undefined,
                },
                // PM precondition row — hidden 2026-05-28 per product
                // request; restore alongside the `pendingPmsQuery` block
                // above when PM gating on delete is wanted back.
                /*
                {
                  satisfied: pendingPmsCount === 0,
                  loading: pendingPmsQuery.isLoading,
                  label: "No active PM assignments scoped to this category",
                  detail:
                    pendingPmsCount > 0
                      ? `${pendingPmsCount} active assignment${pendingPmsCount === 1 ? "" : "s"} — revoke from PM Assignments first`
                      : undefined,
                },
                */
              ]
            : []
        }
        isPending={deleteCategory.isPending}
        confirmLabel={CATEGORIES_STRINGS.list.delete.confirmLabel}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteCategory.mutate(pendingDelete.id, {
            onSuccess: () => setPendingDelete(null),
          });
        }}
      />

      {/* Link import retained for compatibility with demo source — kept here
          so the demo's edit-route option remains a one-line swap if you
          later add `/ims/categories/:id/edit`. */}
      {false && <Link to="#" aria-hidden />}
    </ListPageShell>
  );
}

