// Public surface of the attachments module. Every cross-module import must
// come through this file (Coding-guideline §3, §6.7). Internal callers in
// modules/attachments/* may import siblings directly.

export type { AttachmentWire, EntityType } from "./types"
export {
  fetchAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachmentBlob,
  viewAttachmentBlob,
  fetchAttachmentBlob,
  type FetchAttachmentsParams,
  type UploadAttachmentArgs,
} from "./api"
export {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  triggerAttachmentDownload,
  attachmentsListKey,
} from "./hooks/useAttachments"
export { FilePreviewDialog, type FilePreviewTarget } from "./FilePreviewDialog"
