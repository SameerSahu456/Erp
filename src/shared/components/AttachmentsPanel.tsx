import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  PlayCircle,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { Attachment, AttachmentEntityType } from "@shared/api/attachments";
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "@shared/hooks/useAttachments";

// Per-entity upload limits, mirrors the backend policy at
// app/shared/policies/attachment_policy.py. Kept here so the FE can
// surface "Max 10 files / Up to 20 MB / JPG, PNG, WEBP, MP4, WebM" before
// the user burns a round-trip.
//
// Video MIME types are included for IMS so the UI accepts them today; the
// backend currently rejects videos but will start accepting them in a
// follow-up — when that lands, no FE change is needed. Until then, videos
// still flow through the same upload pipe and surface backend's 4xx error.
const POLICIES: Record<
  AttachmentEntityType,
  {
    accept: string;
    accepted: string[];
    /** Per-file size + per-batch count for images (and any non-video file). */
    maxBytes: number;
    maxCount: number;
    /** Per-file size + per-batch count for video files, when allowed. */
    video?: { maxBytes: number; maxCount: number };
    /** Combined images-plus-videos cap. When set, overrides the looser
     *  `maxCount + video.maxCount` sum so the panel honors a tighter
     *  product-level rule (e.g. "10 attachments total, of which up to
     *  5 may be videos"). Defaults to the sum when omitted. */
    totalCount?: number;
    label: string;
  }
> = {
  ims_part: {
    accept: "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime",
    accepted: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    maxBytes: 20 * 1024 * 1024,
    maxCount: 10,
    video: { maxBytes: 50 * 1024 * 1024, maxCount: 5 },
    totalCount: 10,
    label:
      "JPG/PNG/WEBP images · MP4/WebM/MOV videos · up to 10 files total (max 5 videos), 20 MB / image · 50 MB / video",
  },
  ims_part_variant: {
    accept: "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime",
    accepted: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    maxBytes: 20 * 1024 * 1024,
    maxCount: 10,
    video: { maxBytes: 50 * 1024 * 1024, maxCount: 5 },
    totalCount: 10,
    label:
      "JPG/PNG/WEBP images · MP4/WebM/MOV videos · up to 10 files total (max 5 videos), 20 MB / image · 50 MB / video",
  },
  crm_account: {
    accept: "application/pdf,image/jpeg,image/png",
    accepted: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 20 * 1024 * 1024,
    maxCount: 10,
    label: "PDF, JPG, PNG up to 20 MB · max 10 files",
  },
  // Sales-order paperwork. This panel isn't the SO surface — the SO form
  // uses its own typed line-item section (modules/crm SoAttachmentsSection,
  // whose limits live in modules/crm/constants/so-attachments.ts) — but the
  // entry is required because POLICIES is keyed by the full
  // AttachmentEntityType union. Literals are inlined rather than imported
  // from modules/crm: `shared` must not depend on a business module, which
  // is why crm_account above inlines its values too. Both mirror
  // _SO_ATTACHMENT_BUCKET in the backend's attachment_policy.py.
  crm_sales_order: {
    accept:
      "image/jpeg,image/png,image/webp,application/pdf,text/csv," +
      "application/vnd.ms-excel," +
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
      "application/msword," +
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    accepted: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 20 * 1024 * 1024,
    maxCount: 30,
    label: "PDF, images, Word, Excel or CSV up to 20 MB · max 30 files",
  },
  // Same backend bucket as crm_sales_order (_SO_ATTACHMENT_BUCKET): the
  // import spreadsheet and a scanned / signed audit sheet.
  ims_stock_adjustment: {
    accept:
      "image/jpeg,image/png,image/webp,application/pdf,text/csv," +
      "application/vnd.ms-excel," +
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
      "application/msword," +
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    accepted: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 20 * 1024 * 1024,
    maxCount: 30,
    label: "PDF, images, Word, Excel or CSV up to 20 MB · max 30 files",
  },
};

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const isVideoFile = (file: File): boolean => file.type.startsWith("video/");

