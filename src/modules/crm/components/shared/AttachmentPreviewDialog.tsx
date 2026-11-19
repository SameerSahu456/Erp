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
import {
  fetchAttachmentBlob,
  triggerAttachmentDownload,
  type AttachmentWire,
} from "@modules/attachments"

interface AttachmentPreviewDialogProps {
  /** Non-null opens the dialog and triggers the blob fetch. */
  attachment: AttachmentWire | null
  onOpenChange: (open: boolean) => void
}

// Generic inline preview for any attachment (lead / deal / future entities).
// Fetches the file via the auth-proxied `/download` endpoint so the JWT
// travels with the request — a raw `<img src={preview_url}>` would fail on
// local-disk storage because the browser can't inject auth headers on
// element-driven loads. Images render in <img>, PDFs in an <iframe>;
// everything else (Office docs) offers a download. Object URL is revoked
// when the attachment changes or the dialog closes.
function AttachmentPreviewDialog({
  attachment,
  onOpenChange,
}: AttachmentPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isImage = attachment?.content_type.startsWith("image/") ?? false
  const isPdf = attachment?.content_type === "application/pdf"
  const canPreview = isImage || isPdf

  useEffect(() => {
    // Only Office docs can't preview inline — skip the blob fetch for them.
    if (!attachment || !canPreview) {
      setBlobUrl(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    setLoading(true)
    setError(null)
    setBlobUrl(null)
    fetchAttachmentBlob(attachment)
      .then((blob) => {
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setBlobUrl(createdUrl)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load preview")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [attachment, canPreview])

  return (
    <Dialog open={attachment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[75vw]">
        <DialogHeader>
          <DialogTitle className="truncate">
            {attachment?.document_name ?? "Attachment"}
          </DialogTitle>
          <DialogDescription>{attachment?.content_type ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[60vh] items-center justify-center rounded-md border bg-muted/30">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading preview…
            </div>
          ) : error ? (
            <Typography
              role="alert"
              variant="body"
              tone="danger"
              align="center"
              className="px-6 py-12"
            >
              {error}
            </Typography>
          ) : !canPreview ? (
            <Typography variant="body" tone="muted" align="center" className="px-6 py-12">
              Preview isn't available for this file type. Download it to view.
            </Typography>
          ) : blobUrl && isImage ? (
            <img
              src={blobUrl}
              alt={attachment?.document_name ?? ""}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : blobUrl && isPdf ? (
            <iframe
              src={blobUrl}
              title={attachment?.document_name ?? "PDF preview"}
              className="h-[70vh] w-full rounded-md bg-background"
            />
          ) : null}
        </div>

        <DialogFooter>
          {attachment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void triggerAttachmentDownload(attachment)
              }}
            >
              <Download className="mr-1 size-3.5" />
              Download
            </Button>
          )}
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AttachmentPreviewDialog }
