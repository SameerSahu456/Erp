import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { FIRST_PAGE, nextPage } from "@/shared/api/pagination";
import { toast } from "sonner";

import { PAGINATION } from "@/shared/constants";

import {
  cancelTask,
  completeTask,
  createTask,
  deleteTask,
  fetchTasks,
  fetchTasksSummary,
  updateTask,
} from "../../api";
import type {
  FetchTasksParams,
  TaskCreatePayload,
  TaskEntityType,
  TaskUpdatePayload,
} from "../../api";
import { TASKS_STRINGS } from "../../components/tasks/tasks.strings";
import { invalidateEntityStats } from "../shared/entityStats";

// Cache layout (Coding-guideline §16.8 — bucket key is part of the query key):
//
//   ["crm","tasks"]                                  ← KEY prefix
//   ["crm","tasks","detail", id]                     ← single task
//   ["crm","tasks","summary"]                        ← /tasks/summary
//   ["crm","tasks","index", params]                  ← global list (TasksPage)
//   ["crm","tasks","by-entity", type, id]            ← lead/deal scoped
//   ["crm","tasks","by-entity", type, id, {status}]  ← + status bucket
//
// Mutations invalidate every level that could be affected:
//   • create / update / complete / cancel / delete
//       → "summary" + "index" + "by-entity" (any) + "detail" (the one row)
//
// Status taxonomy after backend migration `crm_tasks_index_01`:
//   'todo' | 'in_progress' | 'completed' | 'cancelled'
// Plus a server-derived `is_overdue` boolean (orthogonal to status).
const KEY = ["crm", "tasks"] as const;
const SUMMARY_KEY = [...KEY, "summary"] as const;
const INDEX_KEY = [...KEY, "index"] as const;

// One spot to fire all task-related cache invalidations after a write. The
// summary endpoint always changes; both the global index and any entity
// bucket may change. A list-level invalidation (`predicate` against the
// KEY prefix) covers infinite + plain variants without us having to know
// the exact filter combo that's open.
function invalidateAllTaskCaches(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  void qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey;
      if (k[0] !== "crm" || k[1] !== "tasks") return false;
      const marker = k[2];
      return marker === "index" || marker === "by-entity";
    },
  });
}

// staleTime / refetchOnMount inherited from global QueryClient defaults
// (§6.5.1 — never set them per-hook).

// ── Global list (TasksPage) ─────────────────────────────────────────────
//
// Drives /crm/tasks. Infinite query, page size from the global pagination
// constant (Coding-guideline §16.6/§16.7). `params` is part of the query
// key — changing any filter spawns a fresh cache entry and resets to the
// first page.
export function useTasks(
  params: Omit<FetchTasksParams, "page" | "page_size"> = {},
  options: { pageSize?: number; enabled?: boolean } = {},
) {
  const pageSize = options.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: [...INDEX_KEY, { ...params, pageSize }] as const,
    queryFn: ({ pageParam }) =>
      fetchTasks({ ...params, page: pageParam, page_size: pageSize }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    enabled: options.enabled ?? true,
  });
}

// ── Global list, page-numbered (TasksPage) ──────────────────────────────
//
// Same backend endpoint as `useTasks`, but exposes a plain `useQuery` with
// a 1-indexed `page` param — pairs with a numbered Prev/Next footer per
// the canonical Leads list pattern (Coding-guideline §16.10). Use this
// when you want a discrete page indicator; use `useTasks` for the
// embedded card section where infinite scroll is more natural.
export function useTasksPaged(
  params: Omit<FetchTasksParams, "page_size"> = {},
  options: { pageSize?: number; enabled?: boolean } = {},
) {
  const pageSize = options.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const page = params.page ?? 1;
  const { page: _ignored, ...rest } = params;
  void _ignored;
  return useQuery({
    queryKey: [...INDEX_KEY, "paged", { ...rest, page, pageSize }] as const,
    queryFn: () => fetchTasks({ ...rest, page, page_size: pageSize }),
    enabled: options.enabled ?? true,
  });
}

// ── Summary cards (TasksPage stats row) ─────────────────────────────────
//
// Five buckets: todo, in_progress, completed, cancelled, overdue. Honors
// the viewer's RBAC scope (BDE/admin visibility) — same auth gate as the
// list endpoint.
export function useTasksSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => fetchTasksSummary(),
    enabled: options.enabled ?? true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────
//
// Two shapes:
//   • useCreateTask(entityType, entityId)  → scoped (lead/deal detail page)
//   • useCreateTaskGlobal()                → unscoped (TasksPage form, where
//                                            the user picks entity in the dialog
//                                            or leaves it standalone)

export function useCreateTask(entityType: TaskEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<TaskCreatePayload, "entity_type" | "entity_id">) =>
      createTask({ ...body, entity_type: entityType, entity_id: entityId }),
    onSuccess: () => {
      invalidateAllTaskCaches(qc);
      invalidateEntityStats(qc, { type: entityType, id: entityId });
      toast.success(TASKS_STRINGS.toast.created);
    },
    onError: (error: Error) => {
      toast.error(error.message || TASKS_STRINGS.toast.createFailed);
    },
  });
}

export function useCreateTaskGlobal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskCreatePayload) => createTask(body),
    onSuccess: () => {
      invalidateAllTaskCaches(qc);
      // The global form can attach the task to a lead/deal; the parent isn't
      // in scope here, so refresh whichever entity-stats query is cached.
      invalidateEntityStats(qc);
      toast.success(TASKS_STRINGS.toast.created);
    },
    onError: (error: Error) => {
      toast.error(error.message || TASKS_STRINGS.toast.createFailed);
    },
  });
}

export function useUpdateTask(entityType?: TaskEntityType, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: string;
      body: TaskUpdatePayload;
    }) => updateTask(taskId, body),
    onSuccess: (_data, { taskId }) => {
      invalidateAllTaskCaches(qc);
      void qc.invalidateQueries({ queryKey: [...KEY, "detail", taskId] });
      // Param signature kept for callers that still pass entity context;
      // values aren't otherwise required (global invalidator covers them).
      void entityType;
      void entityId;
      toast.success(TASKS_STRINGS.toast.updated);
    },
    onError: (error: Error) => {
      // Backend surfaces "Cannot update a completed/cancelled task" (and any
      // 4xx detail) as Error.message via apiClient.
      toast.error(error.message || TASKS_STRINGS.toast.updateFailed);
    },
  });
}

export function useCompleteTask(
  entityType?: TaskEntityType,
  entityId?: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onSuccess: () => {
      invalidateAllTaskCaches(qc);
      void entityType;
      void entityId;
      toast.success(TASKS_STRINGS.toast.completed);
    },
    onError: (error: Error) => {
      toast.error(error.message || TASKS_STRINGS.toast.completeFailed);
    },
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => cancelTask(taskId),
    onSuccess: () => {
      invalidateAllTaskCaches(qc);
      toast.success(TASKS_STRINGS.toast.cancelled);
    },
    onError: (error: Error) => {
      toast.error(error.message || TASKS_STRINGS.toast.cancelFailed);
    },
  });
}

export function useDeleteTask(entityType?: TaskEntityType, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      invalidateAllTaskCaches(qc);
      invalidateEntityStats(
        qc,
        entityType ? { type: entityType, id: entityId } : undefined,
      );
      toast.success(TASKS_STRINGS.toast.deleted);
    },
    onError: (error: Error) => {
      toast.error(error.message || TASKS_STRINGS.toast.deleteFailed);
    },
  });
}
