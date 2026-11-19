import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import {
  FIRST_PAGE,
  type PageParams,
  type PageResponse,
} from "@/shared/api/pagination";
import { PAGINATION } from "@/shared/constants";

// ─── Tasks ───────────────────────────────────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/task.py`
// and the routes in `app/modules/crm/api/v1/endpoints.py`. Verified against
// live OpenAPI on 2026-05-11 after the
// `202605110900_crm_tasks_index_priority_status` migration:
//
//   • status set expanded: 'todo' | 'in_progress' | 'completed' | 'cancelled'
//   • new `priority` field: 'Low' | 'Medium' | 'High' | 'Urgent' (default 'Medium')
//   • entity_type / entity_id now nullable → standalone tasks supported
//   • response carries `entity_name`, `is_overdue`, `assignee_name` derived
//     server-side (no client join needed for the index page)
//
// Backend rules still enforced server-side:
//   • PATCH on a terminal task (completed / cancelled) → 400
//   • POST /tasks/{id}/complete or /cancel on an already-terminal task → 400
//   • entity_type, if supplied, must be 'lead' or 'deal' (account/contact rejected)

export type TaskEntityType = "lead" | "deal";
export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface CrmTaskWire {
  id: string;
  entity_type: TaskEntityType | null;
  entity_id: string | null;
  entity_name: string | null;
  title: string;
  description: string | null;
  due_date: string | null; // ISO datetime
  status: TaskStatus;
  priority: TaskPriority;
  is_overdue: boolean;
  assigned_to: string | null;
  assignee_name: string | null;
  created_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CrmTaskListResponse = PageResponse<CrmTaskWire>;

// Global list (/crm/tasks). The backend ANDs filters and ORs values inside
// each list (e.g. status=[todo, in_progress] → status='todo' OR 'in_progress').
export interface FetchTasksParams extends PageParams {
  search?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigned_to?: string;
  entity_type?: TaskEntityType;
  entity_id?: string;
  overdue_only?: boolean;
  due_before?: string; // ISO datetime
  due_after?: string; // ISO datetime
  /** Created-date range (IST calendar days, inclusive). `YYYY-MM-DD`. Distinct
   *  from `due_before`/`due_after`, which filter the task's due date. */
  date_from?: string;
  date_to?: string;
  /** Task (due) date range (IST calendar days, inclusive). `YYYY-MM-DD`.
   *  Day-bounded variant of `due_before`/`due_after`, parallel to
   *  `date_from`/`date_to` but applied to the task's due date. */
  due_date_from?: string;
  due_date_to?: string;
}

export interface CrmTaskSummaryWire {
  todo: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface TaskCreatePayload {
  // Both nullable on the backend (standalone tasks). The form layer can still
  // require them; the wire stays permissive so backfill scripts / API
  // consumers aren't forced to fake an entity.
  entity_type?: TaskEntityType | null;
  entity_id?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  // NOTE: backend's `TaskCreate` schema currently does NOT declare `status`,
  // so today this field is silently dropped (Pydantic v2 default
  // `extra="ignore"`). It's sent on the wire intentionally — when the
  // backend extends `TaskCreate` to accept an initial status, the FE will
  // start working without a re-deploy. Restricted to non-terminal values
  // ('todo' / 'in_progress') so a new task can never be created already
  // closed.
  status?: "todo" | "in_progress";
  assigned_to?: string | null;
}

export interface TaskUpdatePayload {
  // entity_type / entity_id are frozen post-create — not in the backend's
  // TaskUpdate schema. Status flips are restricted to non-terminal targets
  // ('todo' / 'in_progress'); use the dedicated POST endpoints for the
  // 'completed' and 'cancelled' transitions.
  title?: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: "todo" | "in_progress";
  assigned_to?: string | null;
}

// GET /api/v1/crm/tasks — paginated + filtered global list. Drives the
// /crm/tasks index page (`TasksPage.tsx`).
export async function fetchTasks(
  params: FetchTasksParams = {},
): Promise<CrmTaskListResponse> {
  return apiClient.get<CrmTaskListResponse>(endpoints.crm.tasks, {
    params: {
      search: params.search?.trim() || undefined,
      status:
        params.status && params.status.length > 0 ? params.status : undefined,
      priority:
        params.priority && params.priority.length > 0
          ? params.priority
          : undefined,
      assigned_to: params.assigned_to || undefined,
      entity_type: params.entity_type || undefined,
      entity_id: params.entity_id || undefined,
      overdue_only: params.overdue_only ? true : undefined,
      due_before: params.due_before || undefined,
      due_after: params.due_after || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      due_date_from: params.due_date_from || undefined,
      due_date_to: params.due_date_to || undefined,
      page: params.page ?? FIRST_PAGE,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  });
}

export async function fetchTasksSummary(): Promise<CrmTaskSummaryWire> {
  return apiClient.get<CrmTaskSummaryWire>(endpoints.crm.tasksSummary);
}

// POST /api/v1/crm/tasks — entity_type + entity_id go in the BODY, not URL.
// (The /{entity_type}/{entity_id}/tasks path is owned by the GET list.)
export async function createTask(
  body: TaskCreatePayload,
): Promise<CrmTaskWire> {
  return apiClient.post<CrmTaskWire>(endpoints.crm.tasks, body);
}

export async function updateTask(
  id: string,
  body: TaskUpdatePayload,
): Promise<CrmTaskWire> {
  return apiClient.patch<CrmTaskWire>(endpoints.crm.task(id), body);
}

export async function completeTask(id: string): Promise<CrmTaskWire> {
  return apiClient.post<CrmTaskWire>(endpoints.crm.taskComplete(id));
}

export async function cancelTask(id: string): Promise<CrmTaskWire> {
  return apiClient.post<CrmTaskWire>(endpoints.crm.taskCancel(id));
}

export async function deleteTask(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.task(id));
}
