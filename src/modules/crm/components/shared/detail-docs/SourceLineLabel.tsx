import { Typography } from "@/components/ui/typography"
import { stripHtml } from "@/lib/utils"

import { DETAIL_DOCS_STRINGS as S } from "./detail-docs.strings"

/** The ordered source line a unit was issued/dispatched against: name + description. */
export interface DetailLineBrief {
  name: string
  description: string | null
}

// Renders which source line (name + a stripped, truncated description) an
// issued/dispatched unit belongs to. Shared by the Material Issues and Dispatch
// Requests accordions (SO + Demo) so both label the source line the same way.
export function SourceLineLabel({ line }: { line: DetailLineBrief | undefined }) {
  const description = line?.description ? stripHtml(line.description) : ""
  return (
    <div className="min-w-0">
      <Typography variant="helper" truncate className="min-w-0 text-foreground">
        {line?.name ?? S.unknownPart}
      </Typography>
      {description ? (
        <Typography variant="caption" tone="muted" truncate className="min-w-0">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}
