import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import {
  FIRST_PAGE,
  type PageParams,
  type PageResponse,
} from "@/shared/api/pagination";

import type { NoteEntityType } from "./notes";

// ─── Comments (polymorphic — leads / deals / accounts / contacts) ───────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/comment.py`.
// Comments are IMMUTABLE — no PATCH endpoint, no `updated_at`. Delete is
// author-or-superuser only (backend enforces; frontend hides the affordance
// when the viewer doesn't qualify).

// Notes are restricted to lead/deal/account/contact, but the comments
// route doesn't validate `entity_type` server-side and the FE already
// uses comments on Material Inquiries. Include that variant so existing
// callers keep type-checking; the wire format is identical.
export type CommentEntityType = NoteEntityType | "material_inquiry";

export interface CrmCommentWire {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  mentions: string[]; // server-extracted `@[Name](uuid)` UUIDs; never user-supplied on POST
  created_by_id: string | null; // null when the author was hard-deleted (FK ON DELETE SET NULL)
  created_at: string;
}

export type FetchCommentsParams = PageParams; // page_size: backend 1..200, default 50

// The standard page (newest-first). Drives numbered pagination on the
// detail-page Comments tab.
export type CrmCommentListResponse = PageResponse<CrmCommentWire>;

export interface CommentCreatePayload {
  content: string;
}

// GET /api/v1/crm/{entity_type}/{entity_id}/comments
// Returns the standard page (newest-first); `total` powers the
// "showing X–Y of Z" footer.
export async function fetchEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  params: FetchCommentsParams = {},
): Promise<CrmCommentListResponse> {
  return apiClient.get<CrmCommentListResponse>(
    endpoints.crm.entityComments(entityType, entityId),
    {
      params: {
        page: params.page ?? FIRST_PAGE,
        page_size: params.page_size ?? 50,
      },
    },
  );
}

export async function createEntityComment(
  entityType: CommentEntityType,
  entityId: string,
  body: CommentCreatePayload,
): Promise<CrmCommentWire> {
  return apiClient.post<CrmCommentWire>(
    endpoints.crm.entityComments(entityType, entityId),
    body,
  );
}

export async function deleteComment(commentId: string): Promise<void> {
  return apiClient.delete<void>(endpoints.crm.comment(commentId));
}
