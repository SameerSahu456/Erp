import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { PAGINATION } from "@/shared/constants";

import { MEETINGS_STRINGS } from "../../components/meetings/meetings.strings";
import {
  cancelMeeting,
  completeMeeting,
  createMeeting,
  fetchMeetings,
  fetchMeetingsSummary,
  updateMeeting,
} from "../../api";
import type {
  FetchMeetingsParams,
  MeetingCreatePayload,
  MeetingUpdatePayload,
} from "../../api";

// Cache layout (mirrors useTasks — Coding-guideline §16.8, bucket key is part
// of the query key):
//
//   ["crm","meetings"]                          ← KEY prefix
//   ["crm","meetings","index","paged", params]  ← global list (MeetingsPage)
//   ["crm","meetings","summary"]                ← GET /meetings/summary (stats row)
//   ["crm","meetings","detail", id]             ← single meeting
//
// Meetings has no entity-scoping — it is the same resource shape as Tasks
// but simpler.
const KEY = ["crm", "meetings"] as const;
const INDEX_KEY = [...KEY, "index"] as const;
const SUMMARY_KEY = [...KEY, "summary"] as const;

// One spot for every meeting cache invalidation after a write — covers the
// paged list, the stats counts, and any open detail row. A predicate against
// the KEY prefix catches every filter/page combo without us tracking them.
function invalidateAllMeetingCaches(qc: QueryClient) {
  void qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey;
      if (k[0] !== "crm" || k[1] !== "meetings") return false;
      const marker = k[2];
      return marker === "index" || marker === "summary" || marker === "detail";
    },
  });
}

// staleTime / refetchOnMount inherited from the global QueryClient defaults
// (§6.5.1 — never set them per-hook).

// ── Global list, page-numbered (MeetingsPage) ───────────────────────────
//
// Drives /crm/meetings. 1-indexed `page`; page size from the global
// pagination constant (§16.6/§16.7). `params` is part of the query key —
// changing any filter spawns a fresh cache entry; the page owns resetting
// to page 1 on a filter change.
export function useMeetingsPaged(
  params: Omit<FetchMeetingsParams, "page_size"> = {},
  options: { pageSize?: number; enabled?: boolean } = {},
) {
  const pageSize = options.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const page = params.page ?? 1;
  const { page: _ignored, ...rest } = params;
  void _ignored;
  return useQuery({
    queryKey: [...INDEX_KEY, "paged", { ...rest, page, pageSize }] as const,
    queryFn: () => fetchMeetings({ ...rest, page, page_size: pageSize }),
    enabled: options.enabled ?? true,
  });
}

// ── Stats-row summary (MeetingsPage KPI cards) ──────────────────────────
//
// One call to GET /crm/meetings/summary returns every KPI bucket
// (scheduled / completed / cancelled / this_week / total) — replaces the
// old four status-filtered count queries.
export function useMeetingsSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => fetchMeetingsSummary(),
    enabled: options.enabled ?? true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────
export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreatePayload) => createMeeting(body),
    onSuccess: () => {
      invalidateAllMeetingCaches(qc);
      toast.success(MEETINGS_STRINGS.toast.created);
    },
    onError: (error: Error) => {
      toast.error(error.message || MEETINGS_STRINGS.toast.createFailed);
    },
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MeetingUpdatePayload }) =>
      updateMeeting(id, body),
    onSuccess: () => {
      invalidateAllMeetingCaches(qc);
      toast.success(MEETINGS_STRINGS.toast.updated);
    },
    onError: (error: Error) => {
      toast.error(error.message || MEETINGS_STRINGS.toast.updateFailed);
    },
  });
}

export function useCompleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeMeeting(id),
    onSuccess: () => {
      invalidateAllMeetingCaches(qc);
      toast.success(MEETINGS_STRINGS.toast.completed);
    },
    onError: (error: Error) => {
      toast.error(error.message || MEETINGS_STRINGS.toast.completeFailed);
    },
  });
}

export function useCancelMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelMeeting(id),
    onSuccess: () => {
      invalidateAllMeetingCaches(qc);
      toast.success(MEETINGS_STRINGS.toast.cancelled);
    },
    onError: (error: Error) => {
      toast.error(error.message || MEETINGS_STRINGS.toast.cancelFailed);
    },
  });
}
