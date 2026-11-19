import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchIssuedLines,
  fetchMachineComponents,
  fetchMaterialIssue,
  fetchMaterialIssueDemand,
  fetchMaterialIssuePullOuts,
  fetchMaterialIssuesPage,
  type IssuedLinesParams,
  type MachineComponentsQuery,
  type MaterialIssueListParams,
  type WiredIssueType,
} from "../../api";

import { wmsKeys } from "../keys";

const K = wmsKeys.materialIssues;

export function useMaterialIssues(
  params: MaterialIssueListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchMaterialIssuesPage(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useMaterialIssue(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.detail(id ?? ""),
    queryFn: () => fetchMaterialIssue(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

// Parts pulled out of this MI's units (D26) — the detail page trace-back panel.
export function useMaterialIssuePullOuts(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.pullOuts(id ?? ""),
    queryFn: () => fetchMaterialIssuePullOuts(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

// One machine's components tab (added / removed / returned) — server-paginated
// + searchable. `keepPreviousData` keeps the table steady while paging/typing.
export function useMachineComponents(
  params: MachineComponentsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: K.components(params.miId, params),
    queryFn: () => fetchMachineComponents(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

// How much has already gone out against a demand document's lines (across all
// prior issued MIs) — powers the Ordered / Issued / Pending display so a
// partially-fulfilled line only offers its remaining quantity.
export function useIssuedLines(
  params: Partial<IssuedLinesParams>,
  options?: { enabled?: boolean },
) {
  const ready = !!params.source_entity_type && !!params.source_entity_id;
  return useQuery({
    queryKey: K.issuedLines(params),
    queryFn: () => fetchIssuedLines(params as IssuedLinesParams),
    enabled: ready && (options?.enabled ?? true),
  });
}

// The issuable demand lines of a New-Issue source doc, resolved by the WMS
// backend via its gate-free CRM lookup adapters — so every outward role (MIS /
// store manager / warehouse manager) loads them with an outward-read perm,
// instead of the form fetching the CRM sales-order / demo / replacement detail
// (which only the warehouse manager's crm:so_read/crm:dr_read could read).
export function useMaterialIssueDemandLines(
  issueType: WiredIssueType,
  sourceEntityId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const params = { issue_type: issueType, source_entity_id: sourceEntityId ?? "" };
  return useQuery({
    queryKey: K.demand(params),
    queryFn: () => fetchMaterialIssueDemand(params),
    enabled: !!sourceEntityId && (options?.enabled ?? true),
  });
}
