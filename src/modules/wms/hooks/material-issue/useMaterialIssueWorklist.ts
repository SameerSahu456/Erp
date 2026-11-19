import { useMemo, useState } from "react";

import { type DateRange } from "@/components/common/pickers/DateRangePicker";
import { dateRangeToParams } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";
import { useDebounce } from "@/shared/hooks";
import { UI } from "@/shared/constants/ui";
import { useTabbedListView } from "@/shared/hooks/useTabbedListView";
import { useTabCounts } from "@shared/hooks/useTabCounts";
import { usePermission } from "@shared/rbac";

import { wmsCan } from "../../permissions";
import { WMS_PAGE_SIZE } from "../../constants";
import { useWarehouseScope } from "../../context/warehouse-scope";
import {
  fetchMaterialIssueLines,
  type MaterialIssueLineRow,
  type MaterialIssueLinesQuery,
  type MaterialIssueType,
} from "../../api";
import { getIssueTypeLabel } from "../../constants/material-issue-status";
import {
  MI_LINES_SEARCH_MAX,
  QC_ONLY_TAB_IDS,
  SORT_FIELD_MAP,
  TAB_IDS,
  variantRowLabel,
  type MiTabId,
} from "../../components/material-issue/material-issue-lines-helpers";
import { wmsKeys } from "../keys";
import { useMaterialIssueLines } from "./useMaterialIssueLines";
import {
  useCancelMaterialIssue,
  useIssueMaterialIssue,
} from "./useMaterialIssueMutations";
import { useEngineersAcrossWarehousesOptions } from "../warehouses/useEngineerPickerOptions";
import { useWmsStageAccess } from "../operations/useStageAccess";

const DASH = "—";
const SHORT_ID_CHARS = 8;
const NO_CAPABILITY_FILTER: never[] = [];

interface MiFilters {
  issue_type: MaterialIssueType | "";
  engineer_id: string;
  engineer_label: string;
  dateRange: DateRange | undefined;
}

const capSearch = (s: string | undefined) =>
  (s ?? "").trim().slice(0, MI_LINES_SEARCH_MAX);

