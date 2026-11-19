import { apiClient, http } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { withInferredMime } from "@shared/lib/file-mime"

import type { AttachmentWire, EntityType } from "./types"
import { saveBlob } from "@/shared/lib/saveBlob"
import type { PageParams, PageResponse } from "@/shared/api/pagination"

export interface FetchAttachmentsParams {
  entity_type: EntityType
  entity_id: string
}

// GET /api/v1/attachments — the standard page (page / page_size; default 50,
// max 200). Callers want an entity's documents, so this returns the first
// page's items.
export async function fetchAttachments(
  params: FetchAttachmentsParams & PageParams,
): Promise<AttachmentWire[]> {
  const page = await apiClient.get<PageResponse<AttachmentWire>>(endpoints.attachments.root, {
    params: { ...params },
  })
  return page.items
}

export interface UploadAttachmentArgs {
  file: File
  document_type: string
  entity_type: EntityType
  entity_id: string
  parent_id?: string
  /**
   * Client-only: when true, `useUploadAttachment` suppresses its per-file
   * "File uploaded" toast so a caller uploading several files in a loop can
   * show a single summary toast instead (PAGE-UI §0.13). NOT sent to the API —
   * `uploadAttachment` reads only the classifier fields above.
   */
  silent?: boolean
}

// POST /api/v1/attachments — multipart body is just the file; the four
// classifier fields (document_type/entity_type/entity_id/parent_id) travel
// as query params per the router signature. We bypass apiClient.post and
// use the `http` axios instance directly so the default JSON Content-Type
// doesn't leak onto the multipart request (the response interceptor still
// fires because it's bound to the instance).
export async function uploadAttachment(
  args: UploadAttachmentArgs,
): Promise<AttachmentWire> {
  const form = new FormData()
  // See withInferredMime — guards the empty `file.type` edge case so the
  // multipart part doesn't fall back to `application/octet-stream` and hit
  // the backend's CRM_ACCOUNT / IMS attachment MIME allow-lists.
  form.append("file", withInferredMime(args.file), args.file.name)
  const response = await http.post<AttachmentWire>(
    endpoints.attachments.root,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      params: {
        document_type: args.document_type,
        entity_type: args.entity_type,
        entity_id: args.entity_id,
        ...(args.parent_id ? { parent_id: args.parent_id } : {}),
      },
    },
  )
  return response.data
}

// DELETE /api/v1/attachments/{id} — uploader-only by default; superusers
// bypass. Server returns 204 with no body.
export async function deleteAttachment(id: string): Promise<void> {
  return apiClient.delete<void>(endpoints.attachments.attachment(id))
}

/**
 * Fetch the file as an authenticated blob with its declared content-type.
 * Works for both S3 (presigned) and local-disk (auth-proxied) storage —
 * the `/download` endpoint accepts the JWT, so the browser doesn't need to
 * carry it on a raw `<img src>` / `<iframe src>`. Use this to build object
 * URLs for inline preview (PDF in iframe, images in <img>) or as the
 * fetch step inside `downloadAttachmentBlob`.
 */
export async function fetchAttachmentBlob(
  attachment: Pick<AttachmentWire, "id" | "content_type">,
): Promise<Blob> {
  const response = await http.get<Blob>(
    endpoints.attachments.download(attachment.id),
    { responseType: "blob" },
  )
  return new Blob([response.data], { type: attachment.content_type })
}

/**
 * Force the browser to save the file by fetching it via the auth-proxied
 * `/download` endpoint as a blob and triggering an anchor click. Use this
 * on local-disk storage (where `<a href={download_url}>` won't carry the
 * JWT) or as a universal fallback. On S3 with a `download_url` already
 * carrying `Content-Disposition`, you can use `window.open(download_url)`
 * directly instead — but this helper works everywhere.
 */
export async function downloadAttachmentBlob(
  attachment: Pick<AttachmentWire, "id" | "document_name" | "content_type">,
): Promise<void> {
  const blob = await fetchAttachmentBlob(attachment)
  saveBlob(blob, attachment.document_name)
}

/**
 * Open the file inline in a new browser tab (PDF / image preview) instead of
 * saving it. Fetches via the same auth-proxied `/download` endpoint as
 * `downloadAttachmentBlob`, then opens the resulting object URL. The URL is
 * revoked after a delay long enough for the new tab to load it.
 */
export async function viewAttachmentBlob(
  attachment: Pick<AttachmentWire, "id" | "content_type">,
): Promise<void> {
  const blob = await fetchAttachmentBlob(attachment)
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  // Keep the URL alive long enough for the new tab to fetch it, then release.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
