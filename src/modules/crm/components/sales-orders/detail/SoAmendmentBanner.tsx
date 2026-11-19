import { GitBranch } from "lucide-react"

import { Typography } from "@/components/ui/typography"

import type { SalesOrderWire } from "../../../api"

// Surfaces the amendment audit (reason + who amended) the backend attaches to
// an amended sales order. Renders only once a reason is present — the fields
// post-date the deployed backend, so on older servers this stays hidden.
// Warning-toned to match the "Amend" status badge.
export function SoAmendmentBanner({ so }: { so: SalesOrderWire }) {
  const reason = so.amend_reason?.trim()
  const amendedBy = so.amended_by?.name?.trim()
  const amendedByEmail = so.amended_by?.email?.trim()

  // Nothing to show until the backend sends at least a reason.
  if (!reason && !amendedBy) return null

  return (
    <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
      <div className="flex items-center gap-2 text-warning">
        <GitBranch className="size-4 shrink-0" />
        <Typography variant="card-title" tone="warning">
          This sales order was amended
        </Typography>
      </div>
      {reason && (
        <Typography
          variant="body"
          className="mt-2 whitespace-pre-wrap break-words pl-6"
        >
          {reason}
        </Typography>
      )}
      {amendedBy && (
        <Typography variant="helper" tone="muted" className="mt-1.5 pl-6">
          Amended by {amendedBy}
          {amendedByEmail && ` (${amendedByEmail})`}
        </Typography>
      )}
    </div>
  )
}
