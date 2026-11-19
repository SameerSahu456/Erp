import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { wmsKeys } from "../keys";
import { toast } from "sonner";

import { API } from "@/shared/constants";

import {
  createWarehouseAssignment,
  fetchWarehouseAssignmentsPage,
  fetchWarehouseTeam,
  removeWarehouseAssignment,
  updateWarehouseAssignment,
  type WarehouseAssignmentsPageParams,
  type WarehouseAssignmentCreate,
  type WarehouseAssignmentListItem,
  type WarehouseAssignmentUpdate,
} from "../../api";

import { USE_WAREHOUSE_TEAM_STRINGS } from "./use-warehouse-team.strings";

/** Cache key for one warehouse's team. Exported because the stage-assignment
 *  pools (`useAssignPoolsByWarehouse`) derive from the same roster — sharing
 *  the key means a page that loads a team and a page that builds pools from it
 *  hit one cache entry, not two. */
export const warehouseTeamKey = (warehouseId: string) => wmsKeys.warehouses.team(warehouseId);

const EK = wmsKeys.engineers;

/** A team write changes that warehouse's roster AND every engineer picker
 *  built from rosters (filters, the issue wizard's engineer list). */
function invalidateTeam(qc: ReturnType<typeof useQueryClient>, warehouseId: string) {
  void qc.invalidateQueries({ queryKey: warehouseTeamKey(warehouseId) });
  void qc.invalidateQueries({ queryKey: EK.optionsAll() });
  void qc.invalidateQueries({ queryKey: wmsKeys.workAssignments.eligible("engineers") });
}

const teamKey = warehouseTeamKey;

/** Active team assigned to a warehouse.
 *
 *  Reference data — a roster changes when someone joins or leaves a team, not
 *  per transaction — so it opts out of the global staleTime:0 +
 *  refetchOnMount:"always" policy per Coding-guideline §6.5.1. Without this,
 *  every worklist mount, filter change, and window focus refetched it. */
export function useWarehouseTeam(warehouseId: string | undefined) {
  return useQuery<WarehouseAssignmentListItem[]>({
    queryKey: teamKey(warehouseId ?? ""),
    queryFn: () => fetchWarehouseTeam(warehouseId as string),
    enabled: Boolean(warehouseId),
    ...API.REFERENCE_DATA_QUERY_OPTIONS,
  });
}

/** One page of the warehouse's Team table. Unlike the roster above this is a
 *  list a person searches and sorts, so it follows the global freshness rules;
 *  its key nests under the roster's, so every team write refreshes it too. */
export function useWarehouseTeamPage(warehouseId: string, params: WarehouseAssignmentsPageParams) {
  return useQuery({
    queryKey: wmsKeys.warehouses.teamPage(warehouseId, params),
    queryFn: () => fetchWarehouseAssignmentsPage(warehouseId, params),
    enabled: !!warehouseId,
    placeholderData: keepPreviousData,
  });
}

// Re-exported so existing importers keep working.
export {
  useAssignableUserOptions,
  useEngineersAcrossWarehousesOptions,
  type AssignableUserOption,
} from "./useEngineerPickerOptions";

/** Add a member to a warehouse team. */
export function useCreateWarehouseAssignment(warehouseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarehouseAssignmentCreate) =>
      createWarehouseAssignment(warehouseId, body),
    onSuccess: () => {
      invalidateTeam(qc, warehouseId);
      toast.success(USE_WAREHOUSE_TEAM_STRINGS.toasts.memberAdded);
    },
    // Field-validation 422s are shown inline on the form; everything else
    // toasts via the shared mapper.
    onError: notifyMutationError,
  });
}

/** Update an existing assignment (level / capabilities / notes). */
export function useUpdateWarehouseAssignment(warehouseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: WarehouseAssignmentUpdate;
    }) => updateWarehouseAssignment(warehouseId, userId, body),
    onSuccess: () => {
      invalidateTeam(qc, warehouseId);
      toast.success(USE_WAREHOUSE_TEAM_STRINGS.toasts.assignmentUpdated);
    },
    onError: notifyMutationError,
  });
}

/** Remove a member from a warehouse team (reason mandatory). */
export function useRemoveWarehouseAssignment(warehouseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      removeWarehouseAssignment(warehouseId, userId, reason),
    onSuccess: () => {
      invalidateTeam(qc, warehouseId);
      toast.success(USE_WAREHOUSE_TEAM_STRINGS.toasts.memberRemoved);
    },
    onError: notifyMutationError,
  });
}
