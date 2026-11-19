import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { makeStaticAsyncOptions, type AsyncSelectOption } from "@/components/ui/async-select";
import { useMemoryState } from "@/shared/hooks/useMemoryState";
import { useDebounce } from "@/shared/hooks";
import { UI } from "@shared/constants/ui";

import { useWarehouseScope } from "../../context/warehouse-scope";
import type { VendorJobListParams, VendorJobSummary } from "../../api/service-jobs";
import {
  VENDOR_JOBS_PAGE_SIZE,
  VENDOR_JOBS_SEARCH_MAX,
  VENDOR_JOB_DEFAULT_TAB,
  VENDOR_JOB_TAB_IDS,
  filtersForTab,
  tabCount,
  vendorJobColumns,
  vendorJobRow,
  vendorJobSortParam,
  type VendorJobTabId,
} from "../../components/vendor-jobs/vendor-jobs-list.columns";
import { VENDOR_JOBS_STRINGS as S } from "../../components/vendor-jobs/vendor-jobs.strings";
import { useServiceJobs, useServiceJobStats } from "./useServiceJobs";
import { useServiceSection, useServiceSections } from "./useServiceSections";
import { useServiceVendors } from "./useServiceVendors";

type SortDirection = "asc" | "desc" | null;
export type VendorJobDialogKind = "send" | "resend" | "receive" | "cancel";

type SectionRow = { code: string };

// Known once the section list confirms it; unknown only after that list loads.
function sectionValidity(sectionCode: string | undefined, all: SectionRow[] | undefined) {
  const sectionKnown = !sectionCode || (all ?? []).some((s) => s.code === sectionCode);
  return { sectionKnown, sectionUnknown: !!sectionCode && all !== undefined && !sectionKnown };
}

function findSection<T extends SectionRow>(all: T[] | undefined, code: string | null | undefined) {
  return (all ?? []).find((s) => s.code === code);
}

/** The Vendor filter's options: each vendor of the section (or of every section) once,
 *  inactive ones too since their old jobs are still listed. A bounded set, fetched whole. */
function useVendorFilterOptions(sectionCode: string | undefined) {
  const { data: rows = [] } = useServiceVendors(sectionCode);
  return useMemo(() => {
    const byVendor = new Map<string, string>();
    for (const r of rows) if (!byVendor.has(r.vendor_id)) byVendor.set(r.vendor_id, r.vendor_name ?? "");
    const options = [...byVendor].map(([id, label]) => ({ id, label }));
    return makeStaticAsyncOptions(options, (o) => o.label);
  }, [rows]);
}

