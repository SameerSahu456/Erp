import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import {
  FIRST_PAGE,
  type PageParams,
  type PageResponse,
} from "@/shared/api/pagination";
import { PAGINATION } from "@/shared/constants";

// ─── Meetings ────────────────────────────────────────────────────────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/meeting.py`
// and the routes in `app/modules/crm/api/v1/endpoints.py` (lines 2366–2513).
//
// Backend visibility: admins see all; managers see their reporting subtree;
// others see meetings they're assigned-to OR created. Enforced server-side —
// the FE sends no scope param.
//
// Backend rules enforced server-side:
//   • MeetingCreate validates `end_time > start_time` (422 otherwise)
//   • PATCH accepts `status` only as "Scheduled"; terminal moves go through
//     the dedicated /complete and /cancel endpoints
//
// `description` is sent on the wire and read back optimistically. The backend
// `MeetingCreate` / `MeetingResponse` do not declare it yet (Pydantic v2
// `extra="ignore"` drops it silently) — when the backend adds the column the
// FE persists it without a re-deploy. Same forward-compat pattern as the
// `status`-on-`TaskCreate` field above.

export type MeetingType =
  "Video Call" | "Phone Call" | "In Person" | "Site Visit";
export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled";

export interface MeetingWire {
  id: string;
  title: string;
  description: string | null;
  meeting_type: MeetingType;
  meeting_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  location: string | null;
  status: MeetingStatus;
  assigned_to: string | null;
  assignee_name: string | null;
  created_by: string | null;
  creator_name: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingsListResponse = PageResponse<MeetingWire>;

// GET /crm/meetings/summary — KPI buckets for the Meetings stats row.
export interface MeetingSummaryWire {
  scheduled: number;
  completed: number;
  cancelled: number;
  this_week: number;
  total: number;
}

// GET /crm/meetings — backend ANDs filters; `status` / `meeting_type` are
// repeatable (values OR within each list).
export interface FetchMeetingsParams extends PageParams {
  search?: string;
  status?: MeetingStatus[];
  meeting_type?: MeetingType[];
  assigned_to?: string;
  created_by?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
}

export interface MeetingCreatePayload {
  title: string;
  // See section header — silently ignored by the backend until the column
  // is added; sent intentionally for forward-compat.
  description?: string | null;
  meeting_type: MeetingType;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  assigned_to?: string | null;
}

export interface MeetingUpdatePayload {
  title?: string;
  description?: string | null;
  meeting_type?: MeetingType;
  meeting_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string | null;
  // Terminal moves go through /complete and /cancel — PATCH only takes "Scheduled".
  status?: "Scheduled";
  assigned_to?: string | null;
}

// GET /api/v1/crm/meetings — paginated + filtered global list. Drives
// `MeetingsPage.tsx`. Returns the typed `{items,total,limit,offset}` envelope
// (§16.11 — never typed `Meeting[]`).
export async function fetchMeetings(
  params: FetchMeetingsParams = {},
): Promise<MeetingsListResponse> {
  return apiClient.get<MeetingsListResponse>(endpoints.crm.meetings, {
    params: {
      search: params.search?.trim() || undefined,
      status:
        params.status && params.status.length > 0 ? params.status : undefined,
      meeting_type:
        params.meeting_type && params.meeting_type.length > 0
          ? params.meeting_type
          : undefined,
      assigned_to: params.assigned_to || undefined,
      created_by: params.created_by || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      page: params.page ?? FIRST_PAGE,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  });
}

// GET /api/v1/crm/meetings/summary — every KPI bucket in one call (replaces
// the old four status-filtered count queries).
export async function fetchMeetingsSummary(): Promise<MeetingSummaryWire> {
  return apiClient.get<MeetingSummaryWire>(endpoints.crm.meetingsSummary);
}

export async function createMeeting(
  body: MeetingCreatePayload,
): Promise<MeetingWire> {
  return apiClient.post<MeetingWire>(endpoints.crm.meetings, body);
}

export async function updateMeeting(
  id: string,
  body: MeetingUpdatePayload,
): Promise<MeetingWire> {
  return apiClient.patch<MeetingWire>(endpoints.crm.meeting(id), body);
}

export async function completeMeeting(id: string): Promise<MeetingWire> {
  return apiClient.post<MeetingWire>(endpoints.crm.meetingComplete(id));
}

export async function cancelMeeting(id: string): Promise<MeetingWire> {
  return apiClient.post<MeetingWire>(endpoints.crm.meetingCancel(id));
}
