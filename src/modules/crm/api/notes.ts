import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import {
  FIRST_PAGE,
  type PageParams,
  type PageResponse,
} from "@/shared/api/pagination";

// ─── Notes (polymorphic — leads / deals / accounts / contacts) ──────────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/note.py`.
// Verified against live OpenAPI on 2026-05-07. Backend rules enforced
// elsewhere (only-author edits, edit window, mention extraction); the
// frontend just sends `{ content }` and renders what comes back.

export type NoteEntityType = "lead" | "deal" | "account" | "contact";

export interface CrmNoteWire {
  id: string;
  entity_type: NoteEntityType;
  entity_id: string;
  content: string;
  mentions: string[]; // server-extracted from `@<uuid>` tokens; never user-supplied on POST/PATCH
  created_by_id: string | null; // null for system-generated notes
  created_at: string;
  updated_at: string;
}

export type FetchNotesParams = PageParams; // page_size: backend 1..200, default 50

// The standard page (newest-first). Drives numbered pagination on the
// detail-page Notes tab.
export type CrmNoteListResponse = PageResponse<CrmNoteWire>;

export interface NoteCreatePayload {
  content: string;
}
export interface NoteUpdatePayload {
  content: string;
}

// GET /api/v1/crm/{entity_type}/{entity_id}/notes
// Returns the standard page (newest-first); `total` powers the
// "showing X–Y of Z" footer.
export async function fetchEntityNotes(
  entityType: NoteEntityType,
  entityId: string,
  params: FetchNotesParams = {},
): Promise<CrmNoteListResponse> {
  return apiClient.get<CrmNoteListResponse>(
    endpoints.crm.entityNotes(entityType, entityId),
    {
      params: {
        page: params.page ?? FIRST_PAGE,
        page_size: params.page_size ?? 50,
      },
    },
  );
}

export async function createEntityNote(
  entityType: NoteEntityType,
  entityId: string,
  body: NoteCreatePayload,
): Promise<CrmNoteWire> {
  return apiClient.post<CrmNoteWire>(
    endpoints.crm.entityNotes(entityType, entityId),
    body,
  );
}

export async function updateNote(
  noteId: string,
  body: NoteUpdatePayload,
): Promise<CrmNoteWire> {
  return apiClient.patch<CrmNoteWire>(endpoints.crm.note(noteId), body);
}

export async function deleteNote(noteId: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.note(noteId));
}