/** Vendor-jobs queue state for every section (§17); server-side and warehouse-scoped (§0.16). */
export function useVendorJobsList() {
  const { sectionCode } = useParams<{ sectionCode?: string }>();
  const section = useServiceSection(sectionCode);
  const { data: allSections } = useServiceSections();

  // Tab is held in the cross-mount memory store so opening a device and
  // hitting Back returns to the same tab. Keyed per section. (CP-463)
  const memoryKey = `wms-vendor-jobs:${sectionCode ?? "all"}`;
  const [rawTab, setTab] = useMemoryState<VendorJobTabId>(
    `${memoryKey}:tab`,
    VENDOR_JOB_DEFAULT_TAB,
  );
  const tab = VENDOR_JOB_TAB_IDS.includes(rawTab) ? rawTab : VENDOR_JOB_DEFAULT_TAB;
  // Search is PER TAB (mirrors the Devices listing); sort / page are shared.
  const [searchByTab, setSearchByTab] = useState<Partial<Record<VendorJobTabId, string>>>({});
  // Vendor is shared by every tab, and kept on Back like the tab.
  const [vendor, setVendor] = useMemoryState<AsyncSelectOption | null>(
    `${memoryKey}:vendor`,
    null,
  );
  const vendorId = vendor?.id;
  const useVendorOptions = useVendorFilterOptions(sectionCode);
  const search = searchByTab[tab] ?? "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(VENDOR_JOBS_PAGE_SIZE);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  // Row actions open the same dialogs the device-detail cards use.
  const [dialog, setDialog] = useState<{ kind: VendorJobDialogKind; job: VendorJobSummary } | null>(null);

  // Warehouse or section switch resets the whole view (§1.1-K).
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const scopeKey = `${whKey}|${sectionCode ?? ""}`;
  const [lastScope, setLastScope] = useState(scopeKey);
  if (scopeKey !== lastScope) {
    setLastScope(scopeKey);
    setPage(1);
    setTab(VENDOR_JOB_DEFAULT_TAB);
    setSearchByTab({});
    setVendor(null);
    setSortColumn(null);
    setSortDirection(null);
  }

  // Debounced + capped; clearing bypasses the debounce so the list updates
  // immediately.
  const trimmedSearch = search.trim().slice(0, VENDOR_JOBS_SEARCH_MAX);
  const debouncedSearch = useDebounce(trimmedSearch, UI.DEBOUNCE_SEARCH_MS);
  const effectiveSearch = trimmedSearch ? debouncedSearch : "";
  const sortParam = vendorJobSortParam(sortColumn, sortDirection);
  const warehouseIds = selectedWarehouseIds.length ? selectedWarehouseIds : undefined;

  const listParams = useMemo<VendorJobListParams>(
    () => ({
      section: sectionCode,
      warehouse_ids: warehouseIds,
      search: effectiveSearch || undefined,
      vendor_id: vendorId,
      sort: sortParam,
      page,
      page_size: pageSize,
      ...filtersForTab(tab),
    }),
    // warehouseIds is stable-keyed via whKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionCode, whKey, effectiveSearch, vendorId, sortParam, page, pageSize, tab],
  );
  // Search is NOT sent to the grouped tab-count stats: it moves only the
  // active tab's badge (via the list `total`), the Devices behaviour. The
  // vendor is, since it narrows every tab.
  const statsParams = useMemo<VendorJobListParams>(
    () => ({ section: sectionCode, warehouse_ids: warehouseIds, vendor_id: vendorId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionCode, whKey, vendorId],
  );

  // §11.1 — `:sectionCode` is untrusted. Until the section list confirms it,
  // nothing is requested; an unknown code renders not-found.
  const { sectionKnown, sectionUnknown } = sectionValidity(sectionCode, allSections);
  const jobsQuery = useServiceJobs(listParams, { enabled: sectionKnown });
  const { data: stats } = useServiceJobStats(statsParams, { enabled: sectionKnown });
  const data = jobsQuery.data;

  const columns = useMemo(() => {
    const inView = (allSections ?? []).filter((s) => !sectionCode || s.code === sectionCode);
    const showReplacement = inView.length > 0 && inView.every((s) => s.tracks_replacement);
    return vendorJobColumns(!sectionCode, showReplacement);
  }, [allSections, sectionCode]);

  const rows = useMemo(() => (data?.items ?? []).map(vendorJobRow), [data]);
  const isPlaceholderData = jobsQuery.isPlaceholderData;

  // Every tab carries the SAME columns; the active tab is a server filter.
  const tabs = useMemo(
    () =>
      VENDOR_JOB_TAB_IDS.map((id) => {
        // Active tab reflects its own search via the list `total`; the others
        // use the search-less grouped stats.
        const live = id === tab && !isPlaceholderData;
        return {
          id,
          label: S.tabs[id],
          columns,
          data: id === tab ? rows : [],
          count: live ? (data?.total ?? tabCount(id, stats)) : tabCount(id, stats),
        };
      }),
    [columns, rows, tab, stats, data?.total, isPlaceholderData],
  );

  const openDialog = (kind: VendorJobDialogKind, jobId: string) => {
    const job = (data?.items ?? []).find((j) => j.id === jobId);
    if (job) setDialog({ kind, job });
  };
  // The dialog needs the job's own ServiceSection (the cross-section list
  // mixes sections).
  const dialogSection = dialog ? findSection(allSections, dialog.job.section_code) : undefined;

  return {
    sectionCode,
    section,
    sectionUnknown,
    jobsQuery,
    jobs: data?.items ?? [],
    tabs,
    tab,
    setTab: (id: VendorJobTabId) => {
      setTab(id);
      setPage(1);
    },
    search,
    setSearch: (q: string) => {
      setSearchByTab((prev) => ({ ...prev, [tab]: q }));
      setPage(1);
    },
    vendor,
    setVendor: (next: AsyncSelectOption | null) => {
      setVendor(next);
      setPage(1);
    },
    useVendorOptions,
    clearFilters: () => {
      setSearchByTab((prev) => ({ ...prev, [tab]: "" }));
      setVendor(null);
      setPage(1);
    },
    page,
    setPage,
    pageSize: data?.page_size ?? pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    sortColumn,
    sortDirection,
    setSort: (column: string | null, direction: SortDirection) => {
      setSortColumn(column);
      setSortDirection(direction);
      setPage(1);
    },
    dialog,
    dialogSection,
    openDialog,
    closeDialog: () => setDialog(null),
  };
}
