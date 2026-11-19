import { useEffect, useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Typography } from "@/components/ui/typography"

import { fetchAttachmentBlob } from "./api"
import { triggerAttachmentDownload } from "./hooks/useAttachments"
import { FILE_PREVIEW_STRINGS as S } from "./file-preview.strings"
import type { AttachmentWire } from "./types"

/**
 * One file to preview. Exactly one source is set:
 *  - `wire` — a STORED attachment; the blob is fetched through the
 *    auth-proxied `/download` endpoint so the JWT travels (a raw
 *    `<img src>` / new-tab would arrive unauthenticated on local-disk
 *    storage). Download reuses `triggerAttachmentDownload`.
 *  - `file` — a just-picked LOCAL File/Blob not yet uploaded (create forms).
 *    Already in memory, so it previews and downloads without a round-trip.
 */
export interface FilePreviewTarget {
  /** Shown as the dialog title — the real file name, never an id. */
  name: string
  /** Drives the renderer: image → <img>, application/pdf → <iframe>. */
  contentType: string
  wire?: Pick<AttachmentWire, "id" | "document_name" | "content_type">
  file?: Blob
}

interface FilePreviewDialogProps {
  /** Non-null opens the dialog and (for previewable types) fetches the blob. */
  target: FilePreviewTarget | null
  onOpenChange: (open: boolean) => void
}

/**
 * Inline file preview shown INSIDE the app — the shared replacement for
 * `window.open(objectURL)`, whose new tab is titled with the blob's random
 * id instead of the file name. Images render in `<img>`, PDFs in an
 * `<iframe>`; anything else offers a download. Mirrors CRM's
 * `AccountDocumentPreviewDialog`; kept in the shared attachments module so
 * every consumer shares one implementation.
 */
export function FilePreviewDialog({ target, onOpenChange }: FilePreviewDialogProps) {
  const isImage = target?.contentType.startsWith("image/") ?? false
  const isPdf = target?.contentType === "application/pdf"
  const canPreview = isImage || isPdf

  const onDownload = () => {
    if (target?.wire) {
      void triggerAttachmentDownload(target.wire)
      return
    }
    if (target?.file) {
      // Local file: a live-gesture anchor click is always allowed.
      const url = URL.createObjectURL(target.file)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = target.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[75vw]">
        <DialogHeader>
          <DialogTitle className="truncate">
            {target?.name ?? S.fallbackTitle}
          </DialogTitle>
          <DialogDescription>{target?.contentType ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[60vh] items-center justify-center rounded-md border bg-muted/30">
          {!target || !canPreview ? (
            <Typography
              variant="body"
              tone="muted"
              align="center"
              className="px-6 py-12"
            >
              {S.unsupported}
            </Typography>
          ) : (
            // Keyed per target so each preview mounts fresh — loading is the
            // INITIAL state, so no synchronous reset in an effect
            // (react-hooks/set-state-in-effect).
            <PreviewBody
              key={target.wire?.id ?? target.name}
              target={target}
              isImage={isImage}
            />
          )}
        </div>

        <DialogFooter>
          {target && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="mr-1 size-3.5" />
              {S.download}
            </Button>
          )}
          <Button size="sm" onClick={() => onOpenChange(false)}>
            {S.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PreviewBodyState {
  status: "loading" | "ready" | "error"
  url?: string
  message?: string
}

/** Fetches (or wraps) the blob and renders it. Mounted fresh per target, so
 *  its only state transitions happen inside async callbacks — never a
 *  synchronous setState in the effect body. */
function PreviewBody({
  target,
  isImage,
}: {
  target: FilePreviewTarget
  isImage: boolean
}) {
  const [state, setState] = useState<PreviewBodyState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null
    const load = target.file
      ? Promise.resolve(target.file)
      : target.wire
        ? fetchAttachmentBlob(target.wire)
        : Promise.reject(new Error(S.failed))
    load
      .then((blob) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setState({ status: "ready", url: createdUrl })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: "error",
          message: err instanceof Error ? err.message : S.failed,
        })
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [target])

  if (state.status === "loading") {
    return (
      <Typography variant="body" tone="muted" asChild>
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {S.loading}
        </span>
      </Typography>
    )
  }
  if (state.status === "error") {
    return (
      <Typography
        role="alert"
        variant="body"
        tone="danger"
        align="center"
        className="px-6 py-12"
      >
        {state.message}
      </Typography>
    )
  }
  return isImage ? (
    <img
      src={state.url}
      alt={target.name}
      className="max-h-[70vh] w-auto max-w-full object-contain"
    />
  ) : (
    <iframe
      src={state.url}
      title={target.name}
      className="h-[70vh] w-full rounded-md bg-background"
    />
  )
}