// Backend `document_type` is the file's format identifier (`png`, `jpg`,
// `mp4`, `pdf`, …), not a generic category (`image`/`video`/`file`). We
// prefer the filename extension because that's what users recognise and
// the backend keys on (`jpeg` ↦ `jpg`); fall back to the MIME subtype
// when the filename is extension-less (rare but possible).
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};
function deriveDocumentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  const mapped = MIME_TO_EXT[file.type.toLowerCase()];
  if (mapped) return mapped;
  // Last-resort fallback so an unrecognised file still uploads with a
  // string the backend can accept.
  const subtype = file.type.split("/")[1];
  return subtype ?? "file";
}

// Imperative handle exposed when `mode='staged'` — parent form calls
// `commit()` from `onSubmit` AFTER Zod validation passes, so attachment
// API writes are gated on the same Save click as the rest of the form.
//
// `entityIdOverride` lets a create flow pass the freshly-created resource's
// id (we don't have one when the form first mounts). When omitted, falls
// back to the prop `entityId` — that's the edit-form path.
export interface AttachmentsPanelHandle {
  commit(entityIdOverride?: string): Promise<void>;
  hasPending(): boolean;
}

interface PendingUpload {
  // Stable local id so React keys + the dedupe / unstage paths work
  // independently of the file's mutable identity.
  id: string;
  file: File;
  previewUrl: string;
}

interface AttachmentsPanelProps {
  entityType: AttachmentEntityType;
  entityId: string;
  /** Optional override for the `document_type` field on every upload.
   *  Default behaviour derives a per-file value from its extension /
   *  MIME (e.g. `"png"`, `"jpg"`, `"webp"`, `"mp4"`, `"webm"`, `"pdf"`)
   *  — the backend expects format identifiers, not generic categories
   *  like `"image"` or `"video"`. Only pass this when a surface needs
   *  a single fixed category for every upload. */
  documentType?: string;
  /** Render in read-only mode — used on detail pages where attachment
   *  management is owned by the form. */
  readOnly?: boolean;
  /** Operating mode:
   *  - `live` (default): uploads / deletes hit the API immediately. Used
   *    on detail-page sidebars and other surfaces where the user
   *    expects instant persistence.
   *  - `staged`: uploads / deletes are local-only and only persisted via
   *    the imperative handle's `commit()`. Pairs with a parent form's
   *    Save button so attachment writes happen alongside the resource
   *    update — and only after Zod validation passes. */
  mode?: "live" | "staged";
  /** Fires whenever the staged-pending state flips. Lets the parent
   *  form OR its leave-prompt detect pending attachment changes even
   *  when no form fields are dirty. */
  onPendingChange?: (hasPending: boolean) => void;
  /** Optional section heading rendered inside the panel. Set this from
   *  surfaces that want the Upload-media button anchored at the top-right
   *  of the section (the button shares a row with the heading), instead
   *  of having the heading owned by the parent and the button drift
   *  below it. Detail-page Overview Media uses this. */
  title?: string;
  className?: string;
}

let nextPendingId = 0;
const genPendingId = () => `pending-${Date.now()}-${nextPendingId++}`;

