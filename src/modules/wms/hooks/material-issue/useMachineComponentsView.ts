import { useState } from "react";

import { useDebounce } from "@/shared/hooks";
import { UI } from "@/shared/constants/ui";

import type { MachineComponentKind, MachineComponentsQuery } from "../../api";
import { useDeviceChecklistRuns } from "../devices/useDevices";
import { useMachineComponents } from "./useMaterialIssues";

/** Embedded components table — one page of a single machine's parts. */
export const MACHINE_COMPONENTS_PAGE_SIZE = 10;
// Backend `q` cap — a long paste never 422s.
const SEARCH_MAX = 50;

export type MachineComponentsTab = MachineComponentKind | "outward_qc";
export type MachineComponentCol =
  "component" | "variant" | "serial" | "rack" | "bin" | "note" | "date";

const FULL_COLS: MachineComponentCol[] = [
  "component",
  "variant",
  "serial",
  "rack",
  "bin",
  "note",
  "date",
];
const ADDED_COLS: MachineComponentCol[] = ["component", "variant", "serial"];
const SINGLE_COLS: MachineComponentCol[] = ["component", "serial"];

function colsFor(
  active: MachineComponentsTab,
  singleKind: MachineComponentKind | undefined,
): MachineComponentCol[] {
  if (singleKind) return SINGLE_COLS; // the compact draft list stays lean
  return active === "removed" || active === "returned" ? FULL_COLS : ADDED_COLS;
}

interface Args {
  materialIssueId: string;
  machineLineId: string;
  stockItemId?: string;
  singleKind?: MachineComponentKind;
}

/** Machine components view (§17). Inactive tabs run a page_size:1 query to keep their counts right. */
export function useMachineComponentsView({
  materialIssueId,
  machineLineId,
  stockItemId,
  singleKind,
}: Args) {
  const [active, setActive] = useState<MachineComponentsTab>(
    singleKind ?? "added",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(
    search.trim().slice(0, SEARCH_MAX),
    UI.DEBOUNCE_SEARCH_MS,
  );

  const paramsFor = (kind: MachineComponentKind): MachineComponentsQuery => {
    const isActive = kind === active;
    return {
      miId: materialIssueId,
      machineLineId,
      kind,
      q: isActive ? debouncedSearch || undefined : undefined,
      page: isActive ? page : 1,
      page_size: isActive ? MACHINE_COMPONENTS_PAGE_SIZE : 1,
    };
  };
  const enabledFor = (kind: MachineComponentKind) => ({
    enabled: !singleKind || singleKind === kind,
  });
  const queries = {
    added: useMachineComponents(paramsFor("added"), enabledFor("added")),
    removed: useMachineComponents(paramsFor("removed"), enabledFor("removed")),
    returned: useMachineComponents(
      paramsFor("returned"),
      enabledFor("returned"),
    ),
  };

  // Outward QC checklist for this unit — a tab beside Returned, only when a
  // completed outward QC exists. Inspection / inward-QC runs are filtered out.
  const checklistQuery = useDeviceChecklistRuns(
    stockItemId ?? "",
    !!stockItemId && !singleKind,
  );
  const outwardRuns = (checklistQuery.data ?? []).filter(
    (r) => r.operation_type === "outward_qc" && !!r.finished_at,
  );
  const isQcTab = active === "outward_qc";
  const activeQuery = isQcTab ? null : queries[active];
  const total = activeQuery?.data?.total ?? 0;

  const cols = colsFor(active, singleKind);

  const resetSearch = (value = "") => {
    setSearch(value);
    setPage(1);
  };

  return {
    active,
    goTab: (tab: MachineComponentsTab) => {
      setActive(tab);
      resetSearch();
    },
    countFor: (kind: MachineComponentKind) => queries[kind].data?.total ?? 0,
    outwardRuns,
    qcTabVisible: !singleKind && outwardRuns.length > 0,
    isQcTab,
    search,
    setSearch: resetSearch,
    debouncedSearch,
    isLoading: !!activeQuery?.isLoading,
    rows: activeQuery?.data?.items ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / MACHINE_COMPONENTS_PAGE_SIZE)),
    page,
    setPage,
    cols,
  };
}
