import { type ReactNode } from "react"

import { Typography } from "@/components/ui/typography"

/** A label / value pair, so the header reads consistently. */
export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      <div className="min-w-0 truncate">
        {typeof value === "string" ? (
          <Typography variant="body" className="min-w-0 truncate">
            {value}
          </Typography>
        ) : (
          value
        )}
      </div>
    </div>
  )
}