function AttachmentsPanelInner(
  {
    entityType,
    entityId,
    documentType,
    readOnly = false,
    mode = "live",
    onPendingChange,
    title,
    className,
  }: AttachmentsPanelProps,
  ref: React.Ref<AttachmentsPanelHandle>,
) {
  const policy = POLICIES[entityType];
  const inputRef = useRef<HTMLInputElement>(null);

  // Live-mode deletion confirm dialog state.
  const [pendingDelete, setPendingDelete] = useState<Attachment | null>(null);

  // Drag-over highlight for the dropzone.
  const [isDragOver, setIsDragOver] = useState(false);

  // Full-screen viewer state — clicking a tile opens the image / video at
  // full size in a centered dialog instead of triggering a download.
  // Pending tiles use their local blob URL; server tiles use the full URL.
  type ViewerSource = {
    src: string;
    name: string;
    isVideo: boolean;
    downloadUrl?: string;
  };
  const [viewer, setViewer] = useState<ViewerSource | null>(null);

  // Staged-mode buffer for not-yet-uploaded files. Server-side deletes
  // are no longer staged — per product, the × cross on a server tile
  // opens a confirm dialog and deletes immediately (see `pendingDelete`
  // above + the `AlertDialog` near the bottom of the panel). The old
  // stage-with-undo flow is gone in both modes.
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const query = useAttachments(entityType, entityId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment(entityType, entityId);

  const serverItems = query.data ?? [];

  // Revoke object URLs we own when the panel unmounts or pending files
  // get flushed/unstaged. Otherwise large image previews leak into memory.
  const ownedUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const owned = ownedUrls.current;
    return () => {
      owned.forEach((u) => URL.revokeObjectURL(u));
      owned.clear();
    };
  }, []);

  // Effective on-screen count = server-stored files + not-yet-uploaded
  // staged files. Server-side deletes are immediate now, so they're
  // already gone from `serverItems` by the time this re-renders.
  const effectiveCount = serverItems.length + pendingUploads.length;
  // Combined cap (images + videos). Honors an explicit `totalCount`
  // override on the policy — IMS caps at 10 files total even though the
  // sub-caps add to 15 (10 images + 5 videos). Without the override,
  // falls back to the sum so other entity types keep working.
  const totalCap =
    policy.totalCount ?? policy.maxCount + (policy.video?.maxCount ?? 0);
  const atCap = effectiveCount >= totalCap;

  // Only staged uploads contribute to "unsaved" anymore. Deletes are
  // committed immediately on confirm so there's nothing pending to lose.
  const hasPending = pendingUploads.length > 0;

  // Bubble the pending state up so the parent form can fold it into
  // its own dirty flag and not let the user lose attachment edits.
  useEffect(() => {
    onPendingChange?.(hasPending);
  }, [hasPending, onPendingChange]);

  const stageFiles = useCallback(
    (files: FileList) => {
      const batch = Array.from(files);
      const videoCount = batch.filter(isVideoFile).length;
      const imageCount = batch.length - videoCount;
      // Combined-with-existing checks come first — they're the binding
      // cap. A 4-image batch with 7 already on the row would land
      // 11 total even though it's well under the 10-image sub-cap.
      const existingVideos = [
        ...serverItems.filter((a) => a.content_type.startsWith("video/")),
        ...pendingUploads.filter((p) => p.file.type.startsWith("video/")),
      ].length;
      const existingImages = effectiveCount - existingVideos;
      if (existingImages + imageCount > policy.maxCount) {
        toast.error(
          `You can have at most ${policy.maxCount} images total.`,
        );
        return;
      }
      if (
        policy.video &&
        existingVideos + videoCount > policy.video.maxCount
      ) {
        toast.error(
          `You can have at most ${policy.video.maxCount} videos total.`,
        );
        return;
      }
      const remaining = totalCap - effectiveCount;
      if (batch.length > remaining) {
        toast.error(
          remaining <= 0
            ? `You can have at most ${totalCap} attachments total.`
            : `Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed (max ${totalCap} total).`,
        );
        return;
      }
      const additions: PendingUpload[] = [];
      for (const file of batch) {
        if (!policy.accepted.includes(file.type)) {
          toast.error(
            `"${file.name}" is not an allowed type. Accepted: ${policy.label}`,
          );
          continue;
        }
        const sizeLimit =
          isVideoFile(file) && policy.video
            ? policy.video.maxBytes
            : policy.maxBytes;
        if (file.size > sizeLimit) {
          toast.error(
            `"${file.name}" is ${formatBytes(file.size)} — exceeds the ${formatBytes(sizeLimit)} limit.`,
          );
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        ownedUrls.current.add(previewUrl);
        additions.push({ id: genPendingId(), file, previewUrl });
      }
      if (additions.length > 0) {
        setPendingUploads((prev) => [...prev, ...additions]);
      }
    },
    [policy, effectiveCount, totalCap, serverItems, pendingUploads],
  );

  const unstageUpload = useCallback((id: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        ownedUrls.current.delete(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // Live-mode flows — used when `mode='live'`.
  const liveUpload = useCallback(
    async (files: FileList) => {
      const batch = Array.from(files);
      const videoCount = batch.filter(isVideoFile).length;
      const imageCount = batch.length - videoCount;
      const existingVideos = serverItems.filter((a) =>
        a.content_type.startsWith("video/"),
      ).length;
      const existingImages = serverItems.length - existingVideos;
      if (existingImages + imageCount > policy.maxCount) {
        toast.error(
          `You can have at most ${policy.maxCount} images total.`,
        );
        return;
      }
      if (
        policy.video &&
        existingVideos + videoCount > policy.video.maxCount
      ) {
        toast.error(
          `You can have at most ${policy.video.maxCount} videos total.`,
        );
        return;
      }
      const remaining = totalCap - serverItems.length;
      if (batch.length > remaining) {
        toast.error(
          remaining <= 0
            ? `You can have at most ${totalCap} attachments total.`
            : `Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed (max ${totalCap} total).`,
        );
        return;
      }
      // Type + size check up front; keep only the files worth uploading.
      const valid: File[] = [];
      for (const file of batch) {
        if (!policy.accepted.includes(file.type)) {
          toast.error(
            `"${file.name}" is not an allowed type. Accepted: ${policy.label}`,
          );
          continue;
        }
        const sizeLimit =
          isVideoFile(file) && policy.video
            ? policy.video.maxBytes
            : policy.maxBytes;
        if (file.size > sizeLimit) {
          toast.error(
            `"${file.name}" is ${formatBytes(file.size)} — exceeds the ${formatBytes(sizeLimit)} limit.`,
          );
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;
      // Fire every upload at once — a slow large file mustn't block the
      // rest. Failures are gathered and surfaced together at the end.
      const results = await Promise.allSettled(
        valid.map((file) =>
          upload.mutateAsync({
            file,
            entity_type: entityType,
            entity_id: entityId,
            // Per-file format ("png", "mp4", …); explicit panel-wide
            // override wins so callers that need a fixed category can
            // still set it.
            document_type: documentType ?? deriveDocumentType(file),
          }),
        ),
      );
      const failed = results
        .map((r, i) => (r.status === "rejected" ? valid[i].name : null))
        .filter((name): name is string => name !== null);
      if (failed.length > 0) {
        toast.error(
          failed.length === 1
            ? `Couldn't upload "${failed[0]}".`
            : `Couldn't upload ${failed.length} files: ${failed.join(", ")}.`,
        );
      }
    },
    [policy, serverItems.length, upload, entityType, entityId, documentType, totalCap],
  );

  // Shared confirm-then-delete: clicking × on a server tile (in either
  // staged or live mode) opens the confirm dialog; the action below
  // fires the actual DELETE. Server-side deletes are no longer staged
  // — there's no undo arrow anywhere on the panel.
  const confirmLiveDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed";
      toast.error(message);
    }
  };

  // Imperative commit — flush staged uploads in parallel so a slow large
  // file doesn't queue the rest. Failed files stay staged and an
  // aggregated error is thrown; the caller (form onSubmit) catches it
  // and toasts. Partial success is intentional — landed files are kept.
  //
  // Deletes are NO LONGER processed by commit. The × icon now opens a
  // confirm dialog and deletes immediately on confirm, so by the time
  // Save fires there's nothing to flush.
  useImperativeHandle(
    ref,
    () => ({
      async commit(entityIdOverride?: string) {
        // Create flows pass the freshly-created resource's id; edit flows
        // omit the override and we fall back to the prop entityId.
        const targetId = entityIdOverride ?? entityId;
        if (!targetId) {
          throw new Error("commit() called without an entity id");
        }
        // Upload every staged file at once. Files that fail stay staged so
        // a second Save retries just them.
        const uploads = [...pendingUploads];
        const uploadResults = await Promise.allSettled(
          uploads.map((p) =>
            upload.mutateAsync({
              file: p.file,
              entity_type: entityType,
              entity_id: targetId,
              // Per-file format ("png", "mp4", …); explicit panel-wide
              // override wins so callers that need a fixed category can
              // still set it.
              document_type: documentType ?? deriveDocumentType(p.file),
            }),
          ),
        );
        const stillPending: PendingUpload[] = [];
        const failedUploads: string[] = [];
        uploadResults.forEach((r, i) => {
          const p = uploads[i];
          if (r.status === "fulfilled") {
            URL.revokeObjectURL(p.previewUrl);
            ownedUrls.current.delete(p.previewUrl);
          } else {
            stillPending.push(p);
            failedUploads.push(p.file.name);
          }
        });

        setPendingUploads(stillPending);

        if (failedUploads.length > 0) {
          throw new Error(
            failedUploads.length === 1
              ? `"${failedUploads[0]}" failed to upload.`
              : `${failedUploads.length} files failed to upload (${failedUploads.join(", ")}).`,
          );
        }
      },
      hasPending() {
        return hasPending;
      },
    }),
    [
      pendingUploads,
      upload,
      remove,
      entityType,
      entityId,
      documentType,
      hasPending,
    ],
  );

  // Visible tile model — folds server items + pending uploads into one
  // list for the grid. With confirm-then-delete on server tiles, there's
  // no greyed-out "marked for delete" state to track here anymore.
  type Tile =
    | { kind: "server"; attachment: Attachment }
    | { kind: "pending"; pending: PendingUpload };

  const tiles: Tile[] = useMemo(
    () => [
      ...serverItems.map<Tile>((a) => ({ kind: "server", attachment: a })),
      ...pendingUploads.map<Tile>((p) => ({ kind: "pending", pending: p })),
    ],
    [serverItems, pendingUploads],
  );

  const onFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (mode === "staged") stageFiles(files);
    else void liveUpload(files);
  };

  // Match the dropzone prompt to what the entity actually accepts so the
  // user isn't told to "drop files" when only images are allowed (or vice
  // versa once videos go live on the backend).
  const acceptsImages = policy.accepted.some((t) => t.startsWith("image/"));
  const acceptsVideos = policy.accepted.some((t) => t.startsWith("video/"));
  const onlyImages = acceptsImages && !acceptsVideos &&
    policy.accepted.every((t) => t.startsWith("image/"));
  const dropPrompt = onlyImages
    ? "Drop images, or click to upload"
    : acceptsImages && acceptsVideos &&
        policy.accepted.every((t) => t.startsWith("image/") || t.startsWith("video/"))
      ? "Drop images or videos, or click to upload"
      : "Drop files, or click to upload";

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly || atCap) return;
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (readOnly || atCap) return;
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) onFilesChosen(e.dataTransfer.files);
  };

  // Top-right "Upload media" button surfaces only once there's at least one
  // tile — empty state uses the dashed dropzone below.
  const showUploadButton = !readOnly && tiles.length > 0;

  const infoLine =
    readOnly || mode === "staged" || effectiveCount > 0 ? (
      <p className="text-xs text-muted-foreground">
        {readOnly
          ? `${serverItems.length} of ${totalCap} attached`
          : `${effectiveCount} of ${totalCap} attached · ${policy.label}`}
        {mode === "staged" && hasPending && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
            Unsaved changes — click Save
          </span>
        )}
      </p>
    ) : null;

  return (
    <div className={cn("space-y-3", className)}>
      {(title || infoLine || showUploadButton) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            {title && (
              <Typography variant="body-strong" className="leading-tight" asChild><h3>{title}</h3></Typography>
            )}
            {infoLine}
          </div>
          {showUploadButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atCap || upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              Upload media
            </Button>
          )}
        </div>
      )}

      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={policy.accept}
          className="hidden"
          onChange={(e) => {
            onFilesChosen(e.target.files);
            // Reset so re-selecting the same file re-fires onChange.
            e.target.value = "";
          }}
        />
      )}

      {query.isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-[100px] rounded-md" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 text-rose-500" />
          Couldn&rsquo;t load attachments.
        </div>
      ) : (
        <>
          {tiles.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tiles.map((t) =>
                t.kind === "server" ? (
                  <ServerTile
                    key={t.attachment.id}
                    attachment={t.attachment}
                    readOnly={readOnly}
                    // Both modes now route through the same confirm
                    // dialog; deletes commit immediately on confirm.
                    onRequestDelete={() => setPendingDelete(t.attachment)}
                    onView={() =>
                      setViewer({
                        src: t.attachment.url,
                        name: t.attachment.document_name,
                        isVideo: t.attachment.content_type.startsWith("video/"),
                        downloadUrl: t.attachment.download_url,
                      })
                    }
                  />
                ) : (
                  <PendingTile
                    key={t.pending.id}
                    pending={t.pending}
                    onUnstage={() => unstageUpload(t.pending.id)}
                    onView={() =>
                      setViewer({
                        src: t.pending.previewUrl,
                        name: t.pending.file.name,
                        isVideo: t.pending.file.type.startsWith("video/"),
                      })
                    }
                  />
                ),
              )}
            </ul>
          )}

          {readOnly && tiles.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed bg-muted/10 px-4 py-8 text-center">
              <ImageIcon className="size-5 text-muted-foreground" />
              <Typography variant="body-strong">No attachments yet</Typography>
            </div>
          )}

          {!readOnly && !atCap && tiles.length === 0 && (
            <div
              role="button"
              tabIndex={0}
              aria-label={dropPrompt}
              aria-disabled={upload.isPending || undefined}
              onClick={() => !upload.isPending && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (upload.isPending) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                upload.isPending && "cursor-not-allowed opacity-60",
              )}
            >
              {upload.isPending ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
              <Typography variant="body-strong">{dropPrompt}</Typography>
              <Typography variant="helper" asChild><p>{policy.label}</p></Typography>
            </div>
          )}

          {!readOnly && atCap && tiles.length > 0 && (
            <Typography variant="helper" asChild><p>
              Maximum of {totalCap} attachments reached. Remove an
              existing one to upload more.
            </p></Typography>
          )}
        </>
      )}

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.content_type.startsWith("video/")
                ? "Delete this video?"
                : pendingDelete?.content_type.startsWith("image/")
                  ? "Delete this image?"
                  : "Delete this attachment?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.document_name} will be soft-deleted. You can
              re-upload it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmLiveDelete();
              }}
              disabled={remove.isPending}
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Viewer — opens on tile click for both server and pending
          attachments. Card-style dialog matching the rest of the app
          (light background, header row with name + download, standard
          close affordance) rather than the previous black-overlay
          lightbox which clashed with the project's chrome. */}
      <Dialog
        open={viewer != null}
        onOpenChange={(o) => !o && setViewer(null)}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[92vh] w-[92vw] max-w-[1100px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 pr-12">
            <DialogTitle className="truncate text-sm font-medium">
              {viewer?.name ?? "Attachment preview"}
            </DialogTitle>
            {viewer?.downloadUrl && (
              <a
                href={viewer.downloadUrl}
                download={viewer.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-info transition-colors hover:bg-info-soft"
              >
                <Download className="size-3.5" />
                Download
              </a>
            )}
          </div>
          {viewer && (
            <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-muted/40 p-4">
              {/* Media renders at its intrinsic size — small files don't
                  get blown up, large files are capped so they stay
                  inside the dialog. The wrapper's fixed min-h gives the
                  dialog its consistent shape regardless of content. */}
              {viewer.isVideo ? (
                <video
                  src={viewer.src}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full max-w-full rounded-md"
                />
              ) : (
                <img
                  src={viewer.src}
                  alt={viewer.name}
                  className="max-h-full max-w-full rounded-md"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const AttachmentsPanel = forwardRef<
  AttachmentsPanelHandle,
  AttachmentsPanelProps
>(AttachmentsPanelInner);

// ─── Tiles ────────────────────────────────────────────────────────────────────

function ServerTile({
  attachment,
  readOnly,
  onRequestDelete,
  onView,
}: {
  attachment: Attachment;
  readOnly: boolean;
  onRequestDelete: () => void;
  onView: () => void;
}) {
  const isImage = attachment.content_type.startsWith("image/");
  const isVideo = attachment.content_type.startsWith("video/");
  const tooltip = `${attachment.document_name} · ${formatBytes(attachment.size_bytes)}`;
  return (
    <li
      className="group relative size-[100px] overflow-hidden rounded-md border bg-card shadow-sm"
      title={tooltip}
    >
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${attachment.document_name}`}
        className="block size-full cursor-zoom-in"
      >
        {isImage ? (
          <img
            src={attachment.preview_url || attachment.url}
            alt={attachment.document_name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : isVideo ? (
          // Browser-rendered first frame as a poster. `muted` + `playsInline`
          // + `preload="metadata"` gets a thumbnail without auto-playing.
          <div className="relative size-full">
            <video
              src={attachment.preview_url || attachment.url}
              preload="metadata"
              muted
              playsInline
              className="size-full object-cover"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 text-white">
              <PlayCircle className="size-8 drop-shadow" />
            </span>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground">
            <ExternalLink className="size-4" />
          </div>
        )}
      </button>
      {/* Download — hover-revealed at top-left. Real <a download> so the
          browser saves the file instead of opening the viewer. Tinted to
          the project's info blue (the --info token) — same vocabulary as the
          info-light Button variant — so it reads as a neutral utility
          action distinct from the destructive remove. */}
      <a
        href={attachment.download_url}
        download={attachment.document_name}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Download ${attachment.document_name}`}
        title="Download"
        className="absolute left-1 top-1 hidden size-6 items-center justify-center rounded-full bg-card/95 text-info shadow-sm transition-colors hover:bg-info hover:text-white group-hover:flex"
      >
        <Download className="size-3.5" />
      </a>
      {!readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestDelete();
          }}
          aria-label={`Remove ${attachment.document_name}`}
          className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded-full bg-card/95 text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-white group-hover:flex"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function PendingTile({
  pending,
  onUnstage,
  onView,
}: {
  pending: PendingUpload;
  onUnstage: () => void;
  onView: () => void;
}) {
  // Dashed emerald border is the only "pending" cue at this size — the
  // "Pending" label badge no longer fits inside a 100px tile.
  const tooltip = `${pending.file.name} · ${formatBytes(pending.file.size)} · pending save`;
  const isVideo = pending.file.type.startsWith("video/");
  return (
    <li
      className="group relative size-[100px] overflow-hidden rounded-md border-2 border-dashed border-emerald-500/60 bg-emerald-50/30 shadow-sm"
      title={tooltip}
    >
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${pending.file.name}`}
        className="block size-full cursor-zoom-in"
      >
        {isVideo ? (
          <div className="relative size-full">
            <video
              src={pending.previewUrl}
              preload="metadata"
              muted
              playsInline
              className="size-full object-cover"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 text-white">
              <PlayCircle className="size-8 drop-shadow" />
            </span>
          </div>
        ) : (
          <img
            src={pending.previewUrl}
            alt={pending.file.name}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnstage();
        }}
        aria-label={`Remove pending ${pending.file.name}`}
        className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded-full bg-card/95 text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-white group-hover:flex"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}
