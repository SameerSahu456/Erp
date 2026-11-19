import { formatIST } from "@shared/lib/date"
import { cn } from "@/lib/utils"

import { TIMESTAMP_FOOTER_STRINGS as S } from './timestamp-footer.strings'

interface TimestampFooterProps {
  createdAt?: string | null
  updatedAt?: string | null
  className?: string
}

/**
 * Thin "Created … · Updated …" footer rendered at the bottom of a detail
 * page. Hides cleanly if both timestamps are missing. Renders IST per the
 * project-wide rule (CLAUDE.md §1 / shared/lib/date.ts).
 */
function TimestampFooter({ createdAt, updatedAt, className }: TimestampFooterProps) {
  if (!createdAt && !updatedAt) return null
  return (
    <p
      className={cn(
        "mt-4 border-t border-border/50 pt-3 text-[12px] text-muted-foreground",
        className,
      )}
    >
      {createdAt && (
        <span>
          {S.created} <span className="tabular-nums">{formatIST(createdAt)}</span>
        </span>
      )}
      {createdAt && updatedAt && <span className="mx-3">·</span>}
      {updatedAt && (
        <span>
          {S.updated} <span className="tabular-nums">{formatIST(updatedAt)}</span>
        </span>
      )}
    </p>
  )
}

export { TimestampFooter, type TimestampFooterProps }
