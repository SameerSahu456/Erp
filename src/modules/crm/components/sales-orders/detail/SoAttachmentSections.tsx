import { useMemo } from "react"
// `Eye` goes back in the import when the View button below is re-enabled.
import { Download, FileText, Paperclip } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import type { Attachment } from "@shared/api/attachments"
import { useAttachments } from "@shared/hooks/useAttachments"
// Add `viewAttachmentBlob` back here when the View button is re-enabled.
import { triggerAttachmentDownload } from "@modules/attachments"

import type { SalesOrderWire } from "../../../api"
import {
  SO_ATTACHMENT_LABELS,
  SO_ATTACHMENT_OTHERS,
  type SoAttachmentType,
} from "../../../constants/so-attachments"
import { SO_ATTACHMENT_STRINGS as S } from "../form/so-attachments.strings"
import { SectionCard } from "./SoDetailPrimitives"

/** What a row needs: the name and size it shows, and what the download
 *  proxy needs. A file filed elsewhere (a rental PO's paper) fits too. */
export type SoAttachmentFile = Pick<Attachment, "id" | "document_name" | "size_bytes" | "content_type">

export interface SoAttachmentGroup {
  key: string
  /** What the user sees — the slot name, or the custom name for `others`. */
  title: string
  items: SoAttachmentFile[]
}
type AttachmentGroup = SoAttachmentGroup

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** One file: name, size, and the two things you can do with it. */
function AttachmentRow({ attachment: a }: { attachment: SoAttachmentFile }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      {/* min-w-0 is what makes `truncate` bite in a flex row (§8.7) — without
          it the row grows to the filename's width and scrolls sideways. */}
      <div className="min-w-0 flex-1">
        <Typography variant="helper" truncate title={a.document_name}>
          {a.document_name}
        </Typography>
        <Typography variant="caption" tone="muted">
          {formatBytes(a.size_bytes)}
        </Typography>
      </div>
      {/* Both actions go through the auth-proxied /download endpoint, the same
          helpers Leads and Deals use (`EntityAttachmentsSection`) — NOT a raw
          <a href={download_url}>. The presigned download_url bakes the filename
          into S3's response-content-disposition, and S3 rejects the whole URL
          when that filename isn't ISO-8859-1 — which every macOS screenshot
          breaks (U+202F before "PM"). The proxy builds the header server-side
          and handles it. Icon-only, so each carries an aria-label as its
          accessible name plus a title for the tooltip. */}
      <div className="flex shrink-0 items-center">
        {/* View — parked, not deleted: Download covers the need for now.
            Re-enable by uncommenting (the `Eye` icon and `viewAttachmentBlob`
            imports are commented out at the top of this file too). */}
        {/* <Button
          variant="ghost"
          size="icon"
          aria-label={S.detail.view}
          title={S.detail.view}
          onClick={() => void viewAttachmentBlob(a)}
        >
          <Eye className="size-3.5" />
        </Button> */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={S.detail.download}
          title={S.detail.download}
          onClick={() => void triggerAttachmentDownload(a)}
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Read-only attachments on the SO detail page: every file listed under its
 * type heading, each with View + Download. No dialog — the whole point is to
 * read the paperwork without a click.
 *
 * `others` groups by its free-text label, not by the type — two custom types
 * are two sections, which is the whole point of the label.
 */
export function SoAttachmentSections({
  so,
  extraGroups = [],
}: {
  so: SalesOrderWire
  /** Files filed against something other than the order that still belong
   *  in its paperwork — the rental agreement page adds each PO's paper. */
  extraGroups?: SoAttachmentGroup[]
}) {
  const query = useAttachments("crm_sales_order", so.id)

  const ownGroups = useMemo<AttachmentGroup[]>(() => {
    const byKey = new Map<string, AttachmentGroup>()
    for (const a of query.data ?? []) {
      const type = a.document_type as SoAttachmentType
      const isOthers = type === SO_ATTACHMENT_OTHERS
      const label = a.document_label?.trim() ?? ""
      const key = isOthers ? `${type}::${label}` : type
      const title =
        isOthers && label ? label : (SO_ATTACHMENT_LABELS[type] ?? type)
      const group = byKey.get(key)
      if (group) {
        group.items.push(a)
        continue
      }
      byKey.set(key, { key, title, items: [a] })
    }
    return Array.from(byKey.values())
  }, [query.data])
  const groups = [...ownGroups, ...extraGroups.filter((g) => g.items.length > 0)]

  // A 403 here means "no permission to read attachments", not "failed to
  // load" — LoadErrorState renders the NoAccess variant for that case.
  if (query.isError) {
    return (
      <SectionCard
        title={S.detail.title}
        icon={<Paperclip className="size-4 text-muted-foreground" />}
      >
        <LoadErrorState
          error={query.error}
          fallback={S.detail.loadError}
          compact
        />
      </SectionCard>
    )
  }

  // Nothing attached is the common case — render the card anyway so the
  // section doesn't appear and disappear between orders.
  if (!query.isLoading && groups.length === 0) {
    return (
      <SectionCard
        title={S.detail.title}
        icon={<Paperclip className="size-4 text-muted-foreground" />}
      >
        <Typography variant="helper" tone="muted">
          {S.detail.empty}
        </Typography>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={S.detail.title}
      icon={<Paperclip className="size-4 text-muted-foreground" />}
    >
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            {/* min-w-0 on the title so a long custom type name truncates
                instead of pushing the count off the row. */}
            <div className="flex items-baseline gap-2">
              <Typography
                variant="card-title"
                truncate
                className="min-w-0"
                title={group.title}
              >
                {group.title}
              </Typography>
              <Typography variant="caption" tone="muted" className="shrink-0">
                {S.section.countSuffix(group.items.length)}
              </Typography>
            </div>
            {/* Three per row at lg — a card is a name, a size and two icons,
                which nowhere near fills the section on its own. Steps down to
                two and then one as the column narrows, where three abreast
                would leave the filename no room to read. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((a) => (
                <AttachmentRow key={a.id} attachment={a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
