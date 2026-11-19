// `http` is used directly for the multipart upload (axios-specific
// options); the rest go through the typed apiClient wrapper.
import { apiClient, http } from "./client";
import type { PageResponse } from "@/shared/api/pagination";

// Polymorphic attachments — backend endpoint serves every entity type
// (currently `ims_part`, `ims_part_variant`, `crm_account`). See
// app/shared/constants/attachment_entities.py + attachment_policy.py
// for the authoritative entity-type list and per-type rules (allowed
// MIMEs, max bytes, max count).
//
// Path is hardcoded (instead of going through `endpoints.attachments`)
// so a stale deployed bundle that's missing the `attachments` key in
// the central endpoints object can't silently produce a `/undefined`
// URL at runtime — every consumer here joins to a known good string.
const ATTACHMENTS_PATH = "/api/v1/attachments";
const attachmentDetail = (id: string) => `${ATTACHMENTS_PATH}/${id}`;

export type AttachmentEntityType =
  | "ims_part"
  | "ims_part_variant"
  | "crm_account"
  | "crm_sales_order"
  // Stock adjustment: the import spreadsheet + a signed audit sheet.
  | "ims_stock_adjustment";

export interface Attachment {
  id: string;
  document_name: string;
  document_type: string;
  // Free-text name for `document_type` when it's a user-named slot (the SO
  // `others` type). NULL for fixed slots and for every other entity type.
  document_label: string | null;
  content_type: string;
  size_bytes: number;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  uploaded_by: string;
  created_at: string;
  url: string;
  preview_url: string;
  download_url: string;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function fetchAttachments(params: {
  entity_type: AttachmentEntityType;
  entity_id: string;
  page?: number;
  page_size?: number;
}): Promise<Attachment[]> {
  const qs = new URLSearchParams();
  qs.set("entity_type", params.entity_type);
  qs.set("entity_id", params.entity_id);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  // The standard page; callers want an entity's documents, so return the items.
  const page = await apiClient.get<PageResponse<Attachment>>(
    `${ATTACHMENTS_PATH}?${qs.toString()}`,
  );
  return page.items;
}

// ─── Upload (multipart) ──────────────────────────────────────────────────────
//
// Backend expects:
//   POST /attachments?document_type=&entity_type=&entity_id=&parent_id=
//   body: multipart/form-data with a single `file` field
//
// Axios auto-detects multipart when given FormData; clearing the default
// `Content-Type: application/json` is required so the browser sets the
// correct boundary.

export interface UploadAttachmentParams {
  file: File;
  entity_type: AttachmentEntityType;
  entity_id: string;
  document_type: string;
  // Names the document when `document_type` is a free-text slot. Required by
  // the backend when uploading a `crm_sales_order` attachment of type
  // `others`; ignored elsewhere.
  document_label?: string;
  parent_id?: string;
}

export async function uploadAttachment(
  params: UploadAttachmentParams,
): Promise<Attachment> {
  const form = new FormData();
  form.append("file", params.file);
  // Going through `http` directly (not the apiClient wrapper) because we
  // need axios-specific options (`params` for query string,
  // per-request header override). The response interceptor still
  // unwraps the ApiResponse envelope, so `response.data` is the
  // Attachment payload.
  const response = await http.post<Attachment>(
    ATTACHMENTS_PATH,
    form,
    {
      params: {
        document_type: params.document_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        ...(params.document_label
          ? { document_label: params.document_label }
          : {}),
        ...(params.parent_id ? { parent_id: params.parent_id } : {}),
      },
      // Drop the JSON content-type so axios + the browser pick the
      // correct multipart boundary header automatically.
      headers: { "Content-Type": undefined as unknown as string },
    },
  );
  return response.data;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAttachment(id: string): Promise<void> {
  await apiClient.delete<void>(attachmentDetail(id));
}
