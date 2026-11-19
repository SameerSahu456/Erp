import { useMemo } from "react";

import type { TabConfig } from "@/components/common/tables/BusinessMetricsTable";
import { useAllCategoriesShort, useChecklistTypes, useChecklistsList, type CategoryShort } from "@modules/ims";
import { useDebounce } from "@/shared/hooks";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { UI } from "@shared/constants/ui";
import { toSortParam } from "@shared/lib/sort-param";

import { WMS_PAGE_SIZE } from "../../constants";
import { CHECKLIST_QC_TYPE_CODES } from "../../components/checklist-templates/checklist-template-form-helpers";
import {
  CHECKLIST_COLUMNS,
  CHECKLIST_DEFAULT_SORT,
  CHECKLIST_SORT_FIELD_MAP,
} from "../../components/checklist-templates/checklist-templates.columns";
import { CHECKLIST_TEMPLATES_STRINGS } from "../../components/checklist-templates/checklist-templates.strings";

const QC_CODES: readonly string[] = CHECKLIST_QC_TYPE_CODES;
// Backend enforces min_length=2 on `search` — shorter values are dropped to
// avoid 422s and fall back to the full list.
const MIN_SEARCH_CHARS = 2;

export interface ChecklistAssignedTo {
  targetType: string;
  targetId: string;
  targetName: string | null;
  targetPath: string | null;
}

const sumQc = (src: Record<string, number>) =>
  CHECKLIST_QC_TYPE_CODES.reduce((sum, c) => sum + (src[c] ?? 0), 0);

/** State + data owner for the checklist-templates listing (§17). */
export function useChecklistTemplatesList() {
  // Per-tab view (search + page + page size + sort) in an in-memory store:
  // survives list ↔ detail nav, resets on refresh or on leaving the section.
  const lv = useTabbedListView<Record<string, never>, string>({
    storageKey: "wms-checklists",
    // Only Inward QC + Outward QC are surfaced; retired types get no tab.
    tabIds: ["all", ...CHECKLIST_QC_TYPE_CODES],
    defaultTab: "all",
    emptyFilters: () => ({}),
    pageSize: WMS_PAGE_SIZE,
  });
  const activeTab = lv.activeTab;
  const { search, page, pageSize, sortColumn, sortDirection } = lv.view;
  const sort = toSortParam(sortColumn, sortDirection, CHECKLIST_SORT_FIELD_MAP) ?? CHECKLIST_DEFAULT_SORT;
  const trimmedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS).trim();

  const templatesQuery = useChecklistsList({
    type_code: activeTab === "all" ? undefined : activeTab,
    search: trimmedSearch.length >= MIN_SEARCH_CHARS ? trimmedSearch : undefined,
    page,
    page_size: pageSize,
    sort,
  });
  const total = templatesQuery.data?.total ?? 0;

  // Search-less per-type counts for the INACTIVE tab badges — typing moves
  // only the active tab's badge (Devices reference behaviour).
  const baseCountsQuery = useChecklistsList({ page: 1, page_size: 1 });

  const { data: typesData } = useChecklistTypes();
  // Category names — one fetch, looked up by id for category-targeted rows.
  const { data: categoryList } = useAllCategoriesShort();
  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryShort>();
    (categoryList ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [categoryList]);

  const rows = useMemo(() => {
    const types = typesData ?? [];
    const typeLabel = (code: string) =>
      types.find((t) => t.code === code)?.label ?? code.charAt(0).toUpperCase() + code.slice(1);
    return (templatesQuery.data?.items ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      type: typeLabel(t.type_code),
      typeCode: t.type_code,
      // §11 — the part label is denormalized onto the row (target_path =
      // part_number, target_name = parts.name): no per-row part fetch.
      assignedTo: {
        targetType: t.target_type,
        targetId: t.target_id,
        targetName: t.target_name ?? null,
        targetPath: t.target_path ?? null,
      } satisfies ChecklistAssignedTo,
      itemCount: t.items.length,
      active: t.is_active,
      actions: t.id,
    }));
  }, [templatesQuery.data, typesData]);

  // Counts from `type_counts`: active tab uses its search; "All" sums the QC codes.
  const tabs = useMemo<TabConfig[]>(() => {
    const base = baseCountsQuery.data?.type_counts ?? {};
    const filtered = templatesQuery.data?.type_counts ?? {};
    const fresh = !templatesQuery.isPlaceholderData;
    const badgeFor = (id: string) => {
      if (id === activeTab && fresh) return id === "all" ? sumQc(filtered) : total;
      return id === "all" ? sumQc(base) : (base[id] ?? 0);
    };
    const entries = [
      { id: "all", label: CHECKLIST_TEMPLATES_STRINGS.list.allTab },
      ...(typesData ?? [])
        .filter((t) => QC_CODES.includes(t.code))
        .map((t) => ({ id: t.code, label: t.label })),
    ];
    return entries.map((tab) => ({
      id: tab.id,
      label: tab.label,
      count: badgeFor(tab.id),
      columns: CHECKLIST_COLUMNS,
      data: tab.id === activeTab ? rows : [],
    }));
  }, [
    activeTab,
    rows,
    typesData,
    templatesQuery.data,
    templatesQuery.isPlaceholderData,
    baseCountsQuery.data,
    total,
  ]);

  return { lv, activeTab, search, page, pageSize, sortColumn, sortDirection, total, templatesQuery, tabs, categoryById };
}
