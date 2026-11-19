import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListChecks, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from "@/components/common/tables/BusinessMetricsTable";
import { PAGINATION } from "@/shared/constants";
import { usePageSizeParam, useQueryParam } from "@/shared/hooks";

import type { Category, SpecificationAttribute } from "../../api";
import { IMS_PAGE_SIZE, IMS_SEARCH_MAX_LEN } from "../../constants";
import { useSpecificationAttributesPaged } from "../../hooks/specification-attributes/useSpecificationAttributes";
import { CATEGORIES_STRINGS } from "./categories.strings";

const T = CATEGORIES_STRINGS.detail.specificationsTab;

interface CategorySpecificationsTabProps {
  category: Category;
  canWrite: boolean;
}

/**
 * Specifications tab on the category / subcategory detail page — the
 * category's linked specification attributes in their display order (the
 * order they're listed first in the parts/variants Specifications dropdown).
 *
 * Server-paginated + server-searched via `GET /ims/specification-attributes
 * ?category_id=…`, same as the Parts tab beside it. `spec_search`,
 * `spec_page` and `spec_page_size` live in the URL so Back from an attribute
 * restores the view. Linking / reordering happens on the category edit form;
 * a row opens that attribute in the Specification Attributes master.
 */
export function CategorySpecificationsTab({ category, canWrite }: CategorySpecificationsTabProps) {
  const navigate = useNavigate();
  const editCategory = () => navigate(`/ims/categories/${category.id}/edit`);

  const [pageRaw, setPageRaw] = useQueryParam("spec_page");
  const page = Math.max(1, Number(pageRaw ?? "1") || 1);
  const setPage = (n: number) => setPageRaw(n > 1 ? String(n) : null);
  const [searchRaw] = useQueryParam("spec_search");
  const search = searchRaw ?? "";
  const [pageSize, setPageSize] = usePageSizeParam({
    key: "spec_page_size",
    pageKey: "spec_page",
    defaultSize: IMS_PAGE_SIZE,
  });
  // Search + page reset in ONE URL update (two sequential setSearchParams
  // calls stomp each other) — same as the Parts tab.
  const [, setSearchParams] = useSearchParams();
  const setSearchAndReset = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set("spec_search", v.slice(0, IMS_SEARCH_MAX_LEN));
        else next.delete("spec_search");
        next.delete("spec_page");
        return next;
      },
      { replace: true },
    );
  };
  // Backend search needs 2+ chars; shorter input is not sent.
  const searchParam = search.trim().length >= 2 ? search.trim() : undefined;

  const query = useSpecificationAttributesPaged({
    page,
    page_size: pageSize,
    search: searchParam,
    category_id: category.id,
  });
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;

  const tab: TabConfig = useMemo(
    () => ({
      id: "specifications",
      label: T.title(total),
      columns: [
        { key: "order", label: T.colOrder, width: "80px" },
        { key: "name", label: T.colName, width: "240px" },
        { key: "values", label: T.colValues },
        { key: "status", label: T.colStatus, width: "120px" },
      ],
      data: rows.map((a) => ({
        // display_order is 0-based on the wire; show it 1-based. It's the
        // attribute's real position, so it stays right under search/paging.
        order: (a.display_order ?? 0) + 1,
        name: a.name,
        values: a.values,
        status: a.is_active,
        _id: a.id,
        _attr: a,
      })),
    }),
    [rows, total],
  );

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === "order") {
      return { display: <span className="tabular-nums">{String(value)}</span> };
    }
    if (key === "values") {
      return {
        display: (
          <OverflowPillList
            items={(value as string[]) ?? []}
            getItemKey={(v) => v}
            getItemLabel={(v) => v}
            summaryLabel={T.colValues}
            hoverTitle={T.colValues}
          />
        ),
      };
    }
    if (key === "status") {
      return {
        display: (
          <StatusBadge variant={value ? "success" : "neutral"}>
            {value ? T.active : T.inactive}
          </StatusBadge>
        ),
      };
    }
    return null;
  };

  // Nothing linked at all (known from the category response, so no search
  // or filter can be the cause) → the empty state + Link action only.
  if ((category.specification_attributes?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={T.emptyTitle}
        description={canWrite ? T.emptyHelperWrite : T.emptyHelperReadOnly}
        action={canWrite ? { label: T.link, onClick: editCategory } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="helper">{T.helper}</Typography>
        {canWrite && (
          <Button type="button" variant="outline" size="sm" onClick={editCategory}>
            <Pencil className="mr-1.5 size-4" />
            {T.edit}
          </Button>
        )}
      </div>
      <BusinessMetricsTable
        showIndex={false}
        searchable
        searchValue={search}
        onSearchChange={setSearchAndReset}
        searchPlaceholder={T.searchPlaceholder}
        onClearFilters={() => setSearchAndReset("")}
        externalFiltersActive={search.trim().length > 0}
        tabs={[tab]}
        activeTab="specifications"
        cellFormatter={cellFormatter}
        persistKey="ims-category-specifications"
        onRowClick={
          canWrite
            ? (row) =>
                navigate(
                  `/ims/specification-attributes/${(row._attr as SpecificationAttribute).id}/edit`,
                )
            : undefined
        }
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching: query.isFetching,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        }}
        error={
          query.isError
            ? {
                title: T.errorTitle,
                description: T.errorHelper,
                onRetry: () => void query.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: searchParam ? T.noMatchTitle(searchParam) : T.emptyTitle,
          description: searchParam ? T.noMatchHelper : undefined,
        }}
      />
    </div>
  );
}