/** State + data owner for the Material Issue worklist (§17). */
export function useMaterialIssueWorklist() {
  // A QC-capability engineer who is NOT a manager/admin runs only the OUTWARD
  // QC step; managers/admin keep the full page (incl. the All tab).
  const { isManager, isAdmin, canSeeStage } = useWmsStageAccess();
  const qcOnly = !isManager && canSeeStage("qc");
  // "Issue" creates an outward material issue — gate it on outward_manage so a
  // QC-only engineer doesn't see a New button that only 403s.
  const canManage = usePermission().can(wmsCan.outwardManage);
  const visibleTabIds = qcOnly ? QC_ONLY_TAB_IDS : TAB_IDS;

  // Per-tab view (search / filters / page / page size) in an in-memory store:
  // survives list ↔ detail nav, resets on refresh or on leaving the section.
  const lv = useTabbedListView<MiFilters, MiTabId>({
    storageKey: "wms-material-issue",
    tabIds: visibleTabIds,
    defaultTab: qcOnly ? "issued" : "all",
    emptyFilters: () => ({
      issue_type: "",
      engineer_id: "",
      engineer_label: "",
      dateRange: undefined,
    }),
    pageSize: WMS_PAGE_SIZE,
  });
  const activeTab = lv.activeTab;
  const { search, sortColumn, sortDirection, page, pageSize, filters } =
    lv.view;

  // Warehouse scope comes from the global navbar picker. Reset pages + clear
  // the stale engineer pick when the scope changes (adjust-during-render).
  const { selectedWarehouseIds } = useWarehouseScope();
  const whKey = selectedWarehouseIds.join(",");
  const [lastWh, setLastWh] = useState(whKey);
  if (whKey !== lastWh) {
    setLastWh(whKey);
    lv.resetAllViews();
    lv.setFilters({ engineer_id: "", engineer_label: "" });
  }

  // Start/Re-run QC is the only listing action that opens a dialog here.
  const [qcRow, setQcRow] = useState<MaterialIssueLineRow | null>(null);
  const issueMutation = useIssueMaterialIssue();
  const cancelMutation = useCancelMaterialIssue();

  const debouncedSearch = useDebounce(capSearch(search), UI.DEBOUNCE_SEARCH_MS);
  const { date_from, date_to } = dateRangeToParams(filters.dateRange);

  // role=primary → one row per MACHINE; components never appear as rows here.
  const linesQuery = useMaterialIssueLines({
    role: "primary",
    stage: activeTab === "all" ? undefined : activeTab,
    warehouseIds: selectedWarehouseIds,
    issueType: filters.issue_type || undefined,
    issuedToUserId: filters.engineer_id || undefined,
    q: debouncedSearch || undefined,
    // Unmapped / unsorted columns fall back to the endpoint default.
    sort: toSortParam(sortColumn, sortDirection, SORT_FIELD_MAP),
    dateFrom: date_from,
    dateTo: date_to,
    page,
    page_size: pageSize,
  });
  const total = linesQuery.data?.total ?? 0;

  // Filter-aware tab badge counts (devices pattern): the active tab reuses the
  // list `total`; every inactive tab runs a slim page_size:1 count of its own view.
  const countParamsFor = (id: MiTabId): MaterialIssueLinesQuery => {
    const v = lv.viewByTab[id];
    const q =
      (id === activeTab ? debouncedSearch : capSearch(v?.search)) || undefined;
    const range = dateRangeToParams(v?.filters.dateRange);
    return {
      role: "primary",
      stage: id === "all" ? undefined : id,
      warehouseIds: selectedWarehouseIds,
      issueType: v?.filters.issue_type || undefined,
      issuedToUserId: v?.filters.engineer_id || undefined,
      q,
      dateFrom: range.date_from,
      dateTo: range.date_to,
      page: 1,
      page_size: 1,
    };
  };
  const countFor = useTabCounts({
    tabIds: visibleTabIds,
    activeTab,
    activeTotal: total,
    paramsFor: countParamsFor,
    queryKey: wmsKeys.materialIssues.linesCount,
    fetchCount: fetchMaterialIssueLines,
  });

  // "Issued to" filter → EVERY engineer of the scoped warehouses (an MI may be
  // handed to any level), so no capability filter. Backend actor-scopes it.
  const useEngineerOptions = useEngineersAcrossWarehousesOptions(
    selectedWarehouseIds,
    NO_CAPABILITY_FILTER,
  );

  // Part label + engineer name ride on each row — no per-id fetches.
  const tableRows = useMemo(
    () =>
      (linesQuery.data?.items ?? []).map((r) => ({
        id: r.line_id,
        issueNo: r.mi_number,
        type: r.issue_type ? getIssueTypeLabel(r.issue_type) : DASH,
        part: variantRowLabel(r),
        serial: r.internal_serial || r.manufacturer_serial || DASH,
        stage: r.stage,
        issuedTo:
          r.issued_to_name ?? r.issued_to_user_id.slice(0, SHORT_ID_CHARS),
        materialIssueId: r.material_issue_id,
        rentalOrderNumber: r.rental_order_number ?? null,
        raw: r,
      })),
    [linesQuery.data],
  );

  return {
    lv,
    activeTab,
    visibleTabIds,
    qcOnly,
    canManage,
    // CP-605 #5: a plain engineer's worklist is backend-scoped to their own
    // issued units, so the engineer filter is a no-op for them.
    showEngineerFilter: isManager || isAdmin,
    selectedWarehouseIds,
    linesQuery,
    total,
    countFor,
    tableRows,
    useEngineerOptions,
    issueMutation,
    cancelMutation,
    qcRow,
    setQcRow,
  };
}
